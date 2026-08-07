import { expect } from "bun:test";
import { createHash, randomUUID } from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { compileSourceToBytes, compileSourceToExecutable } from "#src";
import type { CompileOptions } from "#src";
import { CompilerError } from "#src/errors";

const createdFiles: string[] = [];

export function compileSource(
  source: string,
  options?: CompileOptions,
): string {
  const outputFile = path.join(
    os.tmpdir(),
    `hello-${process.pid}-${createdFiles.length}-${randomUUID()}.exe`,
  );
  createdFiles.push(outputFile);
  compileSourceToExecutable(source, outputFile, options);
  return outputFile;
}

const byteCache = new Map<string, Uint8Array>();

function referenceBinary(source: string, options?: CompileOptions): Uint8Array {
  const key = JSON.stringify([
    source,
    options?.eol ?? "crlf",
    options?.target ?? "windows-x86-64",
  ]);
  const cached = byteCache.get(key);
  if (cached !== undefined) return cached;
  const bytes = compileSourceToBytes(source, options);
  byteCache.set(key, bytes);
  return bytes;
}

export function expectCompilesTo(
  source: string,
  referenceSource: string,
  options?: CompileOptions,
) {
  expect(compileSourceToBytes(source, options)).toEqual(
    referenceBinary(referenceSource, options),
  );
}

export function expectCompileError(source: string, options?: CompileOptions) {
  expect(() => compileSourceToBytes(source, options)).toThrow(CompilerError);
}

export function cleanupCreatedFiles() {
  for (const file of createdFiles) {
    fs.rmSync(file, { force: true });
  }
}

export function fingerprint(file: string) {
  const binary = fs.readFileSync(file);
  return {
    size: binary.byteLength,
    hash: createHash("sha256").update(binary).digest("hex"),
  };
}
