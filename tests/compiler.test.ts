import { afterAll, describe, expect, it } from "bun:test";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { CompilerError } from "../src/errors";
import { compileSourceToExecutable } from "../src/index";
import type { CompileOptions } from "../src/index";

const createdFiles: string[] = [];

function compileSource(source: string, options?: CompileOptions): string {
  const outputFile = path.join(
    os.tmpdir(),
    `hello-${process.pid}-${createdFiles.length}.exe`,
  );
  createdFiles.push(outputFile);
  compileSourceToExecutable(source, outputFile, options);
  return outputFile;
}

afterAll(() => {
  for (const file of createdFiles) {
    fs.rmSync(file, { force: true });
  }
});

function fingerprint(file: string) {
  const binary = fs.readFileSync(file);
  return {
    size: binary.byteLength,
    hash: createHash("sha256").update(binary).digest("hex"),
  };
}

function runAndExpect(outputFile: string, expectedStdout: string) {
  const result = spawnSync(outputFile, [], { encoding: "utf8" });
  expect(result.status).toBe(0);
  expect(result.stdout).toBe(expectedStdout);
}

describe("compileSourceToExecutable", () => {
  it("produces a binary that prints hello world", () => {
    const outputFile = compileSource('print("hello world")');

    runAndExpect(outputFile, "hello world\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"7a6b94a13cb8ed26aa1f30fef2024a67abf90ee8b56125f251c70c61c2d88d16"`,
    );
  });

  it("produces a binary that prints an integer", () => {
    const outputFile = compileSource("print(42)");

    runAndExpect(outputFile, "42\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"90337331e95fa12bf581c41b2797c7876ed193d312178074d65e275c2dae0f6d"`,
    );
  });

  it("prints multiple statements on separate lines", () => {
    const outputFile = compileSource('print("hello")\nprint("world")');

    runAndExpect(outputFile, "hello\r\nworld\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"cfd3121cd78ea9ab98c02b41baf25da4dc5d8d6d3d6d147a50988a8728b3b1bc"`,
    );
  });

  it("prints multiple statements separated by semicolons", () => {
    const outputFile = compileSource('print("hello"); print("world")');

    runAndExpect(outputFile, "hello\r\nworld\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"cfd3121cd78ea9ab98c02b41baf25da4dc5d8d6d3d6d147a50988a8728b3b1bc"`,
    );
  });

  it("mixes string and integer prints", () => {
    const outputFile = compileSource('print("n="); print(42)');

    runAndExpect(outputFile, "n=\r\n42\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"86065e10403a1df01e6638b903ec3ecc306843de698ed767136ee9cdef1b4033"`,
    );
  });

  it("prints a string with lf eol", () => {
    const outputFile = compileSource('print("hi")', { eol: "lf" });

    runAndExpect(outputFile, "hi\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"f0ea27136c9aefbab45e260dea9a29bb5f0b1085c74ad7cba01b9372425da410"`,
    );
  });

  it("prints an integer with lf eol", () => {
    const outputFile = compileSource("print(42)", { eol: "lf" });

    runAndExpect(outputFile, "42\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"9622985939aed323c98c226e0976739a5682942d809b998519a33d8487f66586"`,
    );
  });

  it("prints with explicit crlf eol", () => {
    const outputFile = compileSource('print("hi")', { eol: "crlf" });

    runAndExpect(outputFile, "hi\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"f6fa5e623c0cdd84569cc6fc50bc168f431b515dff32da69a85f580d32d20149"`,
    );
  });

  it("prints the result of an addition expression", () => {
    const outputFile = compileSource("print(1 + 2)");

    runAndExpect(outputFile, "3\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"893e9a632c719b697a34b1575c4f72431b26d90f212c238914622925e63639a3"`,
    );
  });

  it("prints a left-associative addition chain", () => {
    const outputFile = compileSource("print(1 + 2 + 3)");

    runAndExpect(outputFile, "6\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"f3044c40bc22981e92a20f2ae094b5364471d6c3864d2a1fca7fcb256e2fc2cb"`,
    );
  });

  it("prints a parenthesized string literal", () => {
    const outputFile = compileSource('print(("hi"))');

    runAndExpect(outputFile, "hi\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"f6fa5e623c0cdd84569cc6fc50bc168f431b515dff32da69a85f580d32d20149"`,
    );
  });

  it("prints a doubly parenthesized string literal", () => {
    const outputFile = compileSource('print((("hi")))');

    runAndExpect(outputFile, "hi\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"f6fa5e623c0cdd84569cc6fc50bc168f431b515dff32da69a85f580d32d20149"`,
    );
  });

  it("prints a parenthesized addition", () => {
    const outputFile = compileSource("print((1+2))");

    runAndExpect(outputFile, "3\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"893e9a632c719b697a34b1575c4f72431b26d90f212c238914622925e63639a3"`,
    );
  });

  it("prints parenthesized operands in an addition", () => {
    const outputFile = compileSource("print((1)+(2))");

    runAndExpect(outputFile, "3\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"893e9a632c719b697a34b1575c4f72431b26d90f212c238914622925e63639a3"`,
    );
  });

  it("prints a doubly parenthesized addition", () => {
    const outputFile = compileSource("print(((1)+(2)))");

    runAndExpect(outputFile, "3\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"893e9a632c719b697a34b1575c4f72431b26d90f212c238914622925e63639a3"`,
    );
  });

  it("prints the result of a multiplication", () => {
    const outputFile = compileSource("print(2 * 3)");

    runAndExpect(outputFile, "6\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"9fc3ccaf314021dd7479defafe61a4a4f91ffaa5627c9802167c2f4262fe03be"`,
    );
  });

  it("prints a left-associative multiplication chain", () => {
    const outputFile = compileSource("print(2 * 3 * 4)");

    runAndExpect(outputFile, "24\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"947d574cd2e16f84d71c932861c3255b7450049377645042fabc62d001db2c83"`,
    );
  });

  it("respects multiplication over addition precedence", () => {
    const outputFile = compileSource("print(1 + 2 * 3)");

    runAndExpect(outputFile, "7\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"cf1a7b67874bd6b9e114ae92789bdea3e3d4464b981e4b2afdcc7fe6947a5c5b"`,
    );
  });

  it("respects multiplication over addition precedence on the left", () => {
    const outputFile = compileSource("print(2 * 3 + 4)");

    runAndExpect(outputFile, "10\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"af16ffc307996f040b9ae8eefe6473170f9fcc5a820cd6a9ccc0e39920ac815e"`,
    );
  });

  it("lets parentheses override multiplication precedence", () => {
    const outputFile = compileSource("print((1 + 2) * 3)");

    runAndExpect(outputFile, "9\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"3d4e22efe3f3e992bd70388c51e74cfb6f426969a783e43a58cdfb5bce797967"`,
    );
  });

  it("multiplies a group against a literal", () => {
    const outputFile = compileSource("print(3 * (2 + 4))");

    runAndExpect(outputFile, "18\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"c52338e1fb725afb34faee656300c1ce8184f30072ec0ec8d57cc511833247d2"`,
    );
  });

  it("prints the result of a subtraction", () => {
    const outputFile = compileSource("print(10 - 3)");

    runAndExpect(outputFile, "7\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"2aaa14d0b62d07fbff5672a4883bc8325d03130fdc0737d27f3133ccdf268472"`,
    );
  });

  it("prints a left-associative subtraction chain", () => {
    const outputFile = compileSource("print(10 - 3 - 2)");

    runAndExpect(outputFile, "5\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"d18aaf7911c83d3273861a89cefbaa3a221641d465f00ea4e309c52e3db4e837"`,
    );
  });

  it("mixes addition and subtraction left-associatively", () => {
    const outputFile = compileSource("print(1 - 2 + 3)");

    runAndExpect(outputFile, "2\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"1549409987c9e0cdad9748f9a7cec8e1cf7fb22fb6336aa998e629d696572801"`,
    );
  });

  it("prints a negative subtraction result", () => {
    const outputFile = compileSource("print(3 - 5)");

    runAndExpect(outputFile, "-2\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"73aa791bad8e7a912e9f24d52fe737d36b9a6017a4653f811e4b1b94865204a5"`,
    );
  });

  it("prints a negative literal", () => {
    const outputFile = compileSource("print(-5)");

    runAndExpect(outputFile, "-5\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"5c0b68531af44ce7a08fd8ea988950ac93953469f566f6999a6a0d0b57d4524f"`,
    );
  });

  it("prints a positive literal via unary plus", () => {
    const outputFile = compileSource("print(+5)");

    runAndExpect(outputFile, "5\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"f7a1c64e77c5162542772f87c2464483dc794f21270e01a68ae0ff403820e62c"`,
    );
  });

  it("applies unary minus to a group", () => {
    const outputFile = compileSource("print(-(2 + 3))");

    runAndExpect(outputFile, "-5\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"d0105b4c1af8844df4b5fd0199d182642d0252778a0e83a84250b45a875a35fa"`,
    );
  });

  it("subtracts a negative operand", () => {
    const outputFile = compileSource("print(1 - -2)");

    runAndExpect(outputFile, "3\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"6c93bc2db452b21b93dcb3003bdfd46e1dac6c20362320c5859b6a009537cf7c"`,
    );
  });

  it("multiplies by a negative operand", () => {
    const outputFile = compileSource("print(2 * -3)");

    runAndExpect(outputFile, "-6\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"59b4d4939dcac8079b538483ddae7e12278ef65a7d3d62e3ab9b6a917e3cc45a"`,
    );
  });

  it("prints the value of a constant", () => {
    const outputFile = compileSource("X = 5; print(X)");

    runAndExpect(outputFile, "5\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"1a97d8c031f0bfdb61f7961359218ead1c7111e2ecaafdaf6407cbf437b6cc5f"`,
    );
  });

  it("folds a constant expression into a constant", () => {
    const outputFile = compileSource("X = 1 + 2; print(X)");

    runAndExpect(outputFile, "3\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"33001d64cd13b259a887982a14d3da2c791e85d1aae1889850a845980016b8d8"`,
    );
  });

  it("lets constants reference earlier constants", () => {
    const outputFile = compileSource("X = 2; Y = X * 3; print(Y)");

    runAndExpect(outputFile, "6\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"34c12a80647a1c69deea7685139665a5ccb92b8e1a23b86550c3814db3121db2"`,
    );
  });

  it("prints a negative constant", () => {
    const outputFile = compileSource("X = -5; print(X)");

    runAndExpect(outputFile, "-5\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"0ba8f524ab9c41862c727c22ddb30f7bbec7ee388c7e6927ec9cc01f4530b446"`,
    );
  });

  it("uses a constant inside an expression", () => {
    const outputFile = compileSource("X = 10; print(X - 4)");

    runAndExpect(outputFile, "6\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"b1bbfc8ff07f176d2120aea21551d31adfe42229ffefebede225cd8fe6e8008d"`,
    );
  });

  it("rejects redefining an already-defined constant", () => {
    expect(() => compileSource("X = 1; X = 2; print(X)")).toThrow(
      CompilerError,
    );
  });

  it("rejects using an undeclared identifier", () => {
    expect(() => compileSource("print(X)")).toThrow(CompilerError);
  });

  it("rejects a constant value referencing an undeclared identifier", () => {
    expect(() => compileSource("X = Y; print(X)")).toThrow(CompilerError);
  });

  it("rejects a missing operand after an operator", () => {
    expect(() => compileSource("print(1 + *)")).toThrow(CompilerError);
  });

  it("rejects a string inside an addition operand", () => {
    expect(() => compileSource('print((1) + ("hi"))')).toThrow(CompilerError);
  });

  it("compiles a bare semicolon as an empty program", () => {
    const outputFile = compileSource(";");

    runAndExpect(outputFile, "");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"08db888a9aa76055731ce8227c2bce5bee9d1c8b2c1fbe53efe3a027c57fd662"`,
    );
  });

  it("compiles a bare string expression statement", () => {
    const outputFile = compileSource('"hello"');

    runAndExpect(outputFile, "");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"08db888a9aa76055731ce8227c2bce5bee9d1c8b2c1fbe53efe3a027c57fd662"`,
    );
  });

  it("compiles a bare integer expression statement", () => {
    const outputFile = compileSource("1 + 2");

    runAndExpect(outputFile, "");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"08db888a9aa76055731ce8227c2bce5bee9d1c8b2c1fbe53efe3a027c57fd662"`,
    );
  });

  it("rejects a string followed by an integer addition", () => {
    expect(() => compileSource('print("abc" + 123)')).toThrow(CompilerError);
  });

  it("rejects an integer followed by a string addition", () => {
    expect(() => compileSource('print(123 + "abc")')).toThrow(CompilerError);
  });

  it("rejects an unterminated string literal", () => {
    expect(() => compileSource('"')).toThrow(CompilerError);
  });

  it("rejects an unclosed print parenthesis", () => {
    expect(() => compileSource("print(")).toThrow(CompilerError);
  });

  it("rejects a semicolon inside print parentheses", () => {
    expect(() => compileSource("print(;)")).toThrow(CompilerError);
  });

  it("prints a newline for an empty print", () => {
    const outputFile = compileSource("print()");

    runAndExpect(outputFile, "\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"9a7bb965268a3497064d969469bd7bbee644a3957a1a3023920e6cbb0ac0a790"`,
    );
  });

  it("prints a newline for an empty print with lf eol", () => {
    const outputFile = compileSource("print()", { eol: "lf" });

    runAndExpect(outputFile, "\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"d9415ac4b252274b9ccf8489470f365502414d29d988485cd0e6bc5c1bccf2b4"`,
    );
  });

  it("rejects a trailing plus", () => {
    expect(() => compileSource("1 +")).toThrow(CompilerError);
  });

  it("rejects print without parentheses", () => {
    expect(() => compileSource("print 1")).toThrow(CompilerError);
  });
});
