import { describe, it } from "bun:test";

import { expectCompileError, expectCompilesTo } from "./helpers";

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

  it("rejects a trailing plus", () => {
    expectCompileError("1 +");
  });

  it("rejects print without parentheses", () => {
    expectCompileError("print 1");
  });
});
