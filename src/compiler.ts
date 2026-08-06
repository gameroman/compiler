import * as fs from "node:fs";

import { CompilerError } from "./errors";
import { tokenize } from "./lexer";
import { parse } from "./parser";
import type {
  IntegerExprNode,
  IntegerLiteralNode,
  ResolvedIntegerExpr,
  StringLiteralNode,
} from "./parser";
import { PEBuilder } from "./pe-builder";
import { CodeBuilder, Register } from "./x86-64";

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
  argument?: StringLiteralNode | ResolvedIntegerExpr;
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
  const symbols = new Map<string, number>();
  for (const statement of ast) {
    if (statement.kind === "ConstDecl") {
      if (symbols.has(statement.name)) {
        throw new CompilerError(
          `Constant "${statement.name}" is already defined`,
        );
      }
      const value = evalIntegerExpr(
        resolveIntegerExpr(statement.value, symbols),
      );
      symbols.set(statement.name, value);
    } else if (statement.kind === "PrintStatement") {
      if (
        statement.argument !== undefined &&
        statement.argument.kind !== "StringLiteral"
      ) {
        printStatements.push({
          kind: "PrintStatement",
          argument: resolveIntegerExpr(statement.argument, symbols),
        });
      } else {
        printStatements.push({
          kind: "PrintStatement",
          argument: statement.argument,
        });
      }
    } else if (statement.argument.kind !== "StringLiteral") {
      resolveIntegerExpr(statement.argument, symbols);
    }
  }

  // Allocate a contiguous region in .rdata for each string literal's payload
  // (value + EOL), starting at STRING_PAYLOAD.
  const stringPayloads: { rva: number; bytes: Uint8Array }[] = [];
  const ops: PrintOp[] = [];
  let nextPayloadRva = MEMORY_LAYOUT.STRING_PAYLOAD;
  for (const statement of printStatements) {
    if (statement.argument === undefined) {
      const bytes = new TextEncoder().encode(EOL_STRING[eol]);
      stringPayloads.push({ rva: nextPayloadRva, bytes });
      ops.push({ kind: "string", rva: nextPayloadRva, length: bytes.length });
      nextPayloadRva += bytes.length;
    } else if (statement.argument.kind === "StringLiteral") {
      const bytes = new TextEncoder().encode(
        statement.argument.value + EOL_STRING[eol],
      );
      stringPayloads.push({ rva: nextPayloadRva, bytes });
      ops.push({ kind: "string", rva: nextPayloadRva, length: bytes.length });
      nextPayloadRva += bytes.length;
    } else {
      ops.push({ kind: "integer", node: statement.argument });
    }
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

  if (!fs.existsSync("dist")) fs.mkdirSync("dist", { recursive: true });
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
  if (eol === "lf") {
    code.decRdi();
    code.movByteRdiImm(0x0a);
    code.movR8d32(1);
  } else {
    code.decRdi();
    code.movByteRdiImm(0x0a);
    code.decRdi();
    code.movByteRdiImm(0x0d);
    code.movR8d32(2);
  }
  if (mayBeNegative(node)) {
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

  if (mayBeNegative(node)) {
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

function resolveIntegerExpr(
  node: IntegerExprNode,
  symbols: Map<string, number>,
): ResolvedIntegerExpr {
  if (node.kind === "Identifier") {
    const value = symbols.get(node.name);
    if (value === undefined) {
      throw new CompilerError(`Unknown identifier: ${node.name}`);
    }
    return { kind: "IntegerLiteral", value };
  }
  if (node.kind === "IntegerLiteral") return node;
  if (node.kind === "UnaryExpr") {
    return {
      kind: "UnaryExpr",
      operator: node.operator,
      operand: resolveIntegerExpr(node.operand, symbols),
    };
  }
  return {
    kind: "BinaryExpr",
    operator: node.operator,
    left: resolveIntegerExpr(node.left, symbols),
    right: resolveIntegerExpr(node.right, symbols),
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

function compileIntegerExpression(
  code: CodeBuilder,
  node: ResolvedIntegerExpr,
) {
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
