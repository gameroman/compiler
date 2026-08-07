import * as fs from "node:fs";
import * as path from "node:path";

import { compileSourceToExecutable } from "#src";
import type { Target } from "#src";

import { E2E_CASES } from "./cases";

const OUT_DIR = path.join(process.cwd(), "e2e-out");
const TARGETS: Target[] = ["windows-x86-64", "linux-x86-64"];

let failures = 0;

for (const target of TARGETS) {
  for (const testCase of E2E_CASES) {
    const binaryDir = path.join(OUT_DIR, target);
    fs.mkdirSync(binaryDir, { recursive: true });
    const extension = target === "windows-x86-64" ? ".exe" : "";
    const binaryPath = path.join(binaryDir, `${testCase.name}${extension}`);
    try {
      compileSourceToExecutable(testCase.source, binaryPath, {
        target,
        eol: testCase.eol,
      });
    } catch (error) {
      failures++;
      console.error(
        `FAIL compile [${target}] ${testCase.name}: ${String(error)}`,
      );
    }
  }
}

const expectedDir = path.join(OUT_DIR, "expected");
fs.mkdirSync(expectedDir, { recursive: true });
for (const testCase of E2E_CASES) {
  fs.writeFileSync(
    path.join(expectedDir, `${testCase.name}.txt`),
    testCase.expected,
    "utf8",
  );
}

console.log(
  `Compiled ${E2E_CASES.length} cases for ${TARGETS.length} targets.`,
);
if (failures > 0) {
  console.error(`${failures} case(s) failed to compile.`);
  process.exit(1);
}
