import { describe, it } from "bun:test";

import { expectCompilesTo } from "./helpers";

describe("compileSourceToExecutable", () => {
  it("prints multiple statements separated by semicolons", () => {
    expectCompilesTo(
      'print("hello"); print("world")',
      'print("hello")\nprint("world")',
    );
  });

  it("folds a constant expression to the same binary as its literal", () => {
    expectCompilesTo("print(1 + 2)", "print(3)");
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
    expectCompilesTo("print(2 * 3 * 4)", "print(24)");
  });

  it("respects multiplication over addition precedence", () => {
    expectCompilesTo("print(1 + 2 * 3)", "print(7)");
  });

  it("respects multiplication over addition precedence on the left", () => {
    expectCompilesTo("print(2 * 3 + 4)", "print(10)");
  });

  it("lets parentheses override multiplication precedence", () => {
    expectCompilesTo("print((1 + 2) * 3)", "print(9)");
  });

  it("multiplies a group against a literal", () => {
    expectCompilesTo("print(3 * (2 + 4))", "print(18)");
  });

  it("prints the result of a subtraction", () => {
    expectCompilesTo("print(10 - 3)", "print(7)");
  });

  it("prints a left-associative subtraction chain", () => {
    expectCompilesTo("print(10 - 3 - 2)", "print(5)");
  });

  it("mixes addition and subtraction left-associatively", () => {
    expectCompilesTo("print(1 - 2 + 3)", "print(2)");
  });

  it("prints a negative subtraction result", () => {
    expectCompilesTo("print(3 - 5)", "print(-2)");
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
    expectCompilesTo("print(2 * -3)", "print(-6)");
  });

  it("prints the value of a constant", () => {
    expectCompilesTo("X = 5; print(X)", "print(5)");
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
