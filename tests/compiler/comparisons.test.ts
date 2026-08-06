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
  it("prints the result of an equality comparison", () => {
    const outputFile = compileSource("print(1 == 1)");

    runAndExpect(outputFile, "true\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"72b2a8ffef50f0534c45bc0df5a2d7a19625841c11f012433e8f99de6d5542f7"`,
    );
  });

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
    expect(() => compileSource("print(1 == true)")).toThrow(CompilerError);
  });

  it("rejects comparing a boolean with a string", () => {
    expect(() => compileSource('print(true == "a")')).toThrow(CompilerError);
  });

  it("rejects comparing a number constant with a string literal", () => {
    expect(() => compileSource('X = 5; print(X == "5")')).toThrow(
      CompilerError,
    );
  });

  it("rejects chained comparisons", () => {
    expect(() => compileSource("print(1 == 1 == 1)")).toThrow(CompilerError);
  });

  it("rejects using a comparison in an integer expression", () => {
    expect(() => compileSource("print(1 + (1 == 1))")).toThrow(CompilerError);
  });

  it("rejects comparing an undeclared identifier", () => {
    expect(() => compileSource("print(X == 1)")).toThrow(CompilerError);
  });

  it("prints the negation of true", () => {
    const outputFile = compileSource("print(!true)");

    runAndExpect(outputFile, "false\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"41f3343152b3fbb27ec08c5e8787bb1e2f8f09e1c82a45f1835985d18a4e1272"`,
    );
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
    expect(() => compileSource("print(!1)")).toThrow(CompilerError);
  });

  it("rejects negating a string literal", () => {
    expect(() => compileSource('print(!"a")')).toThrow(CompilerError);
  });

  it("rejects negating an integer expression", () => {
    expect(() => compileSource("print(!(1 + 1))")).toThrow(CompilerError);
  });

  it("rejects using a negation in an integer expression", () => {
    expect(() => compileSource("print(!true + 1)")).toThrow(CompilerError);
  });

  it("rejects negating an integer constant", () => {
    expect(() => compileSource("X = 5; print(!X)")).toThrow(CompilerError);
  });

  it("rejects negating a string constant", () => {
    expect(() => compileSource('s = "a"; print(!s)')).toThrow(CompilerError);
  });

  it("rejects negating an undeclared identifier", () => {
    expect(() => compileSource("print(!X)")).toThrow(CompilerError);
  });
});
