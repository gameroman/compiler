import { afterAll, describe, expect, it } from "bun:test";

import { CompilerError } from "#src/errors";

import {
  cleanupCreatedFiles,
  compileSource,
  expectSameBinary,
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
    const folded = compileSource("print(1 == 1)");
    const literal = compileSource("print(true)");

    runAndExpect(folded, "true\r\n");
    runAndExpect(literal, "true\r\n");

    expectSameBinary(folded, literal);
  });

  it("prints false for an unsatisfied equality comparison", () => {
    const outputFile = compileSource("print(1 == 2)");

    runAndExpect(outputFile, "false\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"41f3343152b3fbb27ec08c5e8787bb1e2f8f09e1c82a45f1835985d18a4e1272"`,
    );
  });

  it("folds an unsatisfied equality to the same binary as its literal", () => {
    const folded = compileSource("print(1 == 2)");
    const literal = compileSource("print(false)");

    runAndExpect(folded, "false\r\n");
    runAndExpect(literal, "false\r\n");

    expectSameBinary(folded, literal);
  });

  it("prints the result of an inequality comparison", () => {
    const outputFile = compileSource("print(1 != 2)");

    runAndExpect(outputFile, "true\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"72b2a8ffef50f0534c45bc0df5a2d7a19625841c11f012433e8f99de6d5542f7"`,
    );
  });

  it("prints false when inequality is not satisfied", () => {
    const outputFile = compileSource("print(2 != 2)");

    runAndExpect(outputFile, "false\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"41f3343152b3fbb27ec08c5e8787bb1e2f8f09e1c82a45f1835985d18a4e1272"`,
    );
  });

  it("compares booleans with equality", () => {
    const outputFile = compileSource("print(true == true)");

    runAndExpect(outputFile, "true\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"72b2a8ffef50f0534c45bc0df5a2d7a19625841c11f012433e8f99de6d5542f7"`,
    );
  });

  it("compares strings with equality", () => {
    const outputFile = compileSource('print("a" == "a")');

    runAndExpect(outputFile, "true\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"72b2a8ffef50f0534c45bc0df5a2d7a19625841c11f012433e8f99de6d5542f7"`,
    );
  });

  it("evaluates comparisons with arithmetic precedence", () => {
    const outputFile = compileSource("print(1 + 1 == 2)");

    runAndExpect(outputFile, "true\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"72b2a8ffef50f0534c45bc0df5a2d7a19625841c11f012433e8f99de6d5542f7"`,
    );
  });

  it("folds a comparison constant to the same binary as its literal", () => {
    const folded = compileSource("X = 1 + 1 == 2; print(X)");
    const literal = compileSource("print(true)");

    runAndExpect(folded, "true\r\n");
    runAndExpect(literal, "true\r\n");

    expectSameBinary(folded, literal);
  });

  it("compares integer constants", () => {
    const outputFile = compileSource("A = 1; B = 2; print(A != B)");

    runAndExpect(outputFile, "true\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"72b2a8ffef50f0534c45bc0df5a2d7a19625841c11f012433e8f99de6d5542f7"`,
    );
  });

  it("compares a boolean constant to true", () => {
    const outputFile = compileSource("FLAG = true; print(FLAG == true)");

    runAndExpect(outputFile, "true\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"72b2a8ffef50f0534c45bc0df5a2d7a19625841c11f012433e8f99de6d5542f7"`,
    );
  });

  it("compares a string constant to a string literal", () => {
    const outputFile = compileSource('s = "hi"; print(s == "hi")');

    runAndExpect(outputFile, "true\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"72b2a8ffef50f0534c45bc0df5a2d7a19625841c11f012433e8f99de6d5542f7"`,
    );
  });

  it("compares nested comparisons", () => {
    const outputFile = compileSource("print((1 == 1) == true)");

    runAndExpect(outputFile, "true\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"72b2a8ffef50f0534c45bc0df5a2d7a19625841c11f012433e8f99de6d5542f7"`,
    );
  });

  it("compiles a bare comparison statement as an empty program", () => {
    const outputFile = compileSource("1 == 1;");

    runAndExpect(outputFile, "");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"08db888a9aa76055731ce8227c2bce5bee9d1c8b2c1fbe53efe3a027c57fd662"`,
    );
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
    const outputFile = compileSource("print(!false)");

    runAndExpect(outputFile, "true\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"72b2a8ffef50f0534c45bc0df5a2d7a19625841c11f012433e8f99de6d5542f7"`,
    );
  });

  it("folds a negation to the same binary as its literal", () => {
    const folded = compileSource("print(!true)");
    const literal = compileSource("print(false)");

    runAndExpect(folded, "false\r\n");
    runAndExpect(literal, "false\r\n");

    expectSameBinary(folded, literal);
  });

  it("prints a double negation", () => {
    const outputFile = compileSource("print(!!true)");

    runAndExpect(outputFile, "true\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"72b2a8ffef50f0534c45bc0df5a2d7a19625841c11f012433e8f99de6d5542f7"`,
    );
  });

  it("negates a satisfied equality comparison", () => {
    const outputFile = compileSource("print(!(1 == 1))");

    runAndExpect(outputFile, "false\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"41f3343152b3fbb27ec08c5e8787bb1e2f8f09e1c82a45f1835985d18a4e1272"`,
    );
  });

  it("negates an unsatisfied equality comparison", () => {
    const outputFile = compileSource("print(!(1 == 2))");

    runAndExpect(outputFile, "true\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"72b2a8ffef50f0534c45bc0df5a2d7a19625841c11f012433e8f99de6d5542f7"`,
    );
  });

  it("negates a negation of a comparison", () => {
    const outputFile = compileSource("print(!(!(1 == 1)))");

    runAndExpect(outputFile, "true\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"72b2a8ffef50f0534c45bc0df5a2d7a19625841c11f012433e8f99de6d5542f7"`,
    );
  });

  it("evaluates negation before comparison", () => {
    const outputFile = compileSource("print(!true == false)");

    runAndExpect(outputFile, "true\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"72b2a8ffef50f0534c45bc0df5a2d7a19625841c11f012433e8f99de6d5542f7"`,
    );
  });

  it("folds a negated constant to the same binary as its literal", () => {
    const folded = compileSource("X = !true; print(X)");
    const literal = compileSource("print(false)");

    runAndExpect(folded, "false\r\n");
    runAndExpect(literal, "false\r\n");

    expectSameBinary(folded, literal);
  });

  it("negates a boolean constant", () => {
    const outputFile = compileSource("FLAG = false; print(!FLAG)");

    runAndExpect(outputFile, "true\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"72b2a8ffef50f0534c45bc0df5a2d7a19625841c11f012433e8f99de6d5542f7"`,
    );
  });

  it("negates a boolean constant declared inside a block", () => {
    const outputFile = compileSource("{ X = true; print(!X) }");

    runAndExpect(outputFile, "false\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"41f3343152b3fbb27ec08c5e8787bb1e2f8f09e1c82a45f1835985d18a4e1272"`,
    );
  });

  it("compiles a bare negation statement as an empty program", () => {
    const outputFile = compileSource("!true;");

    runAndExpect(outputFile, "");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"08db888a9aa76055731ce8227c2bce5bee9d1c8b2c1fbe53efe3a027c57fd662"`,
    );
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
