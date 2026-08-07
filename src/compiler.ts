import * as fs from "node:fs";

import { ELFBuilder } from "./elf-builder";
import { CompilerError } from "./errors";
import { tokenize } from "./lexer";
import { parse } from "./parser";
import type {
  ASTNode,
  BlockStatementNode,
  ExpressionNode,
  IfStatementNode,
  IntegerExprNode,
  PrintStatementNode,
} from "./parser";
import { PEBuilder } from "./pe-builder";
import { createRuntime, defaultEolForTarget, EOL_STRING } from "./runtime";
import type { Eol, MemoryLayout, Target } from "./runtime";
import { CodeBuilder, Register } from "./x86-64";

export type { Eol, Target } from "./runtime";

type ValueType = "number" | "boolean" | "string";

type Value = number | boolean | string;

interface ConstBinding {
  kind: "const";
  value: Value;
}

interface RuntimeBinding {
  kind: "runtime";
  type: ValueType;
  slotRva: number;
}

interface MutableBinding {
  kind: "mutable";
  type: ValueType;
  slotRva: number;
}

type Binding = ConstBinding | RuntimeBinding | MutableBinding;

export interface CompileOptions {
  eol?: Eol;
  target?: Target;
}

export function compileSourceToExecutable(
  sourceCode: string,
  outputFile: string,
  options: CompileOptions = {},
) {
  fs.writeFileSync(outputFile, compileSourceToBytes(sourceCode, options));
  if (process.platform !== "win32") {
    fs.chmodSync(outputFile, 0o755);
  }
}

export function compileSourceToBytes(
  sourceCode: string,
  options: CompileOptions = {},
): Uint8Array {
  const target = options.target ?? "windows-x86-64";
  const eol = options.eol ?? defaultEolForTarget(target);
  const eolString = EOL_STRING[eol];
  const tokens = tokenize(sourceCode);
  const ast = parse(tokens);

  const code = new CodeBuilder();
  code.subRsp(56);

  const runtime = createRuntime(target, eol, code);
  const layout: MemoryLayout = runtime.layout;

  const encoder = new TextEncoder();
  const payloads = new Map<
    string,
    { rva: number; length: number; bytes: Uint8Array }
  >();
  let nextPayloadRva = layout.stringPayload;
  const intern = (text: string) => {
    const existing = payloads.get(text);
    if (existing !== undefined) {
      return { rva: existing.rva, length: existing.length };
    }
    const bytes = encoder.encode(text);
    if (nextPayloadRva + bytes.length > layout.scratchBuffer) {
      throw new CompilerError("String payloads exceed available .rdata space");
    }
    const rva = nextPayloadRva;
    nextPayloadRva += bytes.length;
    payloads.set(text, { rva, length: bytes.length, bytes });
    return { rva, length: bytes.length };
  };

  let nextSlotRva = layout.varStart;
  const allocateSlot = (bytes: number): number => {
    const rva = nextSlotRva;
    nextSlotRva += bytes;
    if (nextSlotRva > layout.varEnd) {
      throw new CompilerError(
        "Too many variables: .rdata variable space exhausted",
      );
    }
    return rva;
  };

  const scopes: Map<string, Binding>[] = [new Map()];
  const lookupSymbol = (name: string): Binding | undefined => {
    for (let i = scopes.length - 1; i >= 0; i--) {
      const scope = scopes[i];
      if (scope === undefined) continue;
      const binding = scope.get(name);
      if (binding !== undefined) return binding;
    }
    return undefined;
  };

  const typeOfExpression = (node: ExpressionNode): ValueType => {
    switch (node.kind) {
      case "StringLiteral":
        return "string";
      case "BooleanLiteral":
        return "boolean";
      case "IntegerLiteral":
        return "number";
      case "BinaryExpr":
      case "UnaryExpr":
        return "number";
      case "ComparisonExpr":
      case "NotExpr":
        return "boolean";
      case "Identifier": {
        const binding = lookupSymbol(node.name);
        if (binding === undefined) {
          throw new CompilerError(`Unknown identifier: ${node.name}`);
        }
        if (binding.kind === "const") {
          return typeof binding.value as ValueType;
        }
        return binding.type;
      }
    }
  };

  const foldIntegerValue = (node: IntegerExprNode): number | null => {
    if (node.kind === "IntegerLiteral") return node.value;
    if (node.kind === "Identifier") {
      const binding = lookupSymbol(node.name);
      if (binding === undefined) {
        throw new CompilerError(`Unknown identifier: ${node.name}`);
      }
      if (binding.kind !== "const") return null;
      if (typeof binding.value === "boolean") {
        throw new CompilerError(
          `Constant "${node.name}" is a boolean and cannot be used in an integer expression`,
        );
      }
      if (typeof binding.value === "string") {
        throw new CompilerError(
          `Constant "${node.name}" is a string and cannot be used in an integer expression`,
        );
      }
      return binding.value;
    }
    if (node.kind === "UnaryExpr") {
      const operand = foldIntegerValue(node.operand);
      if (operand === null) return null;
      return node.operator === "-" ? -operand : operand;
    }
    const left = foldIntegerValue(node.left);
    if (left === null) return null;
    const right = foldIntegerValue(node.right);
    if (right === null) return null;
    if (node.operator === "+") return left + right;
    if (node.operator === "-") return left - right;
    return left * right;
  };

  const foldExpression = (node: ExpressionNode): Value | null => {
    switch (node.kind) {
      case "StringLiteral":
        return node.value;
      case "BooleanLiteral":
        return node.value;
      case "IntegerLiteral":
        return node.value;
      case "Identifier": {
        const binding = lookupSymbol(node.name);
        if (binding === undefined) {
          throw new CompilerError(`Unknown identifier: ${node.name}`);
        }
        if (binding.kind !== "const") return null;
        return binding.value;
      }
      case "UnaryExpr":
      case "BinaryExpr":
        return foldIntegerValue(node);
      case "ComparisonExpr": {
        const leftType = typeOfExpression(node.left);
        const rightType = typeOfExpression(node.right);
        if (leftType !== rightType) {
          throw new CompilerError(
            `Cannot compare ${leftType} with ${rightType}`,
          );
        }
        const left = foldExpression(node.left);
        if (left === null) return null;
        const right = foldExpression(node.right);
        if (right === null) return null;
        return node.operator === "==" ? left === right : left !== right;
      }
      case "NotExpr": {
        const operand = foldExpression(node.operand);
        if (operand === null) return null;
        if (typeof operand === "string") {
          throw new CompilerError("Cannot negate a string");
        }
        if (typeof operand === "number") {
          throw new CompilerError("Cannot negate an integer");
        }
        return !operand;
      }
    }
  };

  const emitIntegerTree = (node: IntegerExprNode) => {
    const folded = foldIntegerValue(node);
    if (folded !== null && folded >= -0x80000000 && folded <= 0x7fffffff) {
      code.movRaxImm32(folded);
      return;
    }
    if (node.kind === "IntegerLiteral") {
      code.movRaxImm32(node.value);
      return;
    }
    if (node.kind === "Identifier") {
      const binding = lookupSymbol(node.name);
      if (binding === undefined) {
        throw new CompilerError(`Unknown identifier: ${node.name}`);
      }
      if (binding.kind === "const") {
        if (typeof binding.value === "boolean") {
          throw new CompilerError(
            `Constant "${node.name}" is a boolean and cannot be used in an integer expression`,
          );
        }
        if (typeof binding.value === "string") {
          throw new CompilerError(
            `Constant "${node.name}" is a string and cannot be used in an integer expression`,
          );
        }
        code.movRaxImm32(binding.value);
        return;
      }
      if (binding.type !== "number") {
        throw new CompilerError(
          `"${node.name}" is a ${binding.type} and cannot be used in an integer expression`,
        );
      }
      code.movRaxRipRelative(layout.textRva, binding.slotRva);
      return;
    }
    if (node.kind === "UnaryExpr") {
      emitIntegerTree(node.operand);
      if (node.operator === "-") code.negRax();
      return;
    }
    emitIntegerTree(node.left);
    const literal = node.right.kind === "IntegerLiteral" ? node.right : null;
    if (literal !== null) {
      if (node.operator === "+") code.addRaxImm32(literal.value);
      else if (node.operator === "-") code.subRaxImm32(literal.value);
      else code.imulRaxImm32(literal.value);
      return;
    }
    code.pushRax();
    emitIntegerTree(node.right);
    code.popRdx();
    if (node.operator === "-") code.xchgRaxRdx();
    if (node.operator === "+") code.addRaxRdx();
    else if (node.operator === "-") code.subRaxRdx();
    else code.imulRaxRdx();
  };

  const emitBooleanIntoRax = (node: ExpressionNode) => {
    switch (node.kind) {
      case "BooleanLiteral":
        code.movRaxImm32(node.value ? 1 : 0);
        return;
      case "Identifier": {
        const binding = lookupSymbol(node.name);
        if (binding === undefined) {
          throw new CompilerError(`Unknown identifier: ${node.name}`);
        }
        if (binding.kind === "const") {
          if (typeof binding.value !== "boolean") {
            throw new CompilerError(`Constant "${node.name}" is not a boolean`);
          }
          code.movRaxImm32(binding.value ? 1 : 0);
          return;
        }
        if (binding.type !== "boolean") {
          throw new CompilerError(`"${node.name}" is not a boolean`);
        }
        code.movRaxRipRelative(layout.textRva, binding.slotRva);
        return;
      }
      case "ComparisonExpr":
        emitOperandIntoRax(node.left);
        code.pushRax();
        emitOperandIntoRax(node.right);
        code.popRdx();
        code.cmpRaxRdx();
        if (node.operator === "==") code.seteAl();
        else code.setneAl();
        code.movzxRaxAl();
        return;
      case "NotExpr":
        emitBooleanIntoRax(node.operand);
        code.xorEax1();
        return;
    }
  };

  const emitStringIntoRax = (node: ExpressionNode) => {
    switch (node.kind) {
      case "StringLiteral": {
        const payload = intern(node.value + eolString);
        code.leaRipRelative(Register.RAX, layout.textRva, payload.rva);
        code.movRdxImm32(payload.length);
        return;
      }
      case "Identifier": {
        const binding = lookupSymbol(node.name);
        if (binding === undefined) {
          throw new CompilerError(`Unknown identifier: ${node.name}`);
        }
        if (binding.kind === "const") {
          if (typeof binding.value !== "string") {
            throw new CompilerError(`Constant "${node.name}" is not a string`);
          }
          const payload = intern(binding.value + eolString);
          code.leaRipRelative(Register.RAX, layout.textRva, payload.rva);
          code.movRdxImm32(payload.length);
          return;
        }
        if (binding.type !== "string") {
          throw new CompilerError(`"${node.name}" is not a string`);
        }
        code.movRaxRipRelative(layout.textRva, binding.slotRva);
        code.movRdxRipRelative(layout.textRva, binding.slotRva + 8);
        return;
      }
    }
  };

  const emitOperandIntoRax = (node: ExpressionNode) => {
    const type = typeOfExpression(node);
    if (type === "number") emitIntegerTree(node as IntegerExprNode);
    else if (type === "boolean") emitBooleanIntoRax(node);
    else emitStringIntoRax(node);
  };

  const emitStore = (
    slotRva: number,
    type: ValueType,
    node: ExpressionNode,
  ) => {
    if (type === "number") {
      const folded = foldIntegerValue(node as IntegerExprNode);
      if (folded !== null && folded >= -0x80000000 && folded <= 0x7fffffff) {
        code.movRipRelativeImm32(layout.textRva, slotRva, folded);
        return;
      }
      emitIntegerTree(node as IntegerExprNode);
      code.movRipRelativeRax(layout.textRva, slotRva);
      return;
    }
    if (type === "boolean") {
      const folded = foldExpression(node);
      if (folded !== null) {
        code.movRipRelativeImm32(layout.textRva, slotRva, folded ? 1 : 0);
        return;
      }
      emitBooleanIntoRax(node);
      code.movRipRelativeRax(layout.textRva, slotRva);
      return;
    }
    const folded = foldExpression(node);
    if (folded !== null) {
      const payload = intern(String(folded) + eolString);
      code.leaRipRelative(Register.RAX, layout.textRva, payload.rva);
      code.movRipRelativeRax(layout.textRva, slotRva);
      code.movRipRelativeImm32(layout.textRva, slotRva + 8, payload.length);
      return;
    }
    emitStringIntoRax(node);
    code.movRipRelativeRax(layout.textRva, slotRva);
    code.movRipRelativeRdx(layout.textRva, slotRva + 8);
  };

  const emitStringPrint = (payloadRva: number, length: number) => {
    runtime.emitStringPrint(payloadRva, length);
  };

  const emitBooleanPrint = () => {
    code.testRaxRax();
    const jzFalse = code.jzForward32();
    const truePayload = intern(`true${eolString}`);
    emitStringPrint(truePayload.rva, truePayload.length);
    const jmpDone = code.jmpForward32();
    code.patchJump32(jzFalse);
    const falsePayload = intern(`false${eolString}`);
    emitStringPrint(falsePayload.rva, falsePayload.length);
    code.patchJump32(jmpDone);
  };

  const emitPrint = (statement: PrintStatementNode) => {
    const argument = statement.argument;
    if (argument === undefined) {
      const payload = intern(eolString);
      emitStringPrint(payload.rva, payload.length);
      return;
    }
    const folded = foldExpression(argument);
    if (folded !== null && typeof folded === "number") {
      const inRange = folded >= -0x80000000 && folded <= 0x7fffffff;
      runtime.emitIntegerPrint(() => {
        if (inRange) code.movRaxImm32(folded);
        else emitIntegerTree(argument as IntegerExprNode);
      }, folded < 0);
      return;
    }
    if (folded !== null && typeof folded === "boolean") {
      const text = (folded ? "true" : "false") + eolString;
      const payload = intern(text);
      emitStringPrint(payload.rva, payload.length);
      return;
    }
    if (folded !== null) {
      const payload = intern(folded + eolString);
      emitStringPrint(payload.rva, payload.length);
      return;
    }
    const type = typeOfExpression(argument);
    if (type === "number") {
      runtime.emitIntegerPrint(
        () => emitIntegerTree(argument as IntegerExprNode),
        true,
      );
      return;
    }
    if (type === "boolean") {
      emitBooleanIntoRax(argument);
      emitBooleanPrint();
      return;
    }
    runtime.emitStringPtrPrint(() => emitStringIntoRax(argument));
  };

  const emitBlock = (block: BlockStatementNode) => {
    scopes.push(new Map());
    emitStatements(block.body);
    scopes.pop();
  };

  const emitElseBranch = (
    branch: BlockStatementNode | IfStatementNode | undefined,
  ) => {
    if (branch === undefined) return;
    if (branch.kind === "BlockStatement") emitBlock(branch);
    else emitIf(branch);
  };

  const emitIf = (statement: IfStatementNode) => {
    const folded = foldExpression(statement.condition);
    if (folded !== null) {
      if (typeof folded !== "boolean") {
        throw new CompilerError("An if condition must be a boolean");
      }
      if (folded === true) {
        emitBlock(statement.thenBlock);
      } else {
        emitElseBranch(statement.elseBranch);
      }
      return;
    }
    if (typeOfExpression(statement.condition) !== "boolean") {
      throw new CompilerError("An if condition must be a boolean");
    }
    emitBooleanIntoRax(statement.condition);
    code.testRaxRax();
    const jzElse = code.jzForward32();
    emitBlock(statement.thenBlock);
    const jmpEnd = code.jmpForward32();
    code.patchJump32(jzElse);
    emitElseBranch(statement.elseBranch);
    code.patchJump32(jmpEnd);
  };

  const handleDecl = (
    name: string,
    value: ExpressionNode,
    kind: "ConstDecl" | "RuntimeDecl" | "LetDecl",
  ) => {
    const scope = scopes[scopes.length - 1];
    if (scope === undefined) {
      throw new CompilerError("Internal error: empty scope stack");
    }
    if (lookupSymbol(name) !== undefined) {
      throw new CompilerError(`"${name}" is already defined`);
    }
    if (kind === "ConstDecl") {
      const folded = foldExpression(value);
      if (folded === null) {
        throw new CompilerError(
          `const "${name}" must be initialized with a compile-time constant`,
        );
      }
      scope.set(name, { kind: "const", value: folded });
      return;
    }
    if (kind === "RuntimeDecl") {
      const folded = foldExpression(value);
      if (folded !== null) {
        scope.set(name, { kind: "const", value: folded });
        return;
      }
      const type = typeOfExpression(value);
      const slotRva = allocateSlot(type === "string" ? 16 : 8);
      scope.set(name, { kind: "runtime", type, slotRva });
      emitStore(slotRva, type, value);
      return;
    }
    const type = typeOfExpression(value);
    const slotRva = allocateSlot(type === "string" ? 16 : 8);
    scope.set(name, { kind: "mutable", type, slotRva });
    emitStore(slotRva, type, value);
  };

  const handleReassign = (name: string, value: ExpressionNode) => {
    const binding = lookupSymbol(name);
    if (binding === undefined) {
      throw new CompilerError(`Unknown identifier: ${name}`);
    }
    if (binding.kind !== "mutable") {
      throw new CompilerError(`Cannot reassign "${name}"`);
    }
    const type = typeOfExpression(value);
    if (type !== binding.type) {
      throw new CompilerError(
        `Cannot assign a ${type} to "${name}" which is a ${binding.type}`,
      );
    }
    emitStore(binding.slotRva, binding.type, value);
  };

  const emitStatements = (statements: ASTNode[]) => {
    for (const statement of statements) {
      switch (statement.kind) {
        case "ConstDecl":
        case "RuntimeDecl":
        case "LetDecl":
          handleDecl(statement.name, statement.value, statement.kind);
          break;
        case "Reassign":
          handleReassign(statement.name, statement.value);
          break;
        case "PrintStatement":
          emitPrint(statement);
          break;
        case "BlockStatement":
          emitBlock(statement);
          break;
        case "IfStatement":
          emitIf(statement);
          break;
        case "ExpressionStatement":
          foldExpression(statement.argument);
          break;
      }
    }
  };

  emitStatements(ast);

  runtime.emitExit();

  const rdataEnd = Math.max(nextSlotRva, nextPayloadRva);
  const dataSize = Math.max(0x200, rdataEnd - layout.rdataRva);

  const payloadOffset =
    layout.rdataFileOffset + (layout.stringPayload - layout.rdataRva);

  if (target === "linux-x86-64") {
    const elf = new ELFBuilder(0x8000);
    elf.writeHeaders(code.length, dataSize);

    elf.seek(layout.textFileOffset);
    elf.writeBytes(code.bytes);
    elf.padToAlignment(0x200);

    elf.seek(layout.rdataFileOffset);
    elf.seek(payloadOffset);
    const sortedPayloads = [...payloads.values()].sort((a, b) => a.rva - b.rva);
    for (const { bytes } of sortedPayloads) {
      elf.writeBytes(bytes);
    }

    elf.padToAlignment(0x200);

    return elf.TrimmedBuffer;
  }

  const pe = new PEBuilder(8192);
  pe.writeHeaders(0x200, dataSize, layout.textRva, layout.rdataRva);

  // --- Write .text ---
  pe.seek(layout.textFileOffset);
  pe.writeBytes(code.bytes);
  pe.padToAlignment(0x200);

  // --- Write .rdata ---
  pe.seek(layout.rdataFileOffset);

  // Import Directory Descriptor @ 0x2000 (File 0x400)
  pe.writeU32(0x2028); // ILT RVA
  pe.writeU32(0);
  pe.writeU32(0);
  pe.writeU32(0x20a0); // DLL Name RVA ("kernel32.dll")
  pe.writeU32(0x2048); // IAT RVA (0x2048)

  // Null Directory Descriptor
  pe.writeU32(0);
  pe.writeU32(0);
  pe.writeU32(0);
  pe.writeU32(0);
  pe.writeU32(0);

  // ILT @ RVA 0x2028 (File 0x428)
  pe.seek(layout.rdataFileOffset + 0x28);
  pe.writeU64(0x2070n); // GetStdHandle Name RVA
  pe.writeU64(0x2080n); // WriteFile Name RVA
  pe.writeU64(0x2090n); // ExitProcess Name RVA
  pe.writeU64(0n);

  // IAT @ RVA 0x2048 (File 0x448)
  pe.seek(layout.rdataFileOffset + 0x48);
  pe.writeU64(0x2070n);
  pe.writeU64(0x2080n);
  pe.writeU64(0x2090n);
  pe.writeU64(0n);

  // Function Hint/Names @ RVA 0x2070, 0x2080, 0x2090
  pe.seek(layout.rdataFileOffset + 0x70);
  pe.writeU16(0);
  pe.writeString("GetStdHandle");

  pe.seek(layout.rdataFileOffset + 0x80);
  pe.writeU16(0);
  pe.writeString("WriteFile");

  pe.seek(layout.rdataFileOffset + 0x90);
  pe.writeU16(0);
  pe.writeString("ExitProcess");

  // DLL Name @ RVA 0x20A0
  pe.seek(layout.rdataFileOffset + 0xa0);
  pe.writeString("kernel32.dll");

  // String Payloads @ RVA 0x20B0+
  pe.seek(payloadOffset);
  const sortedPayloads = [...payloads.values()].sort((a, b) => a.rva - b.rva);
  for (const { bytes } of sortedPayloads) {
    pe.writeBytes(bytes);
  }

  pe.padToAlignment(0x200);

  return pe.TrimmedBuffer;
}
