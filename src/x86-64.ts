export const Register = {
  RCX: 1,
  RDX: 2,
  R8: 8,
  R9: 9,
  RSP: 4,
  RAX: 0,
} as const;

export class CodeBuilder {
  public bytes: number[] = [];

  get length(): number {
    return this.bytes.length;
  }

  subRsp(bytesToSubtract: number) {
    this.bytes.push(0x48, 0x83, 0xec, bytesToSubtract & 0xff);
  }

  movEcx32(value: number) {
    this.bytes.push(0xb9);
    this.push32(value);
  }

  movR8d32(value: number) {
    this.bytes.push(0x41, 0xb8);
    this.push32(value);
  }

  movRcxRax() {
    this.bytes.push(0x48, 0x89, 0xc1);
  }

  xorEcxEcx() {
    this.bytes.push(0x31, 0xc9);
  }

  movStackParamZero() {
    this.bytes.push(0x48, 0xc7, 0x44, 0x24, 0x20, 0x00, 0x00, 0x00, 0x00);
  }

  // FIX: Calculate displacement using current instruction length (7 bytes)
  leaRipRelative(
    reg: (typeof Register)[keyof typeof Register],
    textSectionRva: number,
    targetRva: number,
  ) {
    const instructionOffset = this.length;
    const ripAtNextInstruction = textSectionRva + instructionOffset + 7;
    const displacement = targetRva - ripAtNextInstruction;

    if (reg === Register.RDX) {
      this.bytes.push(0x48, 0x8d, 0x15);
    } else if (reg === Register.R9) {
      this.bytes.push(0x4c, 0x8d, 0x0d);
    }
    this.push32(displacement);
  }

  // FIX: Calculate displacement using current instruction length (6 bytes)
  callImport(textSectionRva: number, targetIatRva: number) {
    const instructionOffset = this.length;
    const ripAtNextInstruction = textSectionRva + instructionOffset + 6;
    const displacement = targetIatRva - ripAtNextInstruction;

    this.bytes.push(0xff, 0x15);
    this.push32(displacement);
  }

  private push32(val: number) {
    this.bytes.push(
      val & 0xff,
      (val >> 8) & 0xff,
      (val >> 16) & 0xff,
      (val >> 24) & 0xff,
    );
  }
}
