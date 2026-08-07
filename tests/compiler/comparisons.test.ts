import { describe, it } from "bun:test";

import { expectCompileError, expectCompilesTo } from "./helpers";

describe("compileSourceToExecutable", () => {
  it("folds an equality comparison to the same binary as its literal", () => {
    expectCompilesTo("print(1 == 1)", "print(true)");
  });

  it("prints false for an unsatisfied equality comparison", () => {
    expectCompilesTo("print(1 == 2)", "print(false)");
  });

  it("folds an unsatisfied equality to the same binary as its literal", () => {
    expectCompilesTo("print(1 == 2)", "print(false)");
  });

  it("prints the result of an inequality comparison", () => {
    expectCompilesTo("print(1 != 2)", "print(true)");
  });

  it("prints false when inequality is not satisfied", () => {
    expectCompilesTo("print(2 != 2)", "print(false)");
  });

  it("compares booleans with equality", () => {
    expectCompilesTo("print(true == true)", "print(true)");
  });

  it("compares strings with equality", () => {
    expectCompilesTo('print("a" == "a")', "print(true)");
  });

  it("evaluates comparisons with arithmetic precedence", () => {
    expectCompilesTo("print(1 + 1 == 2)", "print(true)");
  });

  it("folds a comparison constant to the same binary as its literal", () => {
    expectCompilesTo("X = 1 + 1 == 2; print(X)", "print(true)");
  });

  it("compares integer constants", () => {
    expectCompilesTo("A = 1; B = 2; print(A != B)", "print(true)");
  });

  it("compares a boolean constant to true", () => {
    expectCompilesTo("FLAG = true; print(FLAG == true)", "print(true)");
  });

  it("compares a string constant to a string literal", () => {
    expectCompilesTo('s = "hi"; print(s == "hi")', "print(true)");
  });

  it("compares nested comparisons", () => {
    expectCompilesTo("print((1 == 1) == true)", "print(true)");
  });

  it("compiles a bare comparison statement as an empty program", () => {
    expectCompilesTo("1 == 1;", ";");
  });

  it("rejects comparing different types with equality", () => {
    expectCompileError("print(1 == true)");
  });

  it("rejects comparing a boolean with a string", () => {
    expectCompileError('print(true == "a")');
  });

  it("rejects comparing a number constant with a string literal", () => {
    expectCompileError('X = 5; print(X == "5")');
  });

  it("rejects chained comparisons", () => {
    expectCompileError("print(1 == 1 == 1)");
  });

  it("rejects using a comparison in an integer expression", () => {
    expectCompileError("print(1 + (1 == 1))");
  });

  it("rejects comparing an undeclared identifier", () => {
    expectCompileError("print(X == 1)");
  });

  it("prints the negation of false", () => {
    expectCompilesTo("print(!false)", "print(true)");
  });

  it("folds a negation to the same binary as its literal", () => {
    expectCompilesTo("print(!true)", "print(false)");
  });

  it("prints a double negation", () => {
    expectCompilesTo("print(!!true)", "print(true)");
  });

  it("negates a satisfied equality comparison", () => {
    expectCompilesTo("print(!(1 == 1))", "print(false)");
  });

  it("negates an unsatisfied equality comparison", () => {
    expectCompilesTo("print(!(1 == 2))", "print(true)");
  });

  it("negates a negation of a comparison", () => {
    expectCompilesTo("print(!(!(1 == 1)))", "print(true)");
  });

  it("evaluates negation before comparison", () => {
    expectCompilesTo("print(!true == false)", "print(true)");
  });

  it("folds a negated constant to the same binary as its literal", () => {
    expectCompilesTo("X = !true; print(X)", "print(false)");
  });

  it("negates a boolean constant", () => {
    expectCompilesTo("FLAG = false; print(!FLAG)", "print(true)");
  });

  it("negates a boolean constant declared inside a block", () => {
    expectCompilesTo("{ X = true; print(!X) }", "print(false)");
  });

  it("compiles a bare negation statement as an empty program", () => {
    expectCompilesTo("!true;", ";");
  });

  it("rejects negating an integer literal", () => {
    expectCompileError("print(!1)");
  });

  it("rejects negating a string literal", () => {
    expectCompileError('print(!"a")');
  });

  it("rejects negating an integer expression", () => {
    expectCompileError("print(!(1 + 1))");
  });

  it("rejects using a negation in an integer expression", () => {
    expectCompileError("print(!true + 1)");
  });

  it("rejects negating an integer constant", () => {
    expectCompileError("X = 5; print(!X)");
  });

  it("rejects negating a string constant", () => {
    expectCompileError('s = "a"; print(!s)');
  });

  it("rejects negating an undeclared identifier", () => {
    expectCompileError("print(!X)");
  });
});
