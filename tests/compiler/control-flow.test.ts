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
  it("runs the taken branch", () => {
    const outputFile = compileSource('if (true) { print("yes") }');

    runAndExpect(outputFile, "yes\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"4dfacd3113bdd7d13539415a4d2daffcd4a39c164d4c215eb580299a6944073e"`,
    );
  });

  it("skips a false condition without an else", () => {
    const outputFile = compileSource('if (false) { print("yes") }');

    runAndExpect(outputFile, "");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"08db888a9aa76055731ce8227c2bce5bee9d1c8b2c1fbe53efe3a027c57fd662"`,
    );
  });

  it("runs the then branch over the else branch", () => {
    const outputFile = compileSource(
      'if (true) { print("a") } else { print("b") }',
    );

    runAndExpect(outputFile, "a\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"6dcf40f39b5d68ad4b00de89e01f4bb2b06b26be3712aac8bebd3c5d037d9049"`,
    );
  });

  it("runs the else branch when the condition is false", () => {
    const outputFile = compileSource(
      'if (false) { print("a") } else { print("b") }',
    );

    runAndExpect(outputFile, "b\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"e28809dc519a60cd4f2ed4d5a3ddceb9cf72c3042b8abba379534394371d884d"`,
    );
  });

  it("folds a true branch to the same binary as its body", () => {
    const branched = compileSource(
      'if (true) { print("a") } else { print("b") }',
    );
    const direct = compileSource('print("a")');

    runAndExpect(branched, "a\r\n");
    runAndExpect(direct, "a\r\n");

    expectSameBinary(branched, direct);
  });

  it("prunes a dead false branch from the binary", () => {
    const branched = compileSource(
      'if (false) { print("a") } else { print("b") }',
    );
    const direct = compileSource('print("b")');

    runAndExpect(branched, "b\r\n");
    runAndExpect(direct, "b\r\n");

    expectSameBinary(branched, direct);
  });

  it("uses a comparison as the condition", () => {
    const outputFile = compileSource('if (1 == 1) { print("eq") }');

    runAndExpect(outputFile, "eq\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"36fe6c0e5abd3acf0f5e3248476ab11d7e29ce1eaa8e3088687a7870c1b3a01c"`,
    );
  });

  it("uses a negation as the condition", () => {
    const outputFile = compileSource('if (!false) { print("y") }');

    runAndExpect(outputFile, "y\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"b932e20ef7e7796964f20ac6dd14304798125e4c78a1df1e79b9147d3cf9c820"`,
    );
  });

  it("uses an arithmetic comparison as the condition", () => {
    const outputFile = compileSource('if (1 + 1 == 2) { print("y") }');

    runAndExpect(outputFile, "y\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"b932e20ef7e7796964f20ac6dd14304798125e4c78a1df1e79b9147d3cf9c820"`,
    );
  });

  it("uses a folded constant comparison as the condition", () => {
    const outputFile = compileSource('X = 1; if (X == 1) { print("y") }');

    runAndExpect(outputFile, "y\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"b932e20ef7e7796964f20ac6dd14304798125e4c78a1df1e79b9147d3cf9c820"`,
    );
  });

  it("uses a boolean constant as the condition", () => {
    const outputFile = compileSource('FLAG = true; if (FLAG) { print("y") }');

    runAndExpect(outputFile, "y\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"b932e20ef7e7796964f20ac6dd14304798125e4c78a1df1e79b9147d3cf9c820"`,
    );
  });

  it("takes the first matching branch in an else if chain", () => {
    const outputFile = compileSource(
      'if (1 == 2) { print("a") } else if (1 == 1) { print("b") } else { print("c") }',
    );

    runAndExpect(outputFile, "b\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"e28809dc519a60cd4f2ed4d5a3ddceb9cf72c3042b8abba379534394371d884d"`,
    );
  });

  it("takes the final else in an else if chain", () => {
    const outputFile = compileSource(
      'if (1 == 2) { print("a") } else if (1 == 3) { print("b") } else { print("c") }',
    );

    runAndExpect(outputFile, "c\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"a12a630a92a5a9d7ac29178cd482d05ff11d7fe6833748948306d8ad7cca028a"`,
    );
  });

  it("supports nested if statements", () => {
    const outputFile = compileSource(
      'if (true) { if (false) { print("a") } else { print("b") } }',
    );

    runAndExpect(outputFile, "b\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"e28809dc519a60cd4f2ed4d5a3ddceb9cf72c3042b8abba379534394371d884d"`,
    );
  });

  it("compiles a multi-statement body", () => {
    const outputFile = compileSource("if (true) { X = 1; print(X) }");

    runAndExpect(outputFile, "1\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"c2f25cd94b736545ae039d504bece75841a219b206a831b56b79fc8389a38020"`,
    );
  });

  it("declares the same constant in both branches", () => {
    const outputFile = compileSource(
      "if (true) { X = 1; print(X) } else { X = 2; print(X) }",
    );

    runAndExpect(outputFile, "1\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"c2f25cd94b736545ae039d504bece75841a219b206a831b56b79fc8389a38020"`,
    );
  });

  it("compiles an empty taken branch", () => {
    const outputFile = compileSource("if (true) {}");

    runAndExpect(outputFile, "");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"08db888a9aa76055731ce8227c2bce5bee9d1c8b2c1fbe53efe3a027c57fd662"`,
    );
  });

  it("does not declare constants from a dead branch", () => {
    const outputFile = compileSource("if (false) { X = 1 }; X = 2; print(X)");

    runAndExpect(outputFile, "2\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"776b62395eca59e2e86482b25df16bd58ca279b4cbdf824e71ca49d6f7c0593c"`,
    );
  });

  it("compiles multiple sequential if statements", () => {
    const outputFile = compileSource(
      'if (true) { print("a") } if (false) { print("b") }',
    );

    runAndExpect(outputFile, "a\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"6dcf40f39b5d68ad4b00de89e01f4bb2b06b26be3712aac8bebd3c5d037d9049"`,
    );
  });

  it("rejects an integer literal as an if condition", () => {
    expect(() => compileSource('if (1) { print("a") }')).toThrow(CompilerError);
  });

  it("rejects a string literal as an if condition", () => {
    expect(() => compileSource('if ("a") { print("a") }')).toThrow(
      CompilerError,
    );
  });

  it("rejects an integer expression as an if condition", () => {
    expect(() => compileSource('if (1 + 1) { print("a") }')).toThrow(
      CompilerError,
    );
  });

  it("rejects a number constant as an if condition", () => {
    expect(() => compileSource('X = 5; if (X) { print("a") }')).toThrow(
      CompilerError,
    );
  });

  it("rejects an undeclared identifier as an if condition", () => {
    expect(() => compileSource('if (X) { print("a") }')).toThrow(CompilerError);
  });

  it("rejects an if statement without braces", () => {
    expect(() => compileSource('if (true) print("a")')).toThrow(CompilerError);
  });

  it("rejects an if statement without parentheses", () => {
    expect(() => compileSource('if true { print("a") }')).toThrow(
      CompilerError,
    );
  });

  it("rejects an else without a preceding if body", () => {
    expect(() => compileSource('if (true) else { print("a") }')).toThrow(
      CompilerError,
    );
  });
});
