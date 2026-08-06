import { afterAll, describe, expect, it } from "bun:test";

import { CompilerError } from "#src/errors";

import {
  cleanupCreatedFiles,
  compileSource,
  expectSameBinary,
  fingerprint,
  runAndExpect,
} from "./helpers";

afterAll(cleanupCreatedFiles);

describe("compileSourceToExecutable", () => {
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
});
