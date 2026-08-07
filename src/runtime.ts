import { CodeBuilder, Register } from "./x86-64";

export type Eol = "crlf" | "lf";

export type Target = "windows-x86-64" | "linux-x86-64";

export const EOL_STRING: Record<Eol, string> = {
  crlf: "\r\n",
  lf: "\n",
};

export function defaultEolForTarget(target: Target): Eol {
  return target === "linux-x86-64" ? "lf" : "crlf";
}

export interface MemoryLayout {
  textRva: number;
  textFileOffset: number;
  rdataRva: number;
  rdataFileOffset: number;
  stringPayload: number;
  scratchBuffer: number;
  varStart: number;
  varEnd: number;
}

export const WINDOWS_LAYOUT: MemoryLayout = {
  textRva: 0x1000,
  textFileOffset: 0x200,
  rdataRva: 0x2000,
  rdataFileOffset: 0x400,
  stringPayload: 0x20b0,
  scratchBuffer: 0x20f0,
  varStart: 0x2110,
  varEnd: 0x2800,
};

export const LINUX_LAYOUT: MemoryLayout = {
  textRva: 0x1000,
  textFileOffset: 0x1000,
  rdataRva: 0x2000,
  rdataFileOffset: 0x2000,
  stringPayload: 0x20b0,
  scratchBuffer: 0x20f0,
  varStart: 0x2110,
  varEnd: 0x2800,
};

export const SCRATCH_BUFFER_SIZE = 32;

const IAT_GET_STD_HANDLE = 0x2048;
const IAT_WRITE_FILE = 0x2050;
const IAT_EXIT_PROCESS = 0x2058;

export interface RuntimeBackend {
  readonly layout: MemoryLayout;
  emitStringPrint(payloadRva: number, length: number): void;
  emitStringPtrPrint(emitLoad: () => void): void;
  emitIntegerPrint(emitValue: () => void, negative: boolean): void;
  emitExit(): void;
}

export function emitDecimalConversion(
  code: CodeBuilder,
  layout: MemoryLayout,
  eol: Eol,
  negative: boolean,
): void {
  code.leaRipRelative(
    Register.RDI,
    layout.textRva,
    layout.scratchBuffer + SCRATCH_BUFFER_SIZE,
  );
  code.decRdi();
  code.movByteRdiImm(0x0a);
  if (eol === "crlf") {
    code.decRdi();
    code.movByteRdiImm(0x0d);
  }
  code.movR8d32(eol === "lf" ? 1 : 2);
  if (negative) {
    code.xorRsiRsi();
    code.testRaxRax();
    const skipNeg = code.jnsForward();
    code.negRax();
    code.incRsi();
    code.patchShortJump(skipNeg);
  }
  code.movEcx32(10);

  const loopStart = code.length;
  code.xorEdxEdx();
  code.divRcx();
  code.addDlImm(0x30);
  code.decRdi();
  code.movByteRdiDl();
  code.incR8d();
  code.testRaxRax();
  code.jnzBackwardTo(loopStart);

  if (negative) {
    code.testRsiRsi();
    const done = code.jzForward();
    code.decRdi();
    code.movByteRdiImm(0x2d);
    code.incR8d();
    code.patchShortJump(done);
  }
}

class WindowsRuntime implements RuntimeBackend {
  readonly layout = WINDOWS_LAYOUT;

  constructor(
    private readonly code: CodeBuilder,
    private readonly eol: Eol,
  ) {}

  emitStringPrint(payloadRva: number, length: number): void {
    const code = this.code;
    code.movEcx32(-11);
    code.callImport(this.layout.textRva, IAT_GET_STD_HANDLE);
    code.movRcxRax();
    code.leaRipRelative(Register.RDX, this.layout.textRva, payloadRva);
    code.movR8d32(length);
    code.leaRipRelative(
      Register.R9,
      this.layout.textRva,
      this.layout.scratchBuffer,
    );
    code.movStackParamZero();
    code.callImport(this.layout.textRva, IAT_WRITE_FILE);
  }

  emitStringPtrPrint(emitLoad: () => void): void {
    const code = this.code;
    code.movEcx32(-11);
    code.callImport(this.layout.textRva, IAT_GET_STD_HANDLE);
    code.movRcxRax();
    emitLoad();
    code.movRbxRax();
    code.movR8Rdx();
    code.movRdxRbx();
    code.leaRipRelative(
      Register.R9,
      this.layout.textRva,
      this.layout.scratchBuffer,
    );
    code.movStackParamZero();
    code.callImport(this.layout.textRva, IAT_WRITE_FILE);
  }

  emitIntegerPrint(emitValue: () => void, negative: boolean): void {
    const code = this.code;
    code.movEcx32(-11);
    code.callImport(this.layout.textRva, IAT_GET_STD_HANDLE);
    code.movRbxRax();
    emitValue();
    emitDecimalConversion(code, this.layout, this.eol, negative);
    code.movRcxRbx();
    code.movRdxRdi();
    code.leaRipRelative(
      Register.R9,
      this.layout.textRva,
      this.layout.scratchBuffer,
    );
    code.movStackParamZero();
    code.callImport(this.layout.textRva, IAT_WRITE_FILE);
  }

  emitExit(): void {
    const code = this.code;
    code.xorEcxEcx();
    code.callImport(this.layout.textRva, IAT_EXIT_PROCESS);
  }
}

class LinuxRuntime implements RuntimeBackend {
  readonly layout = LINUX_LAYOUT;

  constructor(
    private readonly code: CodeBuilder,
    private readonly eol: Eol,
  ) {}

  emitStringPrint(payloadRva: number, length: number): void {
    const code = this.code;
    code.movRaxImm32(1);
    code.movRdiImm32(1);
    code.leaRipRelative(Register.RSI, this.layout.textRva, payloadRva);
    code.movRdxImm32(length);
    code.syscall();
  }

  emitStringPtrPrint(emitLoad: () => void): void {
    const code = this.code;
    emitLoad();
    code.movRsiRax();
    code.movRaxImm32(1);
    code.movRdiImm32(1);
    code.syscall();
  }

  emitIntegerPrint(emitValue: () => void, negative: boolean): void {
    const code = this.code;
    emitValue();
    emitDecimalConversion(code, this.layout, this.eol, negative);
    code.movRsiRdi();
    code.movRdxR8();
    code.movRaxImm32(1);
    code.movRdiImm32(1);
    code.syscall();
  }

  emitExit(): void {
    const code = this.code;
    code.movRaxImm32(60);
    code.movRdiImm32(0);
    code.syscall();
  }
}

export function createRuntime(
  target: Target,
  eol: Eol,
  code: CodeBuilder,
): RuntimeBackend {
  return target === "linux-x86-64"
    ? new LinuxRuntime(code, eol)
    : new WindowsRuntime(code, eol);
}
