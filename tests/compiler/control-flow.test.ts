import { afterAll, describe, expect, it } from "bun:test";

import {
  cleanupCreatedFiles,
  compileSource,
  expectCompileError,
  expectCompilesTo,
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
    expectCompilesTo('if (false) { print("yes") }', "{}");
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
    expectCompilesTo(
      'if (true) { if (false) { print("a") } else { print("b") } }',
      'print("b")',
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
