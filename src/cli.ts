import * as fs from "node:fs";

import { compileSourceToExecutable } from "./index";

const sourceFile = process.argv[2];
const outputFile = process.argv[3];

if (!sourceFile || !outputFile) {
  console.error("Usage: bun run ./src/cli.ts <source-file> <output-file>");
  process.exit(1);
}

const sourceCode = fs.readFileSync(sourceFile, "utf8");
compileSourceToExecutable(sourceCode, outputFile);
console.log(`Compiled "${sourceFile}" -> "${outputFile}"`);
