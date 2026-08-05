import { afterAll, describe, expect, it } from "bun:test";
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { compileSourceToExecutable } from "../src/index";

const outputFile = path.join(os.tmpdir(), `hello-${process.pid}.exe`);

afterAll(() => {
  fs.rmSync(outputFile, { force: true });
});

describe("compileSourceToExecutable", () => {
  it("produces a binary that prints hello world", () => {
    compileSourceToExecutable('print("hello world")', outputFile);

    const result = spawnSync(outputFile, [], { encoding: "utf8" });
    expect(result.status).toBe(0);
    expect(result.stdout).toBe("hello world\r\n");
  });

  it("produces a binary that prints an integer", () => {
    compileSourceToExecutable("print(42)", outputFile);

    const result = spawnSync(outputFile, [], { encoding: "utf8" });
    expect(result.status).toBe(0);
    expect(result.stdout).toBe("42\r\n");
  });
});
