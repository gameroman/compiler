import { afterAll, describe, expect, it } from "bun:test";

import {
  cleanupCreatedFiles,
  compileSource,
  expectCompileError,
  expectCompilesTo,
  fingerprint,
  runAndExpect,
} from "./helpers";

afterAll(cleanupCreatedFiles);

describe("compileSourceToExecutable", () => {
  it("rejects redefining an already-defined constant", () => {
    expectCompileError("X = 1; X = 2; print(X)");
  });

  it("rejects using an undeclared identifier", () => {
    expectCompileError("print(X)");
  });

  it("rejects a constant value referencing an undeclared identifier", () => {
    expectCompileError("X = Y; print(X)");
  });

  it("rejects a missing operand after an operator", () => {
    expectCompileError("print(1 + *)");
  });

  it("rejects a string inside an addition operand", () => {
    expectCompileError('print((1) + ("hi"))');
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
    expectCompilesTo('"hello"', ";");
  });

  it("compiles a bare integer expression statement", () => {
    expectCompilesTo("1 + 2", ";");
  });

  it("rejects a string followed by an integer addition", () => {
    expectCompileError('print("abc" + 123)');
  });

  it("rejects an integer followed by a string addition", () => {
    expectCompileError('print(123 + "abc")');
  });

  it("rejects an unterminated string literal", () => {
    expectCompileError('"');
  });

  it("rejects an unclosed print parenthesis", () => {
    expectCompileError("print(");
  });

  it("rejects a semicolon inside print parentheses", () => {
    expectCompileError("print(;)");
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
    expectCompileError("1 +");
  });

  it("rejects print without parentheses", () => {
    expectCompileError("print 1");
  });
});
