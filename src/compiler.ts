import * as fs from "node:fs";

import { CompilerError } from "./errors";
import { tokenize } from "./lexer";
import { parse } from "./parser";
import type {
  ASTNode,
  BooleanLiteralNode,
  ExpressionNode,
  IntegerExprNode,
  IntegerLiteralNode,
  StringLiteralNode,
} from "./parser";
import { PEBuilder } from "./pe-builder";
import { CodeBuilder, Register } from "./x86-64";

type ResolvedIntegerExpr =
  | IntegerLiteralNode
  | ResolvedBinaryExprNode
  | ResolvedUnaryExprNode;

interface ResolvedBinaryExprNode {
  kind: "BinaryExpr";
  operator: "+" | "-" | "*";
  left: ResolvedIntegerExpr;
  right: ResolvedIntegerExpr;
}

interface ResolvedUnaryExprNode {
  kind: "UnaryExpr";
  operator: "-" | "+";
  operand: ResolvedIntegerExpr;
}

const MEMORY_LAYOUT = {
  TEXT_RVA: 0x1000,
  TEXT_FILE_OFFSET: 0x200,

  RDATA_RVA: 0x2000,
  RDATA_FILE_OFFSET: 0x400,

  IAT_GET_STD_HANDLE: 0x2048,
  IAT_WRITE_FILE: 0x2050,
  IAT_EXIT_PROCESS: 0x2058,
  STRING_PAYLOAD: 0x20b0,
  SCRATCH_BUFFER: 0x20f0,
};

const SCRATCH_BUFFER_SIZE = 32;

export type Eol = "crlf" | "lf";

export interface CompileOptions {
  eol?: Eol;
}

const EOL_STRING: Record<Eol, string> = {
  crlf: "\r\n",
  lf: "\n",
};

type PrintOp =
  | { kind: "string"; rva: number; length: number }
  | { kind: "integer"; node: ResolvedIntegerExpr };

interface ResolvedPrintStatement {
  kind: "PrintStatement";
  argument?: StringLiteralNode | ResolvedIntegerExpr | BooleanLiteralNode;
}

export function compileSourceToExecutable(
  sourceCode: string,
  outputFile: string,
  options: CompileOptions = {},
) {
  const eol = options.eol ?? "crlf";
  const tokens = tokenize(sourceCode);
  const ast = parse(tokens);

  const printStatements: ResolvedPrintStatement[] = [];
  const scopes: Map<string, number | boolean | string>[] = [new Map()];
  const declare = (name: string, value: number | boolean | string) => {
    if (lookupSymbol(scopes, name) !== undefined) {
      throw new CompilerError(`Constant "${name}" is already defined`);
    }
    const scope = scopes[scopes.length - 1];
    if (scope === undefined) {
      throw new CompilerError("Internal error: empty scope stack");
    }
    scope.set(name, value);
  };
  const resolveExpression = (
    argument: ExpressionNode,
  ): StringLiteralNode | BooleanLiteralNode | ResolvedIntegerExpr => {
    if (
      argument.kind === "StringLiteral" ||
      argument.kind === "BooleanLiteral"
    ) {
      return argument;
    }
    if (argument.kind === "Identifier") {
      const value = lookupSymbol(scopes, argument.name);
      if (typeof value === "boolean") {
        return { kind: "BooleanLiteral", value };
      }
      if (typeof value === "string") {
        return { kind: "StringLiteral", value };
      }
    }
    if (argument.kind === "ComparisonExpr") {
      const left = resolveConstValue(argument.left);
      const right = resolveConstValue(argument.right);
      if (typeof left !== typeof right) {
        throw new CompilerError(
          `Cannot compare ${typeof left} with ${typeof right}`,
        );
      }
      return {
        kind: "BooleanLiteral",
        value: argument.operator === "==" ? left === right : left !== right,
      };
    }
    if (argument.kind === "NotExpr") {
      const operand = resolveExpression(argument.operand);
      if (operand.kind === "StringLiteral") {
        throw new CompilerError("Cannot negate a string");
      }
      if (operand.kind !== "BooleanLiteral") {
        throw new CompilerError("Cannot negate an integer");
      }
      return { kind: "BooleanLiteral", value: !operand.value };
    }
    return resolveIntegerExpr(argument, scopes);
  };
  const resolvePrintArgument = (
    argument: ExpressionNode | undefined,
  ):
    | StringLiteralNode
    | ResolvedIntegerExpr
    | BooleanLiteralNode
    | undefined => {
    if (argument === undefined) return undefined;
    return resolveExpression(argument);
  };
  const resolveConstValue = (
    value: ExpressionNode,
  ): number | boolean | string => {
    const resolved = resolveExpression(value);
    if (resolved.kind === "BooleanLiteral") return resolved.value;
    if (resolved.kind === "StringLiteral") return resolved.value;
    return evalIntegerExpr(resolved);
  };
  const processStatements = (statements: ASTNode[]) => {
    for (const statement of statements) {
      if (statement.kind === "ConstDecl") {
        declare(statement.name, resolveConstValue(statement.value));
      } else if (statement.kind === "PrintStatement") {
        printStatements.push({
          kind: "PrintStatement",
          argument: resolvePrintArgument(statement.argument),
        });
      } else if (statement.kind === "BlockStatement") {
        scopes.push(new Map());
        processStatements(statement.body);
        scopes.pop();
      } else if (statement.kind === "IfStatement") {
        const condition = resolveExpression(statement.condition);
        if (condition.kind !== "BooleanLiteral") {
          throw new CompilerError("An if condition must be a boolean");
        }
        const branch = condition.value
          ? statement.thenBlock
          : statement.elseBranch;
        if (branch === undefined) continue;
        if (branch.kind === "BlockStatement") {
          scopes.push(new Map());
          processStatements(branch.body);
          scopes.pop();
        } else {
          processStatements([branch]);
        }
      } else {
        resolveExpression(statement.argument);
      }
    }
  };
  processStatements(ast);

  // Allocate a contiguous region in .rdata for each string literal's payload
  // (value + EOL), starting at STRING_PAYLOAD.
  const stringPayloads: { rva: number; bytes: Uint8Array }[] = [];
  const ops: PrintOp[] = [];
  const encoder = new TextEncoder();
  let nextPayloadRva = MEMORY_LAYOUT.STRING_PAYLOAD;
  for (const statement of printStatements) {
    const argument = statement.argument;
    if (
      argument !== undefined &&
      argument.kind !== "StringLiteral" &&
      argument.kind !== "BooleanLiteral"
    ) {
      ops.push({ kind: "integer", node: argument });
      continue;
    }
    let text: string;
    if (argument === undefined) {
      text = EOL_STRING[eol];
    } else if (argument.kind === "StringLiteral") {
      text = argument.value + EOL_STRING[eol];
    } else {
      text = (argument.value ? "true" : "false") + EOL_STRING[eol];
    }
    const bytes = encoder.encode(text);
    stringPayloads.push({ rva: nextPayloadRva, bytes });
    ops.push({ kind: "string", rva: nextPayloadRva, length: bytes.length });
    nextPayloadRva += bytes.length;
  }
  if (nextPayloadRva > MEMORY_LAYOUT.SCRATCH_BUFFER) {
    throw new CompilerError("String payloads exceed available .rdata space");
  }

  const code = new CodeBuilder();
  code.subRsp(56);

  for (const op of ops) {
    if (op.kind === "string") {
      compileStringPrint(code, op.rva, op.length);
    } else {
      compileIntegerPrint(code, op.node, eol);
    }
  }

  // ExitProcess(0)
  code.xorEcxEcx();
  code.callImport(MEMORY_LAYOUT.TEXT_RVA, MEMORY_LAYOUT.IAT_EXIT_PROCESS);

  const pe = new PEBuilder(4096);
  pe.writeHeaders(
    0x200,
    0x200,
    MEMORY_LAYOUT.TEXT_RVA,
    MEMORY_LAYOUT.RDATA_RVA,
  );

  // --- Write .text ---
  pe.seek(MEMORY_LAYOUT.TEXT_FILE_OFFSET);
  pe.writeBytes(code.bytes);
  pe.padToAlignment(0x200);

  // --- Write .rdata ---
  pe.seek(MEMORY_LAYOUT.RDATA_FILE_OFFSET);

  // Import Directory Descriptor @ 0x2000 (File 0x400)
  pe.writeU32(0x2028); // ILT RVA
  pe.writeU32(0);
  pe.writeU32(0);
  pe.writeU32(0x20a0); // DLL Name RVA ("kernel32.dll")
  pe.writeU32(MEMORY_LAYOUT.IAT_GET_STD_HANDLE); // IAT RVA (0x2048)

  // Null Directory Descriptor
  pe.writeU32(0);
  pe.writeU32(0);
  pe.writeU32(0);
  pe.writeU32(0);
  pe.writeU32(0);

  // ILT @ RVA 0x2028 (File 0x428)
  pe.seek(MEMORY_LAYOUT.RDATA_FILE_OFFSET + 0x28);
  pe.writeU64(0x2070n); // GetStdHandle Name RVA
  pe.writeU64(0x2080n); // WriteFile Name RVA
  pe.writeU64(0x2090n); // ExitProcess Name RVA
  pe.writeU64(0n);

  // IAT @ RVA 0x2048 (File 0x448)
  pe.seek(MEMORY_LAYOUT.RDATA_FILE_OFFSET + 0x48);
  pe.writeU64(0x2070n);
  pe.writeU64(0x2080n);
  pe.writeU64(0x2090n);
  pe.writeU64(0n);

  // Function Hint/Names @ RVA 0x2070, 0x2080, 0x2090
  pe.seek(MEMORY_LAYOUT.RDATA_FILE_OFFSET + 0x70);
  pe.writeU16(0);
  pe.writeString("GetStdHandle");

  pe.seek(MEMORY_LAYOUT.RDATA_FILE_OFFSET + 0x80);
  pe.writeU16(0);
  pe.writeString("WriteFile");

  pe.seek(MEMORY_LAYOUT.RDATA_FILE_OFFSET + 0x90);
  pe.writeU16(0);
  pe.writeString("ExitProcess");

  // DLL Name @ RVA 0x20A0
  pe.seek(MEMORY_LAYOUT.RDATA_FILE_OFFSET + 0xa0);
  pe.writeString("kernel32.dll");

  // String Payloads @ RVA 0x20B0+
  pe.seek(MEMORY_LAYOUT.RDATA_FILE_OFFSET + 0xb0);
  for (const { bytes } of stringPayloads) {
    pe.writeBytes(bytes);
  }

  pe.padToAlignment(0x200);

  fs.writeFileSync(outputFile, pe.TrimmedBuffer);
}

function compileStringPrint(
  code: CodeBuilder,
  payloadRva: number,
  length: number,
) {
  // 1. GetStdHandle(-11)
  code.movEcx32(-11);
  code.callImport(MEMORY_LAYOUT.TEXT_RVA, MEMORY_LAYOUT.IAT_GET_STD_HANDLE);

  // 2. WriteFile(handle, buffer, length, &bytesWritten, NULL)
  code.movRcxRax();
  code.leaRipRelative(Register.RDX, MEMORY_LAYOUT.TEXT_RVA, payloadRva);
  code.movR8d32(length);
  code.leaRipRelative(
    Register.R9,
    MEMORY_LAYOUT.TEXT_RVA,
    MEMORY_LAYOUT.SCRATCH_BUFFER,
  );
  code.movStackParamZero();
  code.callImport(MEMORY_LAYOUT.TEXT_RVA, MEMORY_LAYOUT.IAT_WRITE_FILE);
}

function compileIntegerPrint(
  code: CodeBuilder,
  node: ResolvedIntegerExpr,
  eol: Eol,
) {
  const folded = foldIntegerExpr(node);
  const negative = folded !== null ? folded < 0 : mayBeNegative(node);

  // 1. GetStdHandle(-11) -> rbx
  code.movEcx32(-11);
  code.callImport(MEMORY_LAYOUT.TEXT_RVA, MEMORY_LAYOUT.IAT_GET_STD_HANDLE);
  code.movRbxRax();

  // 2. Evaluate expression -> rax
  compileIntegerExpression(code, node);

  // 3. Convert rax to decimal digits in the scratch buffer.
  //    On exit: rdi = first digit, r8d = length (sign + digits + EOL)
  code.leaRipRelative(
    Register.RDI,
    MEMORY_LAYOUT.TEXT_RVA,
    MEMORY_LAYOUT.SCRATCH_BUFFER + SCRATCH_BUFFER_SIZE,
  );
  code.decRdi();
  code.movByteRdiImm(0x0a);
  if (eol === "crlf") {
    code.decRdi();
    code.movByteRdiImm(0x0d);
  }
  code.movR8d32(eol === "lf" ? 1 : 2);
  if (negative) {
    // If rax is negative, negate it and remember the sign in rsi.
    code.xorRsiRsi();
    code.testRaxRax();
    const skipNeg = code.jnsForward();
    code.negRax();
    code.incRsi();
    code.patchShortJump(skipNeg);
  }
  code.movEcx32(10);

  const loopStart = code.length;
  code.xorEdxEdx();
  code.divRcx();
  code.addDlImm(0x30);
  code.decRdi();
  code.movByteRdiDl();
  code.incR8d();
  code.testRaxRax();
  code.jnzBackwardTo(loopStart);

  if (negative) {
    // Prepend '-' if the value was negative.
    code.testRsiRsi();
    const done = code.jzForward();
    code.decRdi();
    code.movByteRdiImm(0x2d);
    code.incR8d();
    code.patchShortJump(done);
  }

  // 4. WriteFile(rbx, rdi, r8d, &bytesWritten, NULL)
  code.movRcxRbx();
  code.movRdxRdi();
  code.leaRipRelative(
    Register.R9,
    MEMORY_LAYOUT.TEXT_RVA,
    MEMORY_LAYOUT.SCRATCH_BUFFER,
  );
  code.movStackParamZero();
  code.callImport(MEMORY_LAYOUT.TEXT_RVA, MEMORY_LAYOUT.IAT_WRITE_FILE);
}

function mayBeNegative(node: ResolvedIntegerExpr): boolean {
  if (node.kind === "IntegerLiteral") return node.value < 0;
  if (node.kind === "UnaryExpr") return true;
  return (
    node.operator === "-" ||
    mayBeNegative(node.left) ||
    mayBeNegative(node.right)
  );
}

function isIntegerLiteral(
  node: ResolvedIntegerExpr,
): node is IntegerLiteralNode {
  return node.kind === "IntegerLiteral";
}

function lookupSymbol(
  scopes: Map<string, number | boolean | string>[],
  name: string,
): number | boolean | string | undefined {
  for (let i = scopes.length - 1; i >= 0; i--) {
    const scope = scopes[i];
    if (scope === undefined) continue;
    const value = scope.get(name);
    if (value !== undefined) return value;
  }
  return undefined;
}

function resolveIntegerExpr(
  node: IntegerExprNode,
  scopes: Map<string, number | boolean | string>[],
): ResolvedIntegerExpr {
  if (node.kind === "Identifier") {
    const value = lookupSymbol(scopes, node.name);
    if (value === undefined) {
      throw new CompilerError(`Unknown identifier: ${node.name}`);
    }
    if (typeof value === "boolean") {
      throw new CompilerError(
        `Constant "${node.name}" is a boolean and cannot be used in an integer expression`,
      );
    }
    if (typeof value === "string") {
      throw new CompilerError(
        `Constant "${node.name}" is a string and cannot be used in an integer expression`,
      );
    }
    return { kind: "IntegerLiteral", value };
  }
  if (node.kind === "IntegerLiteral") return node;
  if (node.kind === "UnaryExpr") {
    return {
      kind: "UnaryExpr",
      operator: node.operator,
      operand: resolveIntegerExpr(node.operand, scopes),
    };
  }
  return {
    kind: "BinaryExpr",
    operator: node.operator,
    left: resolveIntegerExpr(node.left, scopes),
    right: resolveIntegerExpr(node.right, scopes),
  };
}

function evalIntegerExpr(node: ResolvedIntegerExpr): number {
  if (node.kind === "IntegerLiteral") return node.value;
  if (node.kind === "UnaryExpr") {
    const operand = evalIntegerExpr(node.operand);
    return node.operator === "-" ? -operand : operand;
  }
  const left = evalIntegerExpr(node.left);
  const right = evalIntegerExpr(node.right);
  if (node.operator === "+") return left + right;
  if (node.operator === "-") return left - right;
  return left * right;
}

function foldIntegerExpr(node: ResolvedIntegerExpr): number | null {
  const value = evalIntegerExpr(node);
  return value >= -0x80000000 && value <= 0x7fffffff ? value : null;
}

function compileIntegerExpression(
  code: CodeBuilder,
  node: ResolvedIntegerExpr,
) {
  const folded = foldIntegerExpr(node);
  if (folded !== null) {
    code.movRaxImm32(folded);
    return;
  }
  if (node.kind === "IntegerLiteral") {
    code.movRaxImm32(node.value);
    return;
  }

  if (node.kind === "UnaryExpr") {
    compileIntegerExpression(code, node.operand);
    if (node.operator === "-") {
      code.negRax();
    }
    return;
  }

  compileIntegerExpression(code, node.left);
  const literal = isIntegerLiteral(node.right) ? node.right : null;
  if (literal !== null) {
    if (node.operator === "+") code.addRaxImm32(literal.value);
    else if (node.operator === "-") code.subRaxImm32(literal.value);
    else code.imulRaxImm32(literal.value);
    return;
  }
  code.pushRax();
  compileIntegerExpression(code, node.right);
  code.popRdx();
  if (node.operator === "-") {
    code.xchgRaxRdx();
  }
  if (node.operator === "+") code.addRaxRdx();
  else if (node.operator === "-") code.subRaxRdx();
  else code.imulRaxRdx();
}
