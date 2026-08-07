import { describe, it } from "bun:test";

import { expectCompileError, expectCompilesTo } from "./helpers";

describe("compileSourceToExecutable", () => {
  it("skips a false condition without an else", () => {
    expectCompilesTo('if (false) { print("yes") }', "{}");
  });

  it("folds a true branch to the same binary as its body", () => {
    expectCompilesTo(
      'if (true) { print("a") } else { print("b") }',
      'print("a")',
    );
  });

  it("prunes a dead false branch from the binary", () => {
    expectCompilesTo(
      'if (false) { print("a") } else { print("b") }',
      'print("b")',
    );
  });

  it("uses an arithmetic comparison as the condition", () => {
    expectCompilesTo('if (1 + 1 == 2) { print("y") }', 'print("y")');
  });

  it("uses a folded constant comparison as the condition", () => {
    expectCompilesTo('X = 1; if (X == 1) { print("y") }', 'print("y")');
  });

  it("uses a boolean constant as the condition", () => {
    expectCompilesTo('FLAG = true; if (FLAG) { print("y") }', 'print("y")');
  });

  it("takes the first matching branch in an else if chain", () => {
    expectCompilesTo(
      'if (1 == 2) { print("a") } else if (1 == 1) { print("b") } else { print("c") }',
      'print("b")',
    );
  });

  it("takes the final else in an else if chain", () => {
    expectCompilesTo(
      'if (1 == 2) { print("a") } else if (1 == 3) { print("b") } else { print("c") }',
      'print("c")',
    );
  });

  it("supports nested if statements", () => {
    expectCompilesTo(
      'if (true) { if (false) { print("a") } else { print("b") } }',
      'print("b")',
    );
  });

  it("compiles a multi-statement body", () => {
    expectCompilesTo("if (true) { X = 1; print(X) }", "print(1)");
  });

  it("declares the same constant in both branches", () => {
    expectCompilesTo(
      "if (true) { X = 1; print(X) } else { X = 2; print(X) }",
      "print(1)",
    );
  });

  it("compiles an empty taken branch", () => {
    expectCompilesTo("if (true) {}", "{}");
  });

  it("does not declare constants from a dead branch", () => {
    expectCompilesTo("if (false) { X = 1 }; X = 2; print(X)", "print(2)");
  });

  it("compiles multiple sequential if statements", () => {
    expectCompilesTo(
      'if (true) { print("a") } if (false) { print("b") }',
      'print("a")',
    );
  });

  it("rejects an integer literal as an if condition", () => {
    expectCompileError('if (1) { print("a") }');
  });

  it("rejects a string literal as an if condition", () => {
    expectCompileError('if ("a") { print("a") }');
  });

  it("rejects an integer expression as an if condition", () => {
    expectCompileError('if (1 + 1) { print("a") }');
  });

  it("rejects a number constant as an if condition", () => {
    expectCompileError('X = 5; if (X) { print("a") }');
  });

  it("rejects an undeclared identifier as an if condition", () => {
    expectCompileError('if (X) { print("a") }');
  });

  it("rejects an if statement without braces", () => {
    expectCompileError('if (true) print("a")');
  });

  it("rejects an if statement without parentheses", () => {
    expectCompileError('if true { print("a") }');
  });

  it("rejects an else without a preceding if body", () => {
    expectCompileError('if (true) else { print("a") }');
  });
});
