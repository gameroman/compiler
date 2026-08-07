import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

import { normalizeOutput } from "./cases";

const BIN_DIR_ARG = process.argv[2];
const EXPECTED_DIR_ARG = process.argv[3];

const defaultTarget =
  process.platform === "win32" ? "windows-x86-64" : "linux-x86-64";
const binDir =
  BIN_DIR_ARG ?? path.join(process.cwd(), "e2e-out", defaultTarget);
const expectedDir =
  EXPECTED_DIR_ARG ?? path.join(process.cwd(), "e2e-out", "expected");

const isWindowsTarget = binDir.includes("windows-x86-64");
const extension = isWindowsTarget ? ".exe" : "";

const binaries = fs
  .readdirSync(binDir)
  .filter((name) =>
    extension ? name.endsWith(extension) : !name.endsWith(".exe"),
  )
  .sort();

let failures = 0;

for (const binaryName of binaries) {
  const binaryPath = path.join(binDir, binaryName);
  const caseName = extension
    ? binaryName.slice(0, -extension.length)
    : binaryName;
  const expectedFile = path.join(expectedDir, `${caseName}.txt`);
  const expected = fs.readFileSync(expectedFile, "utf8");

  if (process.platform !== "win32") {
    fs.chmodSync(binaryPath, 0o755);
  }

  const result = spawnSync(binaryPath, [], { encoding: "utf8" });
  if (result.error) {
    failures++;
    console.error(`FAIL run [${binDir}] ${caseName}: ${String(result.error)}`);
    continue;
  }
  const actual = normalizeOutput(result.stdout);

  if (result.status !== 0 || actual !== expected) {
    failures++;
    console.error(
      `FAIL run [${binDir}] ${caseName}: status=${result.status} ` +
        `actual=${JSON.stringify(actual)} expected=${JSON.stringify(expected)}`,
    );
  }
}

console.log(`Ran ${binaries.length} binaries from ${binDir}.`);
if (failures > 0) {
  console.error(`${failures} case(s) failed.`);
  process.exit(1);
} else {
  console.error(`All ${binaries.length} case(s) passed.`);
  process.exit(0);
}
