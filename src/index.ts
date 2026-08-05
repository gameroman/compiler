/// <reference types="bun" />

import * as fs from "node:fs";

import { tokenize } from "./lexer";
import { parse } from "./parser";
import { PEBuilder } from "./pe-builder";
import { CodeBuilder, Register } from "./x86-64";

const MEMORY_LAYOUT = {
  TEXT_RVA: 0x1000,
  TEXT_FILE_OFFSET: 0x200,

  RDATA_RVA: 0x2000,
  RDATA_FILE_OFFSET: 0x400,

  IAT_GET_STD_HANDLE: 0x2048,
  IAT_WRITE_FILE: 0x2050,
  IAT_EXIT_PROCESS: 0x2058,
  STRING_PAYLOAD: 0x20b0,
  SCRATCH_BUFFER: 0x20f0,
};

export function compileSourceToExecutable(
  sourceCode: string,
  outputFile: string,
) {
  const tokens = tokenize(sourceCode);
  const ast = parse(tokens);

  let textToPrint = "";
  for (const statement of ast) {
    if (statement.kind === "PrintStatement") {
      textToPrint = statement.textToPrint;
    }
  }

  const code = new CodeBuilder();
  const textBytes = new TextEncoder().encode(textToPrint + "\r\n");

  code.subRsp(56);

  // 1. GetStdHandle(-11)
  code.movEcx32(-11);
  code.callImport(MEMORY_LAYOUT.TEXT_RVA, MEMORY_LAYOUT.IAT_GET_STD_HANDLE);

  // 2. WriteFile(handle, buffer, length, &bytesWritten, NULL)
  code.movRcxRax();
  code.leaRipRelative(
    Register.RDX,
    MEMORY_LAYOUT.TEXT_RVA,
    MEMORY_LAYOUT.STRING_PAYLOAD,
  );
  code.movR8d32(textBytes.length);
  code.leaRipRelative(
    Register.R9,
    MEMORY_LAYOUT.TEXT_RVA,
    MEMORY_LAYOUT.SCRATCH_BUFFER,
  );
  code.movStackParamZero();
  code.callImport(MEMORY_LAYOUT.TEXT_RVA, MEMORY_LAYOUT.IAT_WRITE_FILE);

  // 3. ExitProcess(0)
  code.xorEcxEcx();
  code.callImport(MEMORY_LAYOUT.TEXT_RVA, MEMORY_LAYOUT.IAT_EXIT_PROCESS);

  const pe = new PEBuilder(4096);
  pe.writeHeaders(
    0x200,
    0x200,
    MEMORY_LAYOUT.TEXT_RVA,
    MEMORY_LAYOUT.RDATA_RVA,
  );

  // --- Write .text ---
  pe.seek(MEMORY_LAYOUT.TEXT_FILE_OFFSET);
  pe.writeBytes(code.bytes);
  pe.padToAlignment(0x200);

  // --- Write .rdata ---
  pe.seek(MEMORY_LAYOUT.RDATA_FILE_OFFSET);

  // Import Directory Descriptor @ 0x2000 (File 0x400)
  pe.writeU32(0x2028); // ILT RVA
  pe.writeU32(0);
  pe.writeU32(0);
  pe.writeU32(0x20a0); // DLL Name RVA ("kernel32.dll")
  pe.writeU32(MEMORY_LAYOUT.IAT_GET_STD_HANDLE); // IAT RVA (0x2048)

  // Null Directory Descriptor
  pe.writeU32(0);
  pe.writeU32(0);
  pe.writeU32(0);
  pe.writeU32(0);
  pe.writeU32(0);

  // ILT @ RVA 0x2028 (File 0x428)
  pe.seek(MEMORY_LAYOUT.RDATA_FILE_OFFSET + 0x28);
  pe.writeU64(0x2070n); // GetStdHandle Name RVA
  pe.writeU64(0x2080n); // WriteFile Name RVA
  pe.writeU64(0x2090n); // ExitProcess Name RVA
  pe.writeU64(0n);

  // IAT @ RVA 0x2048 (File 0x448)
  pe.seek(MEMORY_LAYOUT.RDATA_FILE_OFFSET + 0x48);
  pe.writeU64(0x2070n);
  pe.writeU64(0x2080n);
  pe.writeU64(0x2090n);
  pe.writeU64(0n);

  // Function Hint/Names @ RVA 0x2070, 0x2080, 0x2090
  pe.seek(MEMORY_LAYOUT.RDATA_FILE_OFFSET + 0x70);
  pe.writeU16(0);
  pe.writeString("GetStdHandle");

  pe.seek(MEMORY_LAYOUT.RDATA_FILE_OFFSET + 0x80);
  pe.writeU16(0);
  pe.writeString("WriteFile");

  pe.seek(MEMORY_LAYOUT.RDATA_FILE_OFFSET + 0x90);
  pe.writeU16(0);
  pe.writeString("ExitProcess");

  // DLL Name @ RVA 0x20A0
  pe.seek(MEMORY_LAYOUT.RDATA_FILE_OFFSET + 0xa0);
  pe.writeString("kernel32.dll");

  // String Payload @ RVA 0x20B0
  pe.seek(MEMORY_LAYOUT.RDATA_FILE_OFFSET + 0xb0);
  pe.writeBytes(textBytes);

  pe.padToAlignment(0x200);

  if (!fs.existsSync("dist")) fs.mkdirSync("dist", { recursive: true });
  fs.writeFileSync(outputFile, pe.TrimmedBuffer);
}
