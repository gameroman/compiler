import { describe, it } from "bun:test";

import { expectCompileError, expectCompilesTo } from "./helpers";

describe("compileSourceToExecutable", () => {
  it("prints a parenthesized boolean", () => {
    expectCompilesTo("print((true))", "print(true)");
  });

  it("prints a boolean constant", () => {
    expectCompilesTo("FLAG = true; print(FLAG)", "print(true)");
  });

  it("prints a false constant", () => {
    expectCompilesTo("FLAG = false; print(FLAG)", "print(false)");
  });

  it("prints a boolean constant declared inside a block", () => {
    expectCompilesTo("{ FLAG = true; print(FLAG) }", "print(true)");
  });

  it("folds a boolean constant to the same binary as its literal", () => {
    expectCompilesTo("FLAG = true; print(FLAG)", "print(true)");
  });

  it("prints a boolean with the same binary as its string", () => {
    expectCompilesTo('print("true")', "print(true)");
  });

  it("rejects using a boolean constant in an integer expression", () => {
    expectCompileError("FLAG = true; print(FLAG + 1)");
  });

  it("lets a boolean constant reference an earlier boolean constant", () => {
    expectCompilesTo("FLAG = true; OTHER = FLAG; print(OTHER)", "print(true)");
  });

  it("rejects using a boolean constant in an integer expression", () => {
    expectCompileError("FLAG = true; OTHER = FLAG + 1; print(OTHER)");
  });

  it("rejects an integer expression in a boolean print", () => {
    expectCompileError("print(true + 1)");
  });

  it("lets a string constant reference an earlier string constant", () => {
    expectCompilesTo('s = "hi"; t = s; print(t)', 'print("hi")');
  });

  it("prints a string constant declared inside a block", () => {
    expectCompilesTo('{ s = "hi"; print(s) }', 'print("hi")');
  });

  it("folds a string constant to the same binary as its literal", () => {
    expectCompilesTo('s = "hi"; print(s)', 'print("hi")');
  });

  it("rejects using a string constant in an integer expression", () => {
    expectCompileError('s = "hi"; print(s + 1)');
  });

  it("rejects using a string constant in an integer constant", () => {
    expectCompileError('s = "hi"; t = s + 1; print(t)');
  });

  it("folds a parenthesized integer constant to the same binary as its literal", () => {
    expectCompilesTo("X = (2); print(X)", "print(2)");
  });

  it("prints a parenthesized boolean constant", () => {
    expectCompilesTo("X = (true); print(X)", "print(true)");
  });

  it("folds a parenthesized boolean constant to the same binary as its literal", () => {
    expectCompilesTo("X = (true); print(X)", "print(true)");
  });

  it("prints a parenthesized string constant", () => {
    expectCompilesTo('X = ("hi"); print(X)', 'print("hi")');
  });

  it("folds a parenthesized string constant to the same binary as its literal", () => {
    expectCompilesTo('X = ("hi"); print(X)', 'print("hi")');
  });

  it("rejects an arithmetic statement using a boolean constant", () => {
    expectCompileError("X = true + 1; print(X)");
  });

  it("rejects an arithmetic statement using a string constant", () => {
    expectCompileError('X = "hi" + 1; print(X)');
  });

  it("rejects a parenthesized boolean in an integer expression", () => {
    expectCompileError("X = (true) + 1; print(X)");
  });
});
