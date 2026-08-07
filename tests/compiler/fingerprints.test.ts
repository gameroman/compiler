import { describe, expect, it } from "bun:test";
import { createHash } from "node:crypto";

import { compileSourceToBytes } from "#src";
import type { Eol, Target } from "#src";

function fingerprint(source: string, target: Target, eol?: Eol) {
  const bytes = compileSourceToBytes(source, { target, eol });
  return {
    size: bytes.byteLength,
    hash: createHash("sha256").update(bytes).digest("hex"),
  };
}

describe("binary fingerprints", () => {
  it("windows-x86-64: prints true", () => {
    const { size, hash } = fingerprint("print(true)", "windows-x86-64");
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"72b2a8ffef50f0534c45bc0df5a2d7a19625841c11f012433e8f99de6d5542f7"`,
    );
  });

  it("windows-x86-64: prints false", () => {
    const { size, hash } = fingerprint("print(false)", "windows-x86-64");
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"41f3343152b3fbb27ec08c5e8787bb1e2f8f09e1c82a45f1835985d18a4e1272"`,
    );
  });

  it("windows-x86-64: empty expression", () => {
    const { size, hash } = fingerprint("", "windows-x86-64", undefined);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"08db888a9aa76055731ce8227c2bce5bee9d1c8b2c1fbe53efe3a027c57fd662"`,
    );
  });

  it("windows-x86-64: prints a string constant", () => {
    const { size, hash } = fingerprint('s = "hi"; print(s)', "windows-x86-64");
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"f6fa5e623c0cdd84569cc6fc50bc168f431b515dff32da69a85f580d32d20149"`,
    );
  });

  it("windows-x86-64: prints a parenthesized integer constant", () => {
    const { size, hash } = fingerprint("X = (2); print(X)", "windows-x86-64");
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"776b62395eca59e2e86482b25df16bd58ca279b4cbdf824e71ca49d6f7c0593c"`,
    );
  });

  it("windows-x86-64: prints an integer with let", () => {
    const { size, hash } = fingerprint("let X = 3; print(X)", "windows-x86-64");
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"7ac27a7d5296f20267b0b1edf6748ba67a8feba38940f77d709747a30288185f"`,
    );
  });

  it("windows-x86-64: prints a negative integer", () => {
    const { size, hash } = fingerprint(
      "let X = -5; print(X)",
      "windows-x86-64",
    );
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"bd1766f5418e611558775dc2bfc1ed39e721fc80efbe337a3eaaf92072805161"`,
    );
  });

  it("windows-x86-64: computes a runtime expression", () => {
    const { size, hash } = fingerprint(
      "let X = 2; let Y = X + 3; print(Y)",
      "windows-x86-64",
    );
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"cbe8f25e781f3a41fa8c020031c14732ee74e2ffea95797ecc49dd1e0a4a9869"`,
    );
  });

  it("windows-x86-64: reassigns an integer", () => {
    const { size, hash } = fingerprint(
      "let X = 1; print(X); X := 2; print(X)",
      "windows-x86-64",
    );
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"52167ef095420b3379d68c61c700ddd5c4cab65d3f55eb96a979628c0dabebd3"`,
    );
  });

  it("windows-x86-64: reassigns using an expression", () => {
    const { size, hash } = fingerprint(
      "let X = 1; X := X + 1; X := X * 3; print(X)",
      "windows-x86-64",
    );
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"8f646fc4164d0fb3b9655371152b5750041c7a19f6355d2de3b9541211adf807"`,
    );
  });

  it("windows-x86-64: reassigns a let from an outer block", () => {
    const { size, hash } = fingerprint(
      "let X = 1; { X := 2 } print(X)",
      "windows-x86-64",
    );
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"149869ab61479ef8f6a157d0e257c3552df469cd95f6fb0b5f3d4353fbaa7276"`,
    );
  });

  it("windows-x86-64: sibling let blocks", () => {
    const { size, hash } = fingerprint(
      "{ let X = 1; print(X) } { let X = 5; print(X) }",
      "windows-x86-64",
    );
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"7e66805588a2679946105068e46cf109301181671df76ae3e88235cb31f22857"`,
    );
  });

  it("windows-x86-64: prints a boolean with let", () => {
    const { size, hash } = fingerprint(
      "let B = true; print(B)",
      "windows-x86-64",
    );
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"1bf968f2241939f36d396020ddf78b0c9894924cf93d1e71a3ccef72b903da00"`,
    );
  });

  it("windows-x86-64: reassigns a boolean", () => {
    const { size, hash } = fingerprint(
      "let B = true; print(B); B := false; print(B)",
      "windows-x86-64",
    );
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"fe57f9e63d981f358a8b66788c2c4cb348c247dd9bb7dc7785c912efcc48d616"`,
    );
  });

  it("windows-x86-64: negates a runtime boolean", () => {
    const { size, hash } = fingerprint(
      "let B = false; print(!B)",
      "windows-x86-64",
    );
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"3e23f017bf317a115472a7c76dd3e87885f7007e0bfd78ec174848694dfdf360"`,
    );
  });

  it("windows-x86-64: prints a string with let", () => {
    const { size, hash } = fingerprint(
      'let s = "hi"; print(s)',
      "windows-x86-64",
    );
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"b7315ea40fa16a610d6f6729e299b22b1258aa28eb86acd78f4a763ed82a237a"`,
    );
  });

  it("windows-x86-64: reassigns a string", () => {
    const { size, hash } = fingerprint(
      'let s = "hi"; print(s); s := "bye"; print(s)',
      "windows-x86-64",
    );
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"5bcfd15598bac918da87933c381c2abfe3ef36b308cdc4f9c5b39373e909a695"`,
    );
  });

  it("windows-x86-64: reassigns a string to a different length", () => {
    const { size, hash } = fingerprint(
      'let s = "a"; print(s); s := "longer"; print(s)',
      "windows-x86-64",
    );
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"82b1f1d6e33d32f070e0b04c16df650f36c908a7e6aadf5aeec4cb8dbf699e36"`,
    );
  });

  it("windows-x86-64: copies a runtime string", () => {
    const { size, hash } = fingerprint(
      'let s = "hi"; let t = s; print(t)',
      "windows-x86-64",
    );
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"f85a37213effe51e19586454e72552f85f67fb6c010d3cea79b613547ae0e667"`,
    );
  });

  it("windows-x86-64: compares two runtime integers", () => {
    const { size, hash } = fingerprint(
      "let A = 1; let B = 2; print(A == B)",
      "windows-x86-64",
    );
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"6018bf72f147ef7005d2d92358242ae89adcef0ffdf6cbd37f18df079eb83b45"`,
    );
  });

  it("windows-x86-64: compares equal runtime integers", () => {
    const { size, hash } = fingerprint(
      "let A = 3; let B = 3; print(A != B)",
      "windows-x86-64",
    );
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"7d0e3852f0e8ea2a96741f1c2666e7b4b3d258cfb81d5f80e53d83f76bb59825"`,
    );
  });

  it("windows-x86-64: compares a runtime string by content", () => {
    const { size, hash } = fingerprint(
      'let s = "hi"; print(s == "hi")',
      "windows-x86-64",
    );
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"926988e2626e6fa65351ba325b3ed511a1e972ab096112df209456bc461a197d"`,
    );
  });

  it("windows-x86-64: runs the taken branch for a runtime condition", () => {
    const { size, hash } = fingerprint(
      'let X = 3; if (X == 3) { print("eq") } else { print("ne") }',
      "windows-x86-64",
    );
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"750b13578edff60f6abf56f17df69f389f230e83fb1fe1b0d0a09b242992d769"`,
    );
  });

  it("windows-x86-64: runs the else branch for a runtime condition", () => {
    const { size, hash } = fingerprint(
      'let X = 4; if (X == 3) { print("eq") } else { print("ne") }',
      "windows-x86-64",
    );
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"68c9992cb1b1140a737cad4d942d5320df16f41d7300eaee868dda6d5c08608e"`,
    );
  });

  it("windows-x86-64: uses a runtime boolean as an if condition", () => {
    const { size, hash } = fingerprint(
      'let FLAG = true; if (FLAG) { print("y") }',
      "windows-x86-64",
    );
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"bf0d028dcc1e1b4cfc4660a04a025295f5b22ddf55be7b694314fa7cb6c3d4ec"`,
    );
  });

  it("windows-x86-64: uses a runtime negation as an if condition", () => {
    const { size, hash } = fingerprint(
      'let FLAG = false; if (!FLAG) { print("y") }',
      "windows-x86-64",
    );
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"d516a694f4d7b599b25f65edd0f984c0e1044c9b55dc99adb4f7d9351d67186f"`,
    );
  });

  it("windows-x86-64: first matching branch in a runtime else if chain", () => {
    const { size, hash } = fingerprint(
      'let X = 2; if (X == 1) { print("a") } else if (X == 2) { print("b") } else { print("c") }',
      "windows-x86-64",
    );
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"605f9de749d264539cf83d675dffa8f0cd934b50391976da6b8a52d23f5797b7"`,
    );
  });

  it("windows-x86-64: final else in a runtime else if chain", () => {
    const { size, hash } = fingerprint(
      'let X = 9; if (X == 1) { print("a") } else if (X == 2) { print("b") } else { print("c") }',
      "windows-x86-64",
    );
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"b3f3b78b7d163edb3f9a0695afe8600dd71ad363ee15f9f6231b6731acae5be2"`,
    );
  });

  it("windows-x86-64: nested runtime if statements", () => {
    const { size, hash } = fingerprint(
      'let X = 3; if (X == 3) { if (X != 4) { print("a") } } else { print("b") }',
      "windows-x86-64",
    );
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"1158de72384545e9597c3b8b3a03f40fb0a84d59315787b9feaf2a37bb4c6a95"`,
    );
  });

  it("windows-x86-64: bare declaration holds a runtime value", () => {
    const { size, hash } = fingerprint(
      "let Y = 1; X = Y; print(X)",
      "windows-x86-64",
    );
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"c3c1a96d82d9749960ea0edc4289ebed65c7b4998ba9a002c168a23050e42e1e"`,
    );
  });

  it("windows-x86-64: prints hello world", () => {
    const { size, hash } = fingerprint(
      'print("hello world")',
      "windows-x86-64",
    );
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"7a6b94a13cb8ed26aa1f30fef2024a67abf90ee8b56125f251c70c61c2d88d16"`,
    );
  });

  it("windows-x86-64: prints an integer", () => {
    const { size, hash } = fingerprint("print(42)", "windows-x86-64");
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"90337331e95fa12bf581c41b2797c7876ed193d312178074d65e275c2dae0f6d"`,
    );
  });

  it("windows-x86-64: prints multiple statements on separate lines", () => {
    const { size, hash } = fingerprint(
      'print("hello")\nprint("world")',
      "windows-x86-64",
    );
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"cfd3121cd78ea9ab98c02b41baf25da4dc5d8d6d3d6d147a50988a8728b3b1bc"`,
    );
  });

  it("windows-x86-64: mixes string and integer prints", () => {
    const { size, hash } = fingerprint(
      'print("n="); print(42)',
      "windows-x86-64",
    );
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"86065e10403a1df01e6638b903ec3ecc306843de698ed767136ee9cdef1b4033"`,
    );
  });

  it("windows-x86-64: prints a string with lf eol", () => {
    const { size, hash } = fingerprint('print("hi")', "windows-x86-64", "lf");
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"f0ea27136c9aefbab45e260dea9a29bb5f0b1085c74ad7cba01b9372425da410"`,
    );
  });

  it("windows-x86-64: prints an integer with lf eol", () => {
    const { size, hash } = fingerprint("print(42)", "windows-x86-64", "lf");
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"9622985939aed323c98c226e0976739a5682942d809b998519a33d8487f66586"`,
    );
  });

  it("windows-x86-64: prints an addition result", () => {
    const { size, hash } = fingerprint("print(1 + 2)", "windows-x86-64");
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"33001d64cd13b259a887982a14d3da2c791e85d1aae1889850a845980016b8d8"`,
    );
  });

  it("windows-x86-64: keeps 64-bit precision on overflow", () => {
    const { size, hash } = fingerprint(
      "print(2147483647 + 1)",
      "windows-x86-64",
    );
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"4f0441805f3c7bf2e65e03b904c4037112f72f19656a797a601e7a2613bb6c14"`,
    );
  });

  it("windows-x86-64: left-associative addition", () => {
    const { size, hash } = fingerprint("print(1 + 2 + 3)", "windows-x86-64");
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"34c12a80647a1c69deea7685139665a5ccb92b8e1a23b86550c3814db3121db2"`,
    );
  });

  it("windows-x86-64: left-associative multiplication", () => {
    const { size, hash } = fingerprint("print(2 * 3 * 4)", "windows-x86-64");
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"f8acf64a402153f41362a37678ed0b8ac8e43c3513e9b90424e3cccf2b195a54"`,
    );
  });

  it("windows-x86-64: multiplication over addition precedence", () => {
    const { size, hash } = fingerprint("print(1 + 2 * 3)", "windows-x86-64");
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"4ff9b97fd3f6d725978c6aa8589bd86d0dea6d1863e82a6f6063bdcb62a37eed"`,
    );
  });

  it("windows-x86-64: multiplication over addition precedence on the left", () => {
    const { size, hash } = fingerprint("print(2 * 3 + 4)", "windows-x86-64");
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"0a4d435d6e40e5e24d0d762f53028abe938081056834409ec3b003dfc0d2eab6"`,
    );
  });

  it("windows-x86-64: parentheses override multiplication precedence", () => {
    const { size, hash } = fingerprint("print((1 + 2) * 3)", "windows-x86-64");
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"88fd5833555115d81dff58ada875bc7c64c9fc618a30a0896d67f742086d00ec"`,
    );
  });

  it("windows-x86-64: multiplies a group against a literal", () => {
    const { size, hash } = fingerprint("print(3 * (2 + 4))", "windows-x86-64");
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"0450b242aae7a163847e0e80b1e66c5f7de8ed117155535150eca7a9226594b9"`,
    );
  });

  it("windows-x86-64: prints a negative subtraction result", () => {
    const { size, hash } = fingerprint("print(3 - 5)", "windows-x86-64");
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"54e87444e161d5278b0c747ebe4b4aec7f801146eb3e8135530ee32d38b31f52"`,
    );
  });

  it("windows-x86-64: prints a negative literal", () => {
    const { size, hash } = fingerprint("print(-5)", "windows-x86-64");
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"0ba8f524ab9c41862c727c22ddb30f7bbec7ee388c7e6927ec9cc01f4530b446"`,
    );
  });

  it("windows-x86-64: multiplies by a negative operand", () => {
    const { size, hash } = fingerprint("print(2 * -3)", "windows-x86-64");
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"e1b8efbdc37323128a16c92b03bf634adb65cdbe6385112481703a18cf53821d"`,
    );
  });

  it("windows-x86-64: prints the value of a constant", () => {
    const { size, hash } = fingerprint("X = 5; print(X)", "windows-x86-64");
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"1a97d8c031f0bfdb61f7961359218ead1c7111e2ecaafdaf6407cbf437b6cc5f"`,
    );
  });

  it("windows-x86-64: runs the taken branch", () => {
    const { size, hash } = fingerprint(
      'if (true) { print("yes") }',
      "windows-x86-64",
    );
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"4dfacd3113bdd7d13539415a4d2daffcd4a39c164d4c215eb580299a6944073e"`,
    );
  });

  it("windows-x86-64: runs the then branch over the else branch", () => {
    const { size, hash } = fingerprint(
      'if (true) { print("a") } else { print("b") }',
      "windows-x86-64",
    );
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"6dcf40f39b5d68ad4b00de89e01f4bb2b06b26be3712aac8bebd3c5d037d9049"`,
    );
  });

  it("windows-x86-64: runs the else branch when the condition is false", () => {
    const { size, hash } = fingerprint(
      'if (false) { print("a") } else { print("b") }',
      "windows-x86-64",
    );
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"e28809dc519a60cd4f2ed4d5a3ddceb9cf72c3042b8abba379534394371d884d"`,
    );
  });

  it("windows-x86-64: uses a comparison as the condition", () => {
    const { size, hash } = fingerprint(
      'if (1 == 1) { print("eq") }',
      "windows-x86-64",
    );
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"36fe6c0e5abd3acf0f5e3248476ab11d7e29ce1eaa8e3088687a7870c1b3a01c"`,
    );
  });

  it("windows-x86-64: uses a negation as the condition", () => {
    const { size, hash } = fingerprint(
      'if (!false) { print("y") }',
      "windows-x86-64",
    );
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"b932e20ef7e7796964f20ac6dd14304798125e4c78a1df1e79b9147d3cf9c820"`,
    );
  });

  it("windows-x86-64: final else in an else if chain", () => {
    const { size, hash } = fingerprint(
      'if (1 == 2) { print("a") } else if (1 == 3) { print("b") } else { print("c") }',
      "windows-x86-64",
    );
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"a12a630a92a5a9d7ac29178cd482d05ff11d7fe6833748948306d8ad7cca028a"`,
    );
  });

  it("windows-x86-64: compiles a multi-statement body", () => {
    const { size, hash } = fingerprint(
      "if (true) { X = 1; print(X) }",
      "windows-x86-64",
    );
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"c2f25cd94b736545ae039d504bece75841a219b206a831b56b79fc8389a38020"`,
    );
  });

  it("windows-x86-64: sibling constant blocks", () => {
    const { size, hash } = fingerprint(
      "{ X = 2; print(X) } { X = 5; print(X) }",
      "windows-x86-64",
    );
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"de4c759c52939e6bd9937ac97a261dbd0f12dbd957b903b4c01faf51a2883c00"`,
    );
  });

  it("windows-x86-64: nested block scopes", () => {
    const { size, hash } = fingerprint(
      "{ X = 1; { A = 2; print(A) } print(X) }",
      "windows-x86-64",
    );
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"4d76e05910181faa411419ca05cd6a14ce20f429c6447f768e17090b0f89ac6c"`,
    );
  });

  it("windows-x86-64: prints a newline for an empty print", () => {
    const { size, hash } = fingerprint("print()", "windows-x86-64", undefined);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"9a7bb965268a3497064d969469bd7bbee644a3957a1a3023920e6cbb0ac0a790"`,
    );
  });

  it("windows-x86-64: prints a newline for an empty print with lf eol", () => {
    const { size, hash } = fingerprint("print()", "windows-x86-64", "lf");
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"d9415ac4b252274b9ccf8489470f365502414d29d988485cd0e6bc5c1bccf2b4"`,
    );
  });

  it("linux-x86-64: prints true", () => {
    const { size, hash } = fingerprint("print(true)", "linux-x86-64");
    expect(size).toMatchInlineSnapshot(`8704`);
    expect(hash).toMatchInlineSnapshot(
      `"c0e4f95faab4d83280799363fdc6e329d220bd755599d326386861653469504a"`,
    );
  });

  it("linux-x86-64: prints false", () => {
    const { size, hash } = fingerprint("print(false)", "linux-x86-64");
    expect(size).toMatchInlineSnapshot(`8704`);
    expect(hash).toMatchInlineSnapshot(
      `"743c362c4581cccd6a1b428f1995ff1e2998f1845fecc5e9635374ffcc2c3bbb"`,
    );
  });

  it("linux-x86-64: bare boolean expression", () => {
    const { size, hash } = fingerprint("true;", "linux-x86-64", undefined);
    expect(size).toMatchInlineSnapshot(`8704`);
    expect(hash).toMatchInlineSnapshot(
      `"274f7c1860ca592a26a700096cc5ce1cb4d3a602f754418270424d27b1c3f829"`,
    );
  });

  it("linux-x86-64: prints a string constant", () => {
    const { size, hash } = fingerprint('s = "hi"; print(s)', "linux-x86-64");
    expect(size).toMatchInlineSnapshot(`8704`);
    expect(hash).toMatchInlineSnapshot(
      `"324e6206d5020d5c3866682257f5a02cb15eb3e45b6144aa35aba8ae9d65f0bd"`,
    );
  });

  it("linux-x86-64: prints a parenthesized integer constant", () => {
    const { size, hash } = fingerprint("X = (2); print(X)", "linux-x86-64");
    expect(size).toMatchInlineSnapshot(`8704`);
    expect(hash).toMatchInlineSnapshot(
      `"f9bfd2cca8fe006f96013537972cc35c11836a5170353dd37dff0e0c82f0bd76"`,
    );
  });

  it("linux-x86-64: prints an integer with let", () => {
    const { size, hash } = fingerprint("let X = 3; print(X)", "linux-x86-64");
    expect(size).toMatchInlineSnapshot(`8704`);
    expect(hash).toMatchInlineSnapshot(
      `"1044e67b591a15067ea44d2c1190b049db3f8b2a577c05663b38fd8330fddf4f"`,
    );
  });

  it("linux-x86-64: prints a negative integer", () => {
    const { size, hash } = fingerprint("let X = -5; print(X)", "linux-x86-64");
    expect(size).toMatchInlineSnapshot(`8704`);
    expect(hash).toMatchInlineSnapshot(
      `"9442510deacc680f05fd1911c57c081f4595ac1a075c70196d18d134eb7ed510"`,
    );
  });

  it("linux-x86-64: computes a runtime expression", () => {
    const { size, hash } = fingerprint(
      "let X = 2; let Y = X + 3; print(Y)",
      "linux-x86-64",
    );
    expect(size).toMatchInlineSnapshot(`8704`);
    expect(hash).toMatchInlineSnapshot(
      `"8aec39adf6ca3ce90bbb5396142e82e8f57d5023b42c61c0a622eb3c6e42bb85"`,
    );
  });

  it("linux-x86-64: reassigns an integer", () => {
    const { size, hash } = fingerprint(
      "let X = 1; print(X); X := 2; print(X)",
      "linux-x86-64",
    );
    expect(size).toMatchInlineSnapshot(`8704`);
    expect(hash).toMatchInlineSnapshot(
      `"aba694f1d3d1ca37caea58c8eb0e71fb0a63ca2470d1dda86f0037c240d1bd8b"`,
    );
  });

  it("linux-x86-64: reassigns using an expression", () => {
    const { size, hash } = fingerprint(
      "let X = 1; X := X + 1; X := X * 3; print(X)",
      "linux-x86-64",
    );
    expect(size).toMatchInlineSnapshot(`8704`);
    expect(hash).toMatchInlineSnapshot(
      `"f68560d1c87d4199a1e2e58e4c144b16fe1641a0661c36d0a94571a093236782"`,
    );
  });

  it("linux-x86-64: reassigns a let from an outer block", () => {
    const { size, hash } = fingerprint(
      "let X = 1; { X := 2 } print(X)",
      "linux-x86-64",
    );
    expect(size).toMatchInlineSnapshot(`8704`);
    expect(hash).toMatchInlineSnapshot(
      `"3337e8dc8780d534aa602ef234238ad86e20ad47dca217fd6787a0686c994bb2"`,
    );
  });

  it("linux-x86-64: sibling let blocks", () => {
    const { size, hash } = fingerprint(
      "{ let X = 1; print(X) } { let X = 5; print(X) }",
      "linux-x86-64",
    );
    expect(size).toMatchInlineSnapshot(`8704`);
    expect(hash).toMatchInlineSnapshot(
      `"482eb00c573053d2d93b1167f0fe1e74ea6640a9e7b12ca78fc0e36d2c52e0f0"`,
    );
  });

  it("linux-x86-64: prints a boolean with let", () => {
    const { size, hash } = fingerprint(
      "let B = true; print(B)",
      "linux-x86-64",
    );
    expect(size).toMatchInlineSnapshot(`8704`);
    expect(hash).toMatchInlineSnapshot(
      `"f498eb8d4848ce7da257bcee43ff16c66788684c83b3cbb31064a3d3c4b3d8a3"`,
    );
  });

  it("linux-x86-64: reassigns a boolean", () => {
    const { size, hash } = fingerprint(
      "let B = true; print(B); B := false; print(B)",
      "linux-x86-64",
    );
    expect(size).toMatchInlineSnapshot(`8704`);
    expect(hash).toMatchInlineSnapshot(
      `"71059db88d412274964bd8c8a75843480fa1d6b7f66222c9fc808f1cb2b611b6"`,
    );
  });

  it("linux-x86-64: negates a runtime boolean", () => {
    const { size, hash } = fingerprint(
      "let B = false; print(!B)",
      "linux-x86-64",
    );
    expect(size).toMatchInlineSnapshot(`8704`);
    expect(hash).toMatchInlineSnapshot(
      `"e20318d9b6312af37afdbe8135c4f6dba02f4cf980fb53bd3d47dce39e644b07"`,
    );
  });

  it("linux-x86-64: prints a string with let", () => {
    const { size, hash } = fingerprint(
      'let s = "hi"; print(s)',
      "linux-x86-64",
    );
    expect(size).toMatchInlineSnapshot(`8704`);
    expect(hash).toMatchInlineSnapshot(
      `"771352b12d2a39b823ace6c34e000989cde16981239babcd32d041d4c10d0db0"`,
    );
  });

  it("linux-x86-64: reassigns a string", () => {
    const { size, hash } = fingerprint(
      'let s = "hi"; print(s); s := "bye"; print(s)',
      "linux-x86-64",
    );
    expect(size).toMatchInlineSnapshot(`8704`);
    expect(hash).toMatchInlineSnapshot(
      `"5cfb056643a85de78d3ee8e3cba3e79ce77ef46bc6ab45eae4898c6ee59b2d1b"`,
    );
  });

  it("linux-x86-64: reassigns a string to a different length", () => {
    const { size, hash } = fingerprint(
      'let s = "a"; print(s); s := "longer"; print(s)',
      "linux-x86-64",
    );
    expect(size).toMatchInlineSnapshot(`8704`);
    expect(hash).toMatchInlineSnapshot(
      `"a7813a2998356b349edb2392f52c0cbefb0c7529121dc80b9776fe0d531f2f77"`,
    );
  });

  it("linux-x86-64: copies a runtime string", () => {
    const { size, hash } = fingerprint(
      'let s = "hi"; let t = s; print(t)',
      "linux-x86-64",
    );
    expect(size).toMatchInlineSnapshot(`8704`);
    expect(hash).toMatchInlineSnapshot(
      `"9d3767cbca670846cc2182b7a78d5ec84bee1ac71cda4f768f34db5e45b6b2de"`,
    );
  });

  it("linux-x86-64: compares two runtime integers", () => {
    const { size, hash } = fingerprint(
      "let A = 1; let B = 2; print(A == B)",
      "linux-x86-64",
    );
    expect(size).toMatchInlineSnapshot(`8704`);
    expect(hash).toMatchInlineSnapshot(
      `"f642ed1a100f282c54d1540083879c51e83939dc2219b9fa4506be92745cf4bd"`,
    );
  });

  it("linux-x86-64: compares equal runtime integers", () => {
    const { size, hash } = fingerprint(
      "let A = 3; let B = 3; print(A != B)",
      "linux-x86-64",
    );
    expect(size).toMatchInlineSnapshot(`8704`);
    expect(hash).toMatchInlineSnapshot(
      `"b58c272118423d8525ddb41341ac0ecfb6c9ac7e1c42ca54a868389024dc6a36"`,
    );
  });

  it("linux-x86-64: compares a runtime string by content", () => {
    const { size, hash } = fingerprint(
      'let s = "hi"; print(s == "hi")',
      "linux-x86-64",
    );
    expect(size).toMatchInlineSnapshot(`8704`);
    expect(hash).toMatchInlineSnapshot(
      `"7da70abfd2b58da30e6a57e33bf6355b7cc33b59a5735c80d60d53280b221a5d"`,
    );
  });

  it("linux-x86-64: runs the taken branch for a runtime condition", () => {
    const { size, hash } = fingerprint(
      'let X = 3; if (X == 3) { print("eq") } else { print("ne") }',
      "linux-x86-64",
    );
    expect(size).toMatchInlineSnapshot(`8704`);
    expect(hash).toMatchInlineSnapshot(
      `"69e2d635d49b14bf08acea3f16148c37e09dadc96c5bc938ea53e6a860df7567"`,
    );
  });

  it("linux-x86-64: runs the else branch for a runtime condition", () => {
    const { size, hash } = fingerprint(
      'let X = 4; if (X == 3) { print("eq") } else { print("ne") }',
      "linux-x86-64",
    );
    expect(size).toMatchInlineSnapshot(`8704`);
    expect(hash).toMatchInlineSnapshot(
      `"f4738435736339c3f40340f96ce8474400038a138347d536c03a02178e1d9efe"`,
    );
  });

  it("linux-x86-64: uses a runtime boolean as an if condition", () => {
    const { size, hash } = fingerprint(
      'let FLAG = true; if (FLAG) { print("y") }',
      "linux-x86-64",
    );
    expect(size).toMatchInlineSnapshot(`8704`);
    expect(hash).toMatchInlineSnapshot(
      `"756bb61c49c7bc85549372aec929d1c54acd038997feb2e58cd6f6da2689e9a9"`,
    );
  });

  it("linux-x86-64: uses a runtime negation as an if condition", () => {
    const { size, hash } = fingerprint(
      'let FLAG = false; if (!FLAG) { print("y") }',
      "linux-x86-64",
    );
    expect(size).toMatchInlineSnapshot(`8704`);
    expect(hash).toMatchInlineSnapshot(
      `"de398a78f3e3b914f06388ba9cf226b4fa3c5c06ff41955cea6be7864c839c9f"`,
    );
  });

  it("linux-x86-64: first matching branch in a runtime else if chain", () => {
    const { size, hash } = fingerprint(
      'let X = 2; if (X == 1) { print("a") } else if (X == 2) { print("b") } else { print("c") }',
      "linux-x86-64",
    );
    expect(size).toMatchInlineSnapshot(`8704`);
    expect(hash).toMatchInlineSnapshot(
      `"ce730da5cd6939f9165b8159dd1b72cfa94b295f9d1e76cae64e0b54a17ad7f4"`,
    );
  });

  it("linux-x86-64: final else in a runtime else if chain", () => {
    const { size, hash } = fingerprint(
      'let X = 9; if (X == 1) { print("a") } else if (X == 2) { print("b") } else { print("c") }',
      "linux-x86-64",
    );
    expect(size).toMatchInlineSnapshot(`8704`);
    expect(hash).toMatchInlineSnapshot(
      `"9914ab4d63a2457d786b87a4de0f3b818bc5066b768d03db9fc5ecdc8b9e9fd8"`,
    );
  });

  it("linux-x86-64: nested runtime if statements", () => {
    const { size, hash } = fingerprint(
      'let X = 3; if (X == 3) { if (X != 4) { print("a") } } else { print("b") }',
      "linux-x86-64",
    );
    expect(size).toMatchInlineSnapshot(`8704`);
    expect(hash).toMatchInlineSnapshot(
      `"36cf44c75e12234f4c5ba3e052861653c051070bd77404d40e82a8220f73cf24"`,
    );
  });

  it("linux-x86-64: bare declaration holds a runtime value", () => {
    const { size, hash } = fingerprint(
      "let Y = 1; X = Y; print(X)",
      "linux-x86-64",
    );
    expect(size).toMatchInlineSnapshot(`8704`);
    expect(hash).toMatchInlineSnapshot(
      `"81fbad474819b2f73973ffcbc09e93e853a4a62ec038955723bd280e87f6a364"`,
    );
  });

  it("linux-x86-64: prints hello world", () => {
    const { size, hash } = fingerprint('print("hello world")', "linux-x86-64");
    expect(size).toMatchInlineSnapshot(`8704`);
    expect(hash).toMatchInlineSnapshot(
      `"674608e3c2a04f9287f942159cff765e21127db713b6c64e9cd91313cf1dc64f"`,
    );
  });

  it("linux-x86-64: prints an integer", () => {
    const { size, hash } = fingerprint("print(42)", "linux-x86-64", undefined);
    expect(size).toMatchInlineSnapshot(`8704`);
    expect(hash).toMatchInlineSnapshot(
      `"2580c0b0925164998598f83fa98c93f0701cbcaf611c94435e3d12fba1ba7733"`,
    );
  });

  it("linux-x86-64: prints multiple statements on separate lines", () => {
    const { size, hash } = fingerprint(
      'print("hello")\nprint("world")',
      "linux-x86-64",
    );
    expect(size).toMatchInlineSnapshot(`8704`);
    expect(hash).toMatchInlineSnapshot(
      `"39dbd75c25c949ac6f1f3652fc801d1d0a1660c53a6d7fef3de79d088adbde66"`,
    );
  });

  it("linux-x86-64: mixes string and integer prints", () => {
    const { size, hash } = fingerprint(
      'print("n="); print(42)',
      "linux-x86-64",
    );
    expect(size).toMatchInlineSnapshot(`8704`);
    expect(hash).toMatchInlineSnapshot(
      `"a23fb8e2b296db32a6bdf20a4a6dce738ede8ce744c2665fb6d881459a18bd20"`,
    );
  });

  it("linux-x86-64: prints with explicit crlf eol", () => {
    const { size, hash } = fingerprint('print("hi")', "linux-x86-64", "crlf");
    expect(size).toMatchInlineSnapshot(`8704`);
    expect(hash).toMatchInlineSnapshot(
      `"b209ab124dc92088706d4e4bc15d8b9791180b5a292ac650669c3bed27376e1c"`,
    );
  });

  it("linux-x86-64: prints an addition result", () => {
    const { size, hash } = fingerprint("print(1 + 2)", "linux-x86-64");
    expect(size).toMatchInlineSnapshot(`8704`);
    expect(hash).toMatchInlineSnapshot(
      `"2492de3b613a5df0d2d2bafd9da2ba7b3bc0dfb5dcaf283dffec34e9b9f118d1"`,
    );
  });

  it("linux-x86-64: keeps 64-bit precision on overflow", () => {
    const { size, hash } = fingerprint("print(2147483647 + 1)", "linux-x86-64");
    expect(size).toMatchInlineSnapshot(`8704`);
    expect(hash).toMatchInlineSnapshot(
      `"cb3e9d7ea78caa768ad541383a9b7b0824f40deba0229e41d9c58091c43b8077"`,
    );
  });

  it("linux-x86-64: left-associative addition", () => {
    const { size, hash } = fingerprint("print(1 + 2 + 3)", "linux-x86-64");
    expect(size).toMatchInlineSnapshot(`8704`);
    expect(hash).toMatchInlineSnapshot(
      `"2b351896b3992aefccbae2c197ce4fe091f81fcc9615f54866325f8b2ab9f69b"`,
    );
  });

  it("linux-x86-64: left-associative multiplication", () => {
    const { size, hash } = fingerprint("print(2 * 3 * 4)", "linux-x86-64");
    expect(size).toMatchInlineSnapshot(`8704`);
    expect(hash).toMatchInlineSnapshot(
      `"933472a950bc9233552a3d16cf7d813f2cbbbc0633cd3c38abd352d3976786aa"`,
    );
  });

  it("linux-x86-64: multiplication over addition precedence", () => {
    const { size, hash } = fingerprint("print(1 + 2 * 3)", "linux-x86-64");
    expect(size).toMatchInlineSnapshot(`8704`);
    expect(hash).toMatchInlineSnapshot(
      `"ea4a28fa91c1f21f6a1fcfe987a5c572403ee77053b5ea9c9d8173d9a9739bf1"`,
    );
  });

  it("linux-x86-64: multiplication over addition precedence on the left", () => {
    const { size, hash } = fingerprint("print(2 * 3 + 4)", "linux-x86-64");
    expect(size).toMatchInlineSnapshot(`8704`);
    expect(hash).toMatchInlineSnapshot(
      `"8ad179be98d50ab865bc5c307c8477797e2f8b605c754e4ef479f1acc1794fed"`,
    );
  });

  it("linux-x86-64: parentheses override multiplication precedence", () => {
    const { size, hash } = fingerprint("print((1 + 2) * 3)", "linux-x86-64");
    expect(size).toMatchInlineSnapshot(`8704`);
    expect(hash).toMatchInlineSnapshot(
      `"071f50c0ea3dc5e8a27c40b1135c08261ed35c41c188354e491c3986a7a2b324"`,
    );
  });

  it("linux-x86-64: multiplies a group against a literal", () => {
    const { size, hash } = fingerprint("print(3 * (2 + 4))", "linux-x86-64");
    expect(size).toMatchInlineSnapshot(`8704`);
    expect(hash).toMatchInlineSnapshot(
      `"3f7502fcc5596b3785fc107c2cff6248415332df38be9f89f1a3398f1f0ad5d1"`,
    );
  });

  it("linux-x86-64: prints a negative subtraction result", () => {
    const { size, hash } = fingerprint("print(3 - 5)", "linux-x86-64");
    expect(size).toMatchInlineSnapshot(`8704`);
    expect(hash).toMatchInlineSnapshot(
      `"efbc9a1b6832289266d8a7c868215111d647ff6c42d7e97aac2274a53f4d69f9"`,
    );
  });

  it("linux-x86-64: prints a negative literal", () => {
    const { size, hash } = fingerprint("print(-5)", "linux-x86-64", undefined);
    expect(size).toMatchInlineSnapshot(`8704`);
    expect(hash).toMatchInlineSnapshot(
      `"1dfdea45c757d00f7edaea466f60fb35bb424f256076a50d1530d6d65d85d22a"`,
    );
  });

  it("linux-x86-64: multiplies by a negative operand", () => {
    const { size, hash } = fingerprint("print(2 * -3)", "linux-x86-64");
    expect(size).toMatchInlineSnapshot(`8704`);
    expect(hash).toMatchInlineSnapshot(
      `"6b442683e41a729948f9f78a4704d2095316f312de13bb2f3fc616e0eab6012d"`,
    );
  });

  it("linux-x86-64: prints the value of a constant", () => {
    const { size, hash } = fingerprint("X = 5; print(X)", "linux-x86-64");
    expect(size).toMatchInlineSnapshot(`8704`);
    expect(hash).toMatchInlineSnapshot(
      `"92de1b436dda060d65800b9df319126e6c2c62ccb5ccc8e66c607fa8b17d6d2d"`,
    );
  });

  it("linux-x86-64: runs the taken branch", () => {
    const { size, hash } = fingerprint(
      'if (true) { print("yes") }',
      "linux-x86-64",
    );
    expect(size).toMatchInlineSnapshot(`8704`);
    expect(hash).toMatchInlineSnapshot(
      `"407909e6e622dfc1d3abac9818d221b388e6006ddb10313ca1a6a9cb8c486e5d"`,
    );
  });

  it("linux-x86-64: runs the then branch over the else branch", () => {
    const { size, hash } = fingerprint(
      'if (true) { print("a") } else { print("b") }',
      "linux-x86-64",
    );
    expect(size).toMatchInlineSnapshot(`8704`);
    expect(hash).toMatchInlineSnapshot(
      `"a7fe7f22a4d51296870ec582bdff2c90f7e2f0e5266cb0fadea38e72a685b70e"`,
    );
  });

  it("linux-x86-64: runs the else branch when the condition is false", () => {
    const { size, hash } = fingerprint(
      'if (false) { print("a") } else { print("b") }',
      "linux-x86-64",
    );
    expect(size).toMatchInlineSnapshot(`8704`);
    expect(hash).toMatchInlineSnapshot(
      `"45b77852781e947613a7df30cb6d0476b1f4e2a2420d86e3d7e1c1d2532f25f9"`,
    );
  });

  it("linux-x86-64: uses a comparison as the condition", () => {
    const { size, hash } = fingerprint(
      'if (1 == 1) { print("eq") }',
      "linux-x86-64",
    );
    expect(size).toMatchInlineSnapshot(`8704`);
    expect(hash).toMatchInlineSnapshot(
      `"c4cd21391723646225f226e7d0a28eeba1feaf27bc3bc3fe518a21ccc16872ca"`,
    );
  });

  it("linux-x86-64: uses a negation as the condition", () => {
    const { size, hash } = fingerprint(
      'if (!false) { print("y") }',
      "linux-x86-64",
    );
    expect(size).toMatchInlineSnapshot(`8704`);
    expect(hash).toMatchInlineSnapshot(
      `"193317d6253186aced983b8fba12294ea2a07cf6cfb870f4b88c32c3d4051e0b"`,
    );
  });

  it("linux-x86-64: final else in an else if chain", () => {
    const { size, hash } = fingerprint(
      'if (1 == 2) { print("a") } else if (1 == 3) { print("b") } else { print("c") }',
      "linux-x86-64",
    );
    expect(size).toMatchInlineSnapshot(`8704`);
    expect(hash).toMatchInlineSnapshot(
      `"23b1b07e77041acd8527fd6375baede1886bfc79a66653afe87bafd4f5186cbb"`,
    );
  });

  it("linux-x86-64: compiles a multi-statement body", () => {
    const { size, hash } = fingerprint(
      "if (true) { X = 1; print(X) }",
      "linux-x86-64",
    );
    expect(size).toMatchInlineSnapshot(`8704`);
    expect(hash).toMatchInlineSnapshot(
      `"199906a87140bd80cd6afa9cb6e99c9b0082915fbfc9fc32c90cdedb3464cb7e"`,
    );
  });

  it("linux-x86-64: sibling constant blocks", () => {
    const { size, hash } = fingerprint(
      "{ X = 2; print(X) } { X = 5; print(X) }",
      "linux-x86-64",
    );
    expect(size).toMatchInlineSnapshot(`8704`);
    expect(hash).toMatchInlineSnapshot(
      `"126de5ca300681304fc7ab3e6f50e1586f9e3fab4b60bc8962d8b542090d5eab"`,
    );
  });

  it("linux-x86-64: nested block scopes", () => {
    const { size, hash } = fingerprint(
      "{ X = 1; { A = 2; print(A) } print(X) }",
      "linux-x86-64",
    );
    expect(size).toMatchInlineSnapshot(`8704`);
    expect(hash).toMatchInlineSnapshot(
      `"887a0cc38ee410b2a517a0bd1c1d59146d046e4fb2aec9243b6ed878846b4f58"`,
    );
  });

  it("linux-x86-64: prints a newline for an empty print", () => {
    const { size, hash } = fingerprint("print()", "linux-x86-64", undefined);
    expect(size).toMatchInlineSnapshot(`8704`);
    expect(hash).toMatchInlineSnapshot(
      `"a654db82cf8d75e7cca7ec3ac7bbada6001aa4ab00eff42269794bf57e9d4cec"`,
    );
  });
});
