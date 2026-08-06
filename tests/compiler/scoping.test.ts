import { afterAll, describe, expect, it } from "bun:test";

import { CompilerError } from "#src/errors";

import {
  cleanupCreatedFiles,
  compileSource,
  expectCompilesTo,
  fingerprint,
  runAndExpect,
} from "./helpers";

afterAll(cleanupCreatedFiles);

describe("compileSourceToExecutable", () => {
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
    expectCompilesTo("X = 5; { print(X) }", "print(5)");
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
    expectCompilesTo("{ X = 1; { A = 2 } }; C = 3; print(C)", "print(3)");
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
});
