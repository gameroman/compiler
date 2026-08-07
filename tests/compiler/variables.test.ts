import { describe, it } from "bun:test";

import { expectCompileError, expectCompilesTo } from "./helpers";

describe("compileSourceToExecutable", () => {
  it("folds a const declaration to the same binary as its literal", () => {
    expectCompilesTo("const X = 3; print(X)", "print(3)");
  });

  it("folds a bare declaration to the same binary as its literal", () => {
    expectCompilesTo("X = 3; print(X)", "print(3)");
  });

  it("folds const and bare declarations to the same binary", () => {
    expectCompilesTo("const X = 3; print(X)", "X = 3; print(X)");
  });

  it("folds a const expression initializer", () => {
    expectCompilesTo("const X = 1 + 2; print(X)", "print(3)");
  });

  it("prunes a dead branch from a folded const condition", () => {
    expectCompilesTo(
      'const X = 3; if (X == 4) { print("a") } else { print("b") }',
      'print("b")',
    );
  });

  it("lets a const reference an earlier const", () => {
    expectCompilesTo("const A = 2; const B = A * 3; print(B)", "print(6)");
  });

  it("rejects redefining a let variable", () => {
    expectCompileError("let X = 1; let X = 2");
  });

  it("rejects redefining a bare declaration over a let", () => {
    expectCompileError("let X = 1; X = 2");
  });

  it("rejects shadowing a let variable in a nested block", () => {
    expectCompileError("let X = 1; { let X = 2 }");
  });

  it("rejects reassigning a bare declaration", () => {
    expectCompileError("X = 1; X := 2");
  });

  it("rejects reassigning a const declaration", () => {
    expectCompileError("const X = 1; X := 2");
  });

  it("rejects reassigning an undeclared identifier", () => {
    expectCompileError("X := 2");
  });

  it("rejects assigning a string to an integer let", () => {
    expectCompileError('let X = 1; X := "hi"');
  });

  it("rejects assigning a boolean to an integer let", () => {
    expectCompileError("let X = 1; X := true");
  });

  it("rejects changing a string let to an integer", () => {
    expectCompileError('let s = "hi"; s := 3');
  });

  it("rejects a const initialized with a runtime value", () => {
    expectCompileError("let Y = 1; const X = Y; print(X)");
  });

  it("rejects a runtime number as an if condition", () => {
    expectCompileError('let X = 1; if (X) { print("a") }');
  });

  it("rejects using a runtime string in an integer expression", () => {
    expectCompileError('let s = "hi"; print(s + 1)');
  });

  it("rejects comparing a runtime number with a string", () => {
    expectCompileError('let X = 1; print(X == "1")');
  });

  it("rejects using a block-scoped let outside its block", () => {
    expectCompileError("{ let X = 2 } print(X)");
  });
});
