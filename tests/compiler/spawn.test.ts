import { afterAll, describe, expect, it } from "bun:test";
import { spawnSync } from "node:child_process";

import { E2E_CASES, normalizeOutput } from "../e2e/cases";
import { cleanupCreatedFiles, compileSource } from "./helpers";

afterAll(cleanupCreatedFiles);

const TARGETS = ["windows-x86-64", "linux-x86-64"] as const;
const NATIVE_TARGET =
  process.platform === "win32" ? "windows-x86-64" : "linux-x86-64";

for (const target of TARGETS) {
  const canRun = target === NATIVE_TARGET;

  describe(`spawned programs (${target})`, () => {
    for (const testCase of E2E_CASES) {
      it(testCase.name, () => {
        const outputFile = compileSource(testCase.source, {
          target,
          eol: testCase.eol,
        });

        if (canRun) {
          const result = spawnSync(outputFile, [], { encoding: "utf8" });
          expect(result.status).toBe(0);
          expect(normalizeOutput(result.stdout)).toBe(testCase.expected);
        }
      });
    }
  });
}
