import * as fs from "node:fs";
import * as path from "node:path";

import { compileSourceToExecutable } from "./index";
import type { Eol, Target } from "./index";

const TARGETS: Target[] = ["windows-x86-64", "linux-x86-64"];
const EOLS: Eol[] = ["crlf", "lf"];

const args = process.argv.slice(2);
const sourceFile = args[0];
const outputFile = args[1];

let target: Target = "windows-x86-64";
let eol: Eol | undefined;

for (let i = 2; i < args.length; i++) {
  const flag = args[i];
  const value = args[i + 1];
  if (flag === "--target" && value !== undefined) {
    if (!TARGETS.includes(value as Target)) {
      console.error(
        `Unknown target "${value}". Expected one of: ${TARGETS.join(", ")}`,
      );
      process.exit(1);
    }
    target = value as Target;
    i++;
  } else if (flag === "--eol" && value !== undefined) {
    if (!EOLS.includes(value as Eol)) {
      console.error(
        `Unknown eol "${value}". Expected one of: ${EOLS.join(", ")}`,
      );
      process.exit(1);
    }
    eol = value as Eol;
    i++;
  } else {
    console.error(`Unknown option: ${flag}`);
    process.exit(1);
  }
}

if (!sourceFile || !outputFile) {
  console.error(
    "Usage: bun run ./src/cli.ts <source-file> <output-file> [--target <windows-x86-64|linux-x86-64>] [--eol <crlf|lf>]",
  );
  process.exit(1);
}

const sourceCode = fs.readFileSync(sourceFile, "utf8");
fs.mkdirSync(path.dirname(outputFile), { recursive: true });
compileSourceToExecutable(sourceCode, outputFile, { target, eol });
console.log(`Compiled "${sourceFile}" -> "${outputFile}"`);
