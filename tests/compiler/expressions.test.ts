import { afterAll, describe, expect, it } from "bun:test";

import {
  cleanupCreatedFiles,
  compileSource,
  expectCompilesTo,
  fingerprint,
  runAndExpect,
} from "./helpers";

afterAll(cleanupCreatedFiles);

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
    expectCompilesTo(
      'print("hello"); print("world")',
      'print("hello")\nprint("world")',
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
    expectCompilesTo("print(1 + 2)", "print(3)");
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
    expectCompilesTo('print(("hi"))', 'print("hi")');
  });

  it("prints a doubly parenthesized string literal", () => {
    expectCompilesTo('print((("hi")))', 'print("hi")');
  });

  it("prints a parenthesized addition", () => {
    expectCompilesTo("print((1+2))", "print(3)");
  });

  it("prints parenthesized operands in an addition", () => {
    expectCompilesTo("print((1)+(2))", "print(3)");
  });

  it("prints a doubly parenthesized addition", () => {
    expectCompilesTo("print(((1)+(2)))", "print(3)");
  });

  it("prints the result of a multiplication", () => {
    expectCompilesTo("print(2 * 3)", "print(6)");
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
    expectCompilesTo("print(10 - 3)", "print(7)");
  });

  it("prints a left-associative subtraction chain", () => {
    expectCompilesTo("print(10 - 3 - 2)", "print(5)");
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
    expectCompilesTo("print(+5)", "print(5)");
  });

  it("applies unary minus to a group", () => {
    expectCompilesTo("print(-(2 + 3))", "print(-5)");
  });

  it("subtracts a negative operand", () => {
    expectCompilesTo("print(1 - -2)", "print(3)");
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
    expectCompilesTo("X = 1 + 2; print(X)", "print(3)");
  });

  it("lets constants reference earlier constants", () => {
    expectCompilesTo("X = 2; Y = X * 3; print(Y)", "print(6)");
  });

  it("prints a negative constant", () => {
    expectCompilesTo("X = -5; print(X)", "print(-5)");
  });

  it("uses a constant inside an expression", () => {
    expectCompilesTo("X = 10; print(X - 4)", "print(6)");
  });
});
