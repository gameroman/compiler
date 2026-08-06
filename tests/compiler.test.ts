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

function expectSameBinary(a: string, b: string) {
  const aFingerprint = fingerprint(a);
  const bFingerprint = fingerprint(b);
  expect(aFingerprint.size).toBe(bFingerprint.size);
  expect(aFingerprint.hash).toBe(bFingerprint.hash);
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
      `"33001d64cd13b259a887982a14d3da2c791e85d1aae1889850a845980016b8d8"`,
    );
  });

  it("folds a constant expression to the same binary as its literal", () => {
    const folded = compileSource("print(1 + 2)");
    const literal = compileSource("print(3)");

    runAndExpect(folded, "3\r\n");
    runAndExpect(literal, "3\r\n");

    expectSameBinary(folded, literal);
  });

  it("keeps 64-bit precision when a folded result overflows 32 bits", () => {
    const outputFile = compileSource("print(2147483647 + 1)");

    runAndExpect(outputFile, "2147483648\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"4f0441805f3c7bf2e65e03b904c4037112f72f19656a797a601e7a2613bb6c14"`,
    );
  });

  it("prints a left-associative addition chain", () => {
    const outputFile = compileSource("print(1 + 2 + 3)");

    runAndExpect(outputFile, "6\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"34c12a80647a1c69deea7685139665a5ccb92b8e1a23b86550c3814db3121db2"`,
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
      `"33001d64cd13b259a887982a14d3da2c791e85d1aae1889850a845980016b8d8"`,
    );
  });

  it("prints parenthesized operands in an addition", () => {
    const outputFile = compileSource("print((1)+(2))");

    runAndExpect(outputFile, "3\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"33001d64cd13b259a887982a14d3da2c791e85d1aae1889850a845980016b8d8"`,
    );
  });

  it("prints a doubly parenthesized addition", () => {
    const outputFile = compileSource("print(((1)+(2)))");

    runAndExpect(outputFile, "3\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"33001d64cd13b259a887982a14d3da2c791e85d1aae1889850a845980016b8d8"`,
    );
  });

  it("prints the result of a multiplication", () => {
    const outputFile = compileSource("print(2 * 3)");

    runAndExpect(outputFile, "6\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"34c12a80647a1c69deea7685139665a5ccb92b8e1a23b86550c3814db3121db2"`,
    );
  });

  it("prints a left-associative multiplication chain", () => {
    const outputFile = compileSource("print(2 * 3 * 4)");

    runAndExpect(outputFile, "24\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"f8acf64a402153f41362a37678ed0b8ac8e43c3513e9b90424e3cccf2b195a54"`,
    );
  });

  it("respects multiplication over addition precedence", () => {
    const outputFile = compileSource("print(1 + 2 * 3)");

    runAndExpect(outputFile, "7\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"4ff9b97fd3f6d725978c6aa8589bd86d0dea6d1863e82a6f6063bdcb62a37eed"`,
    );
  });

  it("respects multiplication over addition precedence on the left", () => {
    const outputFile = compileSource("print(2 * 3 + 4)");

    runAndExpect(outputFile, "10\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"0a4d435d6e40e5e24d0d762f53028abe938081056834409ec3b003dfc0d2eab6"`,
    );
  });

  it("lets parentheses override multiplication precedence", () => {
    const outputFile = compileSource("print((1 + 2) * 3)");

    runAndExpect(outputFile, "9\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"88fd5833555115d81dff58ada875bc7c64c9fc618a30a0896d67f742086d00ec"`,
    );
  });

  it("multiplies a group against a literal", () => {
    const outputFile = compileSource("print(3 * (2 + 4))");

    runAndExpect(outputFile, "18\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"0450b242aae7a163847e0e80b1e66c5f7de8ed117155535150eca7a9226594b9"`,
    );
  });

  it("prints the result of a subtraction", () => {
    const outputFile = compileSource("print(10 - 3)");

    runAndExpect(outputFile, "7\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"4ff9b97fd3f6d725978c6aa8589bd86d0dea6d1863e82a6f6063bdcb62a37eed"`,
    );
  });

  it("prints a left-associative subtraction chain", () => {
    const outputFile = compileSource("print(10 - 3 - 2)");

    runAndExpect(outputFile, "5\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"1a97d8c031f0bfdb61f7961359218ead1c7111e2ecaafdaf6407cbf437b6cc5f"`,
    );
  });

  it("mixes addition and subtraction left-associatively", () => {
    const outputFile = compileSource("print(1 - 2 + 3)");

    runAndExpect(outputFile, "2\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"776b62395eca59e2e86482b25df16bd58ca279b4cbdf824e71ca49d6f7c0593c"`,
    );
  });

  it("prints a negative subtraction result", () => {
    const outputFile = compileSource("print(3 - 5)");

    runAndExpect(outputFile, "-2\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"54e87444e161d5278b0c747ebe4b4aec7f801146eb3e8135530ee32d38b31f52"`,
    );
  });

  it("prints a negative literal", () => {
    const outputFile = compileSource("print(-5)");

    runAndExpect(outputFile, "-5\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"0ba8f524ab9c41862c727c22ddb30f7bbec7ee388c7e6927ec9cc01f4530b446"`,
    );
  });

  it("prints a positive literal via unary plus", () => {
    const outputFile = compileSource("print(+5)");

    runAndExpect(outputFile, "5\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"1a97d8c031f0bfdb61f7961359218ead1c7111e2ecaafdaf6407cbf437b6cc5f"`,
    );
  });

  it("applies unary minus to a group", () => {
    const outputFile = compileSource("print(-(2 + 3))");

    runAndExpect(outputFile, "-5\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"0ba8f524ab9c41862c727c22ddb30f7bbec7ee388c7e6927ec9cc01f4530b446"`,
    );
  });

  it("subtracts a negative operand", () => {
    const outputFile = compileSource("print(1 - -2)");

    runAndExpect(outputFile, "3\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"33001d64cd13b259a887982a14d3da2c791e85d1aae1889850a845980016b8d8"`,
    );
  });

  it("multiplies by a negative operand", () => {
    const outputFile = compileSource("print(2 * -3)");

    runAndExpect(outputFile, "-6\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"e1b8efbdc37323128a16c92b03bf634adb65cdbe6385112481703a18cf53821d"`,
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
      `"34c12a80647a1c69deea7685139665a5ccb92b8e1a23b86550c3814db3121db2"`,
    );
  });

  it("prints true", () => {
    const outputFile = compileSource("print(true)");

    runAndExpect(outputFile, "true\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"72b2a8ffef50f0534c45bc0df5a2d7a19625841c11f012433e8f99de6d5542f7"`,
    );
  });

  it("prints false", () => {
    const outputFile = compileSource("print(false)");

    runAndExpect(outputFile, "false\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"41f3343152b3fbb27ec08c5e8787bb1e2f8f09e1c82a45f1835985d18a4e1272"`,
    );
  });

  it("prints a parenthesized boolean", () => {
    const outputFile = compileSource("print((true))");

    runAndExpect(outputFile, "true\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"72b2a8ffef50f0534c45bc0df5a2d7a19625841c11f012433e8f99de6d5542f7"`,
    );
  });

  it("prints a boolean constant", () => {
    const outputFile = compileSource("FLAG = true; print(FLAG)");

    runAndExpect(outputFile, "true\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"72b2a8ffef50f0534c45bc0df5a2d7a19625841c11f012433e8f99de6d5542f7"`,
    );
  });

  it("prints a false constant", () => {
    const outputFile = compileSource("FLAG = false; print(FLAG)");

    runAndExpect(outputFile, "false\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"41f3343152b3fbb27ec08c5e8787bb1e2f8f09e1c82a45f1835985d18a4e1272"`,
    );
  });

  it("prints a boolean constant declared inside a block", () => {
    const outputFile = compileSource("{ FLAG = true; print(FLAG) }");

    runAndExpect(outputFile, "true\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"72b2a8ffef50f0534c45bc0df5a2d7a19625841c11f012433e8f99de6d5542f7"`,
    );
  });

  it("folds a boolean constant to the same binary as its literal", () => {
    const folded = compileSource("FLAG = true; print(FLAG)");
    const literal = compileSource("print(true)");

    runAndExpect(folded, "true\r\n");
    runAndExpect(literal, "true\r\n");

    expectSameBinary(folded, literal);
  });

  it("prints a boolean with the same binary as its string", () => {
    const boolFile = compileSource("print(true)");
    const stringFile = compileSource('print("true")');

    runAndExpect(boolFile, "true\r\n");
    runAndExpect(stringFile, "true\r\n");

    expectSameBinary(boolFile, stringFile);
  });

  it("compiles a bare boolean expression statement as an empty program", () => {
    const outputFile = compileSource("true;");

    runAndExpect(outputFile, "");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"08db888a9aa76055731ce8227c2bce5bee9d1c8b2c1fbe53efe3a027c57fd662"`,
    );
  });

  it("rejects using a boolean constant in an integer expression", () => {
    expect(() => compileSource("FLAG = true; print(FLAG + 1)")).toThrow(
      CompilerError,
    );
  });

  it("lets a boolean constant reference an earlier boolean constant", () => {
    const outputFile = compileSource("FLAG = true; OTHER = FLAG; print(OTHER)");

    runAndExpect(outputFile, "true\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"72b2a8ffef50f0534c45bc0df5a2d7a19625841c11f012433e8f99de6d5542f7"`,
    );
  });

  it("rejects using a boolean constant in an integer expression", () => {
    expect(() =>
      compileSource("FLAG = true; OTHER = FLAG + 1; print(OTHER)"),
    ).toThrow(CompilerError);
  });

  it("rejects an integer expression in a boolean print", () => {
    expect(() => compileSource("print(true + 1)")).toThrow(CompilerError);
  });

  it("prints a string constant", () => {
    const outputFile = compileSource('s = "hi"; print(s)');

    runAndExpect(outputFile, "hi\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"f6fa5e623c0cdd84569cc6fc50bc168f431b515dff32da69a85f580d32d20149"`,
    );
  });

  it("lets a string constant reference an earlier string constant", () => {
    const outputFile = compileSource('s = "hi"; t = s; print(t)');

    runAndExpect(outputFile, "hi\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"f6fa5e623c0cdd84569cc6fc50bc168f431b515dff32da69a85f580d32d20149"`,
    );
  });

  it("prints a string constant declared inside a block", () => {
    const outputFile = compileSource('{ s = "hi"; print(s) }');

    runAndExpect(outputFile, "hi\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"f6fa5e623c0cdd84569cc6fc50bc168f431b515dff32da69a85f580d32d20149"`,
    );
  });

  it("folds a string constant to the same binary as its literal", () => {
    const folded = compileSource('s = "hi"; print(s)');
    const literal = compileSource('print("hi")');

    runAndExpect(folded, "hi\r\n");
    runAndExpect(literal, "hi\r\n");

    expectSameBinary(folded, literal);
  });

  it("rejects using a string constant in an integer expression", () => {
    expect(() => compileSource('s = "hi"; print(s + 1)')).toThrow(
      CompilerError,
    );
  });

  it("rejects using a string constant in an integer constant", () => {
    expect(() => compileSource('s = "hi"; t = s + 1; print(t)')).toThrow(
      CompilerError,
    );
  });

  it("prints a parenthesized integer constant", () => {
    const outputFile = compileSource("X = (2); print(X)");

    runAndExpect(outputFile, "2\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"776b62395eca59e2e86482b25df16bd58ca279b4cbdf824e71ca49d6f7c0593c"`,
    );
  });

  it("folds a parenthesized integer constant to the same binary as its literal", () => {
    const folded = compileSource("X = (2); print(X)");
    const literal = compileSource("print(2)");

    runAndExpect(folded, "2\r\n");
    runAndExpect(literal, "2\r\n");

    expectSameBinary(folded, literal);
  });

  it("prints a parenthesized boolean constant", () => {
    const outputFile = compileSource("X = (true); print(X)");

    runAndExpect(outputFile, "true\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"72b2a8ffef50f0534c45bc0df5a2d7a19625841c11f012433e8f99de6d5542f7"`,
    );
  });

  it("folds a parenthesized boolean constant to the same binary as its literal", () => {
    const folded = compileSource("X = (true); print(X)");
    const literal = compileSource("print(true)");

    runAndExpect(folded, "true\r\n");
    runAndExpect(literal, "true\r\n");

    expectSameBinary(folded, literal);
  });

  it("prints a parenthesized string constant", () => {
    const outputFile = compileSource('X = ("hi"); print(X)');

    runAndExpect(outputFile, "hi\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"f6fa5e623c0cdd84569cc6fc50bc168f431b515dff32da69a85f580d32d20149"`,
    );
  });

  it("folds a parenthesized string constant to the same binary as its literal", () => {
    const folded = compileSource('X = ("hi"); print(X)');
    const literal = compileSource('print("hi")');

    runAndExpect(folded, "hi\r\n");
    runAndExpect(literal, "hi\r\n");

    expectSameBinary(folded, literal);
  });

  it("rejects an arithmetic statement using a boolean constant", () => {
    expect(() => compileSource("X = true + 1; print(X)")).toThrow(
      CompilerError,
    );
  });

  it("rejects an arithmetic statement using a string constant", () => {
    expect(() => compileSource('X = "hi" + 1; print(X)')).toThrow(
      CompilerError,
    );
  });

  it("rejects a parenthesized boolean in an integer expression", () => {
    expect(() => compileSource("X = (true) + 1; print(X)")).toThrow(
      CompilerError,
    );
  });

  it("prints a constant declared inside a block", () => {
    const outputFile = compileSource("{ X = 5; print(X) }");

    runAndExpect(outputFile, "5\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"1a97d8c031f0bfdb61f7961359218ead1c7111e2ecaafdaf6407cbf437b6cc5f"`,
    );
  });

  it("sees outer constants inside a block", () => {
    const outputFile = compileSource("X = 5; { print(X) }");

    runAndExpect(outputFile, "5\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"1a97d8c031f0bfdb61f7961359218ead1c7111e2ecaafdaf6407cbf437b6cc5f"`,
    );
  });

  it("allows redeclaring a constant after its block closes", () => {
    const outputFile = compileSource("{ X = 2 }; X = 3; print(X)");

    runAndExpect(outputFile, "3\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"33001d64cd13b259a887982a14d3da2c791e85d1aae1889850a845980016b8d8"`,
    );
  });

  it("lets sibling blocks declare the same constant", () => {
    const outputFile = compileSource("{ X = 2; print(X) } { X = 5; print(X) }");

    runAndExpect(outputFile, "2\r\n5\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"de4c759c52939e6bd9937ac97a261dbd0f12dbd957b903b4c01faf51a2883c00"`,
    );
  });

  it("supports nested block scopes", () => {
    const outputFile = compileSource("{ X = 1; { A = 2; print(A) } print(X) }");

    runAndExpect(outputFile, "2\r\n1\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"4d76e05910181faa411419ca05cd6a14ce20f429c6447f768e17090b0f89ac6c"`,
    );
  });

  it("supports a constant declared after a nested block", () => {
    const outputFile = compileSource("{ X = 1; { A = 2 } }; C = 3; print(C)");

    runAndExpect(outputFile, "3\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"33001d64cd13b259a887982a14d3da2c791e85d1aae1889850a845980016b8d8"`,
    );
  });

  it("compiles an empty block", () => {
    const outputFile = compileSource("{}");

    runAndExpect(outputFile, "");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"08db888a9aa76055731ce8227c2bce5bee9d1c8b2c1fbe53efe3a027c57fd662"`,
    );
  });

  it("rejects redefining a visible constant inside a block", () => {
    expect(() => compileSource("X = 1; { X = 2 }")).toThrow(CompilerError);
  });

  it("rejects shadowing in nested blocks", () => {
    expect(() => compileSource("{ X = 1; { X = 2 } }")).toThrow(CompilerError);
  });

  it("rejects using a block-scoped constant outside its block", () => {
    expect(() => compileSource("{ X = 2 } print(X)")).toThrow(CompilerError);
  });

  it("rejects a reference to an undeclared identifier inside a block", () => {
    expect(() => compileSource("{ print(X) }")).toThrow(CompilerError);
  });

  it("rejects an unclosed block", () => {
    expect(() => compileSource("{ X = 1")).toThrow(CompilerError);
  });

  it("rejects a stray closing brace", () => {
    expect(() => compileSource("}")).toThrow(CompilerError);
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
