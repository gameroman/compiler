import { expect } from "bun:test";
import { spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { compileSourceToExecutable } from "#src";
import type { CompileOptions } from "#src";

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

export function runAndExpect(outputFile: string, expectedStdout: string) {
  const result = spawnSync(outputFile, [], { encoding: "utf8" });
  expect(result.status).toBe(0);
  expect(result.stdout).toBe(expectedStdout);
}

export function expectSameBinary(a: string, b: string) {
  const aFingerprint = fingerprint(a);
  const bFingerprint = fingerprint(b);
  expect(aFingerprint.size).toBe(bFingerprint.size);
  expect(aFingerprint.hash).toBe(bFingerprint.hash);
}
