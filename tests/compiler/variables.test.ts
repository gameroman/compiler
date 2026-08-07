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
  it("prints an integer declared with let", () => {
    const outputFile = compileSource("let X = 3; print(X)");

    runAndExpect(outputFile, "3\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"7ac27a7d5296f20267b0b1edf6748ba67a8feba38940f77d709747a30288185f"`,
    );
  });

  it("prints a negative integer declared with let", () => {
    const outputFile = compileSource("let X = -5; print(X)");

    runAndExpect(outputFile, "-5\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"bd1766f5418e611558775dc2bfc1ed39e721fc80efbe337a3eaaf92072805161"`,
    );
  });

  it("computes a runtime expression from a let variable", () => {
    const outputFile = compileSource("let X = 2; let Y = X + 3; print(Y)");

    runAndExpect(outputFile, "5\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"cbe8f25e781f3a41fa8c020031c14732ee74e2ffea95797ecc49dd1e0a4a9869"`,
    );
  });

  it("reassigns an integer with :=", () => {
    const outputFile = compileSource("let X = 1; print(X); X := 2; print(X)");

    runAndExpect(outputFile, "1\r\n2\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"52167ef095420b3379d68c61c700ddd5c4cab65d3f55eb96a979628c0dabebd3"`,
    );
  });

  it("reassigns an integer using an expression", () => {
    const outputFile = compileSource(
      "let X = 1; X := X + 1; X := X * 3; print(X)",
    );

    runAndExpect(outputFile, "6\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"8f646fc4164d0fb3b9655371152b5750041c7a19f6355d2de3b9541211adf807"`,
    );
  });

  it("reassigns a let variable from an outer block", () => {
    const outputFile = compileSource("let X = 1; { X := 2 } print(X)");

    runAndExpect(outputFile, "2\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"149869ab61479ef8f6a157d0e257c3552df469cd95f6fb0b5f3d4353fbaa7276"`,
    );
  });

  it("lets sibling blocks declare the same let variable", () => {
    const outputFile = compileSource(
      "{ let X = 1; print(X) } { let X = 5; print(X) }",
    );

    runAndExpect(outputFile, "1\r\n5\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"7e66805588a2679946105068e46cf109301181671df76ae3e88235cb31f22857"`,
    );
  });

  it("prints a boolean declared with let", () => {
    const outputFile = compileSource("let B = true; print(B)");

    runAndExpect(outputFile, "true\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"1bf968f2241939f36d396020ddf78b0c9894924cf93d1e71a3ccef72b903da00"`,
    );
  });

  it("reassigns a boolean with :=", () => {
    const outputFile = compileSource(
      "let B = true; print(B); B := false; print(B)",
    );

    runAndExpect(outputFile, "true\r\nfalse\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"fe57f9e63d981f358a8b66788c2c4cb348c247dd9bb7dc7785c912efcc48d616"`,
    );
  });

  it("negates a runtime boolean", () => {
    const outputFile = compileSource("let B = false; print(!B)");

    runAndExpect(outputFile, "true\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"3e23f017bf317a115472a7c76dd3e87885f7007e0bfd78ec174848694dfdf360"`,
    );
  });

  it("prints a string declared with let", () => {
    const outputFile = compileSource('let s = "hi"; print(s)');

    runAndExpect(outputFile, "hi\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"b7315ea40fa16a610d6f6729e299b22b1258aa28eb86acd78f4a763ed82a237a"`,
    );
  });

  it("reassigns a string with :=", () => {
    const outputFile = compileSource(
      'let s = "hi"; print(s); s := "bye"; print(s)',
    );

    runAndExpect(outputFile, "hi\r\nbye\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"5bcfd15598bac918da87933c381c2abfe3ef36b308cdc4f9c5b39373e909a695"`,
    );
  });

  it("reassigns a string to a different length", () => {
    const outputFile = compileSource(
      'let s = "a"; print(s); s := "longer"; print(s)',
    );

    runAndExpect(outputFile, "a\r\nlonger\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"82b1f1d6e33d32f070e0b04c16df650f36c908a7e6aadf5aeec4cb8dbf699e36"`,
    );
  });

  it("copies a runtime string into another let variable", () => {
    const outputFile = compileSource('let s = "hi"; let t = s; print(t)');

    runAndExpect(outputFile, "hi\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"f85a37213effe51e19586454e72552f85f67fb6c010d3cea79b613547ae0e667"`,
    );
  });

  it("compares two runtime integers", () => {
    const outputFile = compileSource("let A = 1; let B = 2; print(A == B)");

    runAndExpect(outputFile, "false\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"6018bf72f147ef7005d2d92358242ae89adcef0ffdf6cbd37f18df079eb83b45"`,
    );
  });

  it("compares two equal runtime integers", () => {
    const outputFile = compileSource("let A = 3; let B = 3; print(A != B)");

    runAndExpect(outputFile, "false\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"7d0e3852f0e8ea2a96741f1c2666e7b4b3d258cfb81d5f80e53d83f76bb59825"`,
    );
  });

  it("compares a runtime string to a literal by content", () => {
    const outputFile = compileSource('let s = "hi"; print(s == "hi")');

    runAndExpect(outputFile, "true\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"926988e2626e6fa65351ba325b3ed511a1e972ab096112df209456bc461a197d"`,
    );
  });

  it("runs the taken branch for a runtime condition", () => {
    const outputFile = compileSource(
      'let X = 3; if (X == 3) { print("eq") } else { print("ne") }',
    );

    runAndExpect(outputFile, "eq\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"750b13578edff60f6abf56f17df69f389f230e83fb1fe1b0d0a09b242992d769"`,
    );
  });

  it("runs the else branch when a runtime condition is false", () => {
    const outputFile = compileSource(
      'let X = 4; if (X == 3) { print("eq") } else { print("ne") }',
    );

    runAndExpect(outputFile, "ne\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"68c9992cb1b1140a737cad4d942d5320df16f41d7300eaee868dda6d5c08608e"`,
    );
  });

  it("uses a runtime boolean variable as an if condition", () => {
    const outputFile = compileSource(
      'let FLAG = true; if (FLAG) { print("y") }',
    );

    runAndExpect(outputFile, "y\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"bf0d028dcc1e1b4cfc4660a04a025295f5b22ddf55be7b694314fa7cb6c3d4ec"`,
    );
  });

  it("uses a runtime negation as an if condition", () => {
    const outputFile = compileSource(
      'let FLAG = false; if (!FLAG) { print("y") }',
    );

    runAndExpect(outputFile, "y\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"d516a694f4d7b599b25f65edd0f984c0e1044c9b55dc99adb4f7d9351d67186f"`,
    );
  });

  it("takes the first matching branch in a runtime else if chain", () => {
    const outputFile = compileSource(
      'let X = 2; if (X == 1) { print("a") } else if (X == 2) { print("b") } else { print("c") }',
    );

    runAndExpect(outputFile, "b\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"605f9de749d264539cf83d675dffa8f0cd934b50391976da6b8a52d23f5797b7"`,
    );
  });

  it("takes the final else in a runtime else if chain", () => {
    const outputFile = compileSource(
      'let X = 9; if (X == 1) { print("a") } else if (X == 2) { print("b") } else { print("c") }',
    );

    runAndExpect(outputFile, "c\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"b3f3b78b7d163edb3f9a0695afe8600dd71ad363ee15f9f6231b6731acae5be2"`,
    );
  });

  it("supports nested runtime if statements", () => {
    const outputFile = compileSource(
      'let X = 3; if (X == 3) { if (X != 4) { print("a") } } else { print("b") }',
    );

    runAndExpect(outputFile, "a\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"1158de72384545e9597c3b8b3a03f40fb0a84d59315787b9feaf2a37bb4c6a95"`,
    );
  });

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

  it("lets a bare declaration hold a runtime value", () => {
    const outputFile = compileSource("let Y = 1; X = Y; print(X)");

    runAndExpect(outputFile, "1\r\n");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"c3c1a96d82d9749960ea0edc4289ebed65c7b4998ba9a002c168a23050e42e1e"`,
    );
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
