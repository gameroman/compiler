import { afterAll, describe, expect, it } from "bun:test";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { CompilerError } from "../src/errors";
import { compileSourceToExecutable } from "../src/index";
import type { CompileOptions } from "../src/index";

const createdFiles: string[] = [];

function compileSource(source: string, options?: CompileOptions): string {
  const outputFile = path.join(
    os.tmpdir(),
    `hello-${process.pid}-${createdFiles.length}.exe`,
  );
  createdFiles.push(outputFile);
  compileSourceToExecutable(source, outputFile, options);
  return outputFile;
}

afterAll(() => {
  for (const file of createdFiles) {
    fs.rmSync(file, { force: true });
  }
});

function fingerprint(file: string) {
  const binary = fs.readFileSync(file);
  return {
    size: binary.byteLength,
    hash: createHash("sha256").update(binary).digest("hex"),
  };
}

describe("compileSourceToExecutable", () => {
  it("produces a binary that prints hello world", () => {
    const outputFile = compileSource('print("hello world")');

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"7a6b94a13cb8ed26aa1f30fef2024a67abf90ee8b56125f251c70c61c2d88d16"`,
    );

    const result = spawnSync(outputFile, [], { encoding: "utf8" });
    expect(result.status).toBe(0);
    expect(result.stdout).toBe("hello world\r\n");
  });

  it("produces a binary that prints an integer", () => {
    const outputFile = compileSource("print(42)");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"90337331e95fa12bf581c41b2797c7876ed193d312178074d65e275c2dae0f6d"`,
    );

    const result = spawnSync(outputFile, [], { encoding: "utf8" });
    expect(result.status).toBe(0);
    expect(result.stdout).toBe("42\r\n");
  });

  it("prints multiple statements on separate lines", () => {
    const outputFile = compileSource('print("hello")\nprint("world")');

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"cfd3121cd78ea9ab98c02b41baf25da4dc5d8d6d3d6d147a50988a8728b3b1bc"`,
    );

    const result = spawnSync(outputFile, [], { encoding: "utf8" });
    expect(result.status).toBe(0);
    expect(result.stdout).toBe("hello\r\nworld\r\n");
  });

  it("prints multiple statements separated by semicolons", () => {
    const outputFile = compileSource('print("hello"); print("world")');

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"cfd3121cd78ea9ab98c02b41baf25da4dc5d8d6d3d6d147a50988a8728b3b1bc"`,
    );

    const result = spawnSync(outputFile, [], { encoding: "utf8" });
    expect(result.status).toBe(0);
    expect(result.stdout).toBe("hello\r\nworld\r\n");
  });

  it("mixes string and integer prints", () => {
    const outputFile = compileSource('print("n="); print(42)');

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"86065e10403a1df01e6638b903ec3ecc306843de698ed767136ee9cdef1b4033"`,
    );

    const result = spawnSync(outputFile, [], { encoding: "utf8" });
    expect(result.status).toBe(0);
    expect(result.stdout).toBe("n=\r\n42\r\n");
  });

  it("prints a string with lf eol", () => {
    const outputFile = compileSource('print("hi")', { eol: "lf" });

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"f0ea27136c9aefbab45e260dea9a29bb5f0b1085c74ad7cba01b9372425da410"`,
    );

    const result = spawnSync(outputFile, [], { encoding: "utf8" });
    expect(result.status).toBe(0);
    expect(result.stdout).toBe("hi\n");
  });

  it("prints an integer with lf eol", () => {
    const outputFile = compileSource("print(42)", { eol: "lf" });

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"9622985939aed323c98c226e0976739a5682942d809b998519a33d8487f66586"`,
    );

    const result = spawnSync(outputFile, [], { encoding: "utf8" });
    expect(result.status).toBe(0);
    expect(result.stdout).toBe("42\n");
  });

  it("prints with explicit crlf eol", () => {
    const outputFile = compileSource('print("hi")', { eol: "crlf" });

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"f6fa5e623c0cdd84569cc6fc50bc168f431b515dff32da69a85f580d32d20149"`,
    );

    const result = spawnSync(outputFile, [], { encoding: "utf8" });
    expect(result.status).toBe(0);
    expect(result.stdout).toBe("hi\r\n");
  });

  it("prints the result of an addition expression", () => {
    const outputFile = compileSource("print(1 + 2)");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"893e9a632c719b697a34b1575c4f72431b26d90f212c238914622925e63639a3"`,
    );

    const result = spawnSync(outputFile, [], { encoding: "utf8" });
    expect(result.status).toBe(0);
    expect(result.stdout).toBe("3\r\n");
  });

  it("prints a left-associative addition chain", () => {
    const outputFile = compileSource("print(1 + 2 + 3)");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"f3044c40bc22981e92a20f2ae094b5364471d6c3864d2a1fca7fcb256e2fc2cb"`,
    );

    const result = spawnSync(outputFile, [], { encoding: "utf8" });
    expect(result.status).toBe(0);
    expect(result.stdout).toBe("6\r\n");
  });

  it("prints a parenthesized string literal", () => {
    const outputFile = compileSource('print(("hi"))');

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"f6fa5e623c0cdd84569cc6fc50bc168f431b515dff32da69a85f580d32d20149"`,
    );

    const result = spawnSync(outputFile, [], { encoding: "utf8" });
    expect(result.status).toBe(0);
    expect(result.stdout).toBe("hi\r\n");
  });

  it("prints a doubly parenthesized string literal", () => {
    const outputFile = compileSource('print((("hi")))');

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"f6fa5e623c0cdd84569cc6fc50bc168f431b515dff32da69a85f580d32d20149"`,
    );

    const result = spawnSync(outputFile, [], { encoding: "utf8" });
    expect(result.status).toBe(0);
    expect(result.stdout).toBe("hi\r\n");
  });

  it("prints a parenthesized addition", () => {
    const outputFile = compileSource("print((1+2))");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"893e9a632c719b697a34b1575c4f72431b26d90f212c238914622925e63639a3"`,
    );

    const result = spawnSync(outputFile, [], { encoding: "utf8" });
    expect(result.status).toBe(0);
    expect(result.stdout).toBe("3\r\n");
  });

  it("prints parenthesized operands in an addition", () => {
    const outputFile = compileSource("print((1)+(2))");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"893e9a632c719b697a34b1575c4f72431b26d90f212c238914622925e63639a3"`,
    );

    const result = spawnSync(outputFile, [], { encoding: "utf8" });
    expect(result.status).toBe(0);
    expect(result.stdout).toBe("3\r\n");
  });

  it("prints a doubly parenthesized addition", () => {
    const outputFile = compileSource("print(((1)+(2)))");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"893e9a632c719b697a34b1575c4f72431b26d90f212c238914622925e63639a3"`,
    );

    const result = spawnSync(outputFile, [], { encoding: "utf8" });
    expect(result.status).toBe(0);
    expect(result.stdout).toBe("3\r\n");
  });

  it("rejects a string inside an addition operand", () => {
    expect(() => compileSource('print((1) + ("hi"))')).toThrow(CompilerError);
  });

  it("compiles a bare semicolon as an empty program", () => {
    const outputFile = compileSource(";");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"08db888a9aa76055731ce8227c2bce5bee9d1c8b2c1fbe53efe3a027c57fd662"`,
    );

    const result = spawnSync(outputFile, [], { encoding: "utf8" });
    expect(result.status).toBe(0);
    expect(result.stdout).toBe("");
  });

  it("compiles a bare string expression statement", () => {
    const outputFile = compileSource('"hello"');

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"08db888a9aa76055731ce8227c2bce5bee9d1c8b2c1fbe53efe3a027c57fd662"`,
    );

    const result = spawnSync(outputFile, [], { encoding: "utf8" });
    expect(result.status).toBe(0);
    expect(result.stdout).toBe("");
  });

  it("compiles a bare integer expression statement", () => {
    const outputFile = compileSource("1 + 2");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"08db888a9aa76055731ce8227c2bce5bee9d1c8b2c1fbe53efe3a027c57fd662"`,
    );

    const result = spawnSync(outputFile, [], { encoding: "utf8" });
    expect(result.status).toBe(0);
    expect(result.stdout).toBe("");
  });

  it("rejects a string followed by an integer addition", () => {
    expect(() => compileSource('print("abc" + 123)')).toThrow(CompilerError);
  });

  it("rejects an integer followed by a string addition", () => {
    expect(() => compileSource('print(123 + "abc")')).toThrow(CompilerError);
  });

  it("rejects an unterminated string literal", () => {
    expect(() => compileSource('"')).toThrow(CompilerError);
  });

  it("rejects an unclosed print parenthesis", () => {
    expect(() => compileSource("print(")).toThrow(CompilerError);
  });

  it("rejects a semicolon inside print parentheses", () => {
    expect(() => compileSource("print(;)")).toThrow(CompilerError);
  });

  it("prints a newline for an empty print", () => {
    const outputFile = compileSource("print()");

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"9a7bb965268a3497064d969469bd7bbee644a3957a1a3023920e6cbb0ac0a790"`,
    );

    const result = spawnSync(outputFile, [], { encoding: "utf8" });
    expect(result.status).toBe(0);
    expect(result.stdout).toBe("\r\n");
  });

  it("prints a newline for an empty print with lf eol", () => {
    const outputFile = compileSource("print()", { eol: "lf" });

    const { size, hash } = fingerprint(outputFile);
    expect(size).toMatchInlineSnapshot(`1536`);
    expect(hash).toMatchInlineSnapshot(
      `"d9415ac4b252274b9ccf8489470f365502414d29d988485cd0e6bc5c1bccf2b4"`,
    );

    const result = spawnSync(outputFile, [], { encoding: "utf8" });
    expect(result.status).toBe(0);
    expect(result.stdout).toBe("\n");
  });

  it("rejects a trailing plus", () => {
    expect(() => compileSource("1 +")).toThrow(CompilerError);
  });

  it("rejects print without parentheses", () => {
    expect(() => compileSource("print 1")).toThrow(CompilerError);
  });
});
