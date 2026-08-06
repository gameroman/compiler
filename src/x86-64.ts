export const Register = {
  RCX: 1,
  RDX: 2,
  R8: 8,
  R9: 9,
  RSP: 4,
  RAX: 0,
  RBX: 3,
  RDI: 7,
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

  movRbxRax() {
    this.bytes.push(0x48, 0x89, 0xc3);
  }

  movRcxRbx() {
    this.bytes.push(0x48, 0x89, 0xd9);
  }

  movRdxRdi() {
    this.bytes.push(0x48, 0x89, 0xfa);
  }

  movRaxImm32(value: number) {
    this.bytes.push(0x48, 0xc7, 0xc0);
    this.push32(value);
  }

  addRaxImm32(value: number) {
    this.bytes.push(0x48, 0x05);
    this.push32(value);
  }

  subRaxImm32(value: number) {
    this.bytes.push(0x48, 0x2d);
    this.push32(value);
  }

  subRaxRdx() {
    this.bytes.push(0x48, 0x29, 0xd0);
  }

  xchgRaxRdx() {
    this.bytes.push(0x48, 0x92);
  }

  imulRaxImm32(value: number) {
    this.bytes.push(0x48, 0x69, 0xc0);
    this.push32(value);
  }

  imulRaxRdx() {
    this.bytes.push(0x48, 0x0f, 0xaf, 0xc2);
  }

  negRax() {
    this.bytes.push(0x48, 0xf7, 0xd8);
  }

  xorRsiRsi() {
    this.bytes.push(0x48, 0x31, 0xf6);
  }

  incRsi() {
    this.bytes.push(0x48, 0xff, 0xc6);
  }

  testRsiRsi() {
    this.bytes.push(0x48, 0x85, 0xf6);
  }

  pushRax() {
    this.bytes.push(0x50);
  }

  popRdx() {
    this.bytes.push(0x5a);
  }

  addRaxRdx() {
    this.bytes.push(0x48, 0x01, 0xd0);
  }

  xorEdxEdx() {
    this.bytes.push(0x31, 0xd2);
  }

  divRcx() {
    this.bytes.push(0x48, 0xf7, 0xf1);
  }

  addDlImm(value: number) {
    this.bytes.push(0x80, 0xc2, value & 0xff);
  }

  decRdi() {
    this.bytes.push(0x48, 0xff, 0xcf);
  }

  movByteRdiImm(value: number) {
    this.bytes.push(0xc6, 0x07, value & 0xff);
  }

  movByteRdiDl() {
    this.bytes.push(0x88, 0x17);
  }

  incR8d() {
    this.bytes.push(0x41, 0xff, 0xc0);
  }

  testRaxRax() {
    this.bytes.push(0x48, 0x85, 0xc0);
  }

  jnzBackwardTo(targetLength: number) {
    const displacement = targetLength - (this.length + 2);
    this.bytes.push(0x75, displacement & 0xff);
  }

  jnsForward() {
    this.bytes.push(0x79, 0x00);
    return this.length - 1;
  }

  jzForward() {
    this.bytes.push(0x74, 0x00);
    return this.length - 1;
  }

  patchShortJump(displacementByteIndex: number) {
    const targetLength = this.length;
    this.bytes[displacementByteIndex] =
      targetLength - (displacementByteIndex + 1);
  }

  xorEcxEcx() {
    this.bytes.push(0x31, 0xc9);
  }

  writeBytes(bytes: number[]) {
    this.bytes.push(...bytes);
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
    } else if (reg === Register.RDI) {
      this.bytes.push(0x48, 0x8d, 0x3d);
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
