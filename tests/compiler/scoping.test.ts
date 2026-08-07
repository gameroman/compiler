import { describe, it } from "bun:test";

import { expectCompileError, expectCompilesTo } from "./helpers";

describe("compileSourceToExecutable", () => {
  it("prints a constant declared inside a block", () => {
    expectCompilesTo("{ X = 5; print(X) }", "print(5)");
  });

  it("sees outer constants inside a block", () => {
    expectCompilesTo("X = 5; { print(X) }", "print(5)");
  });

  it("allows redeclaring a constant after its block closes", () => {
    expectCompilesTo("{ X = 2 }; X = 3; print(X)", "print(3)");
  });

  it("lets sibling blocks declare the same constant", () => {
    expectCompilesTo(
      "{ X = 2; print(X) } { X = 5; print(X) }",
      "print(2); print(5)",
    );
  });

  it("supports nested block scopes", () => {
    expectCompilesTo(
      "{ X = 1; { A = 2; print(A) } print(X) }",
      "print(2); print(1)",
    );
  });

  it("supports a constant declared after a nested block", () => {
    expectCompilesTo("{ X = 1; { A = 2 } }; C = 3; print(C)", "print(3)");
  });

  it("compiles an empty block", () => {
    expectCompilesTo("{}", ";");
  });

  it("rejects redefining a visible constant inside a block", () => {
    expectCompileError("X = 1; { X = 2 }");
  });

  it("rejects shadowing in nested blocks", () => {
    expectCompileError("{ X = 1; { X = 2 } }");
  });

  it("rejects using a block-scoped constant outside its block", () => {
    expectCompileError("{ X = 2 } print(X)");
  });

  it("rejects a reference to an undeclared identifier inside a block", () => {
    expectCompileError("{ print(X) }");
  });

  it("rejects an unclosed block", () => {
    expectCompileError("{ X = 1");
  });

  it("rejects a stray closing brace", () => {
    expectCompileError("}");
  });
});
