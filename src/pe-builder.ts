export class PEBuilder {
  public buffer: Uint8Array;
  public view: DataView;
  public offset: number = 0;

  constructor(size: number = 4096) {
    this.buffer = new Uint8Array(size);
    this.view = new DataView(this.buffer.buffer);
  }

  writeU8(val: number) {
    this.buffer[this.offset++] = val & 0xff;
  }
  writeU16(val: number) {
    this.view.setUint16(this.offset, val, true);
    this.offset += 2;
  }
  writeU32(val: number) {
    this.view.setUint32(this.offset, val, true);
    this.offset += 4;
  }
  writeU64(val: bigint) {
    this.view.setBigUint64(this.offset, val, true);
    this.offset += 8;
  }

  writeBytes(bytes: number[] | Uint8Array) {
    this.buffer.set(bytes, this.offset);
    this.offset += bytes.length;
  }

  writeString(str: string) {
    const encoded = new TextEncoder().encode(`${str}\0`);
    this.writeBytes(encoded);
  }

  seek(targetOffset: number) {
    this.offset = targetOffset;
  }

  padToAlignment(align: number) {
    const remainder = this.offset % align;
    if (remainder !== 0) {
      const paddingNeeded = align - remainder;
      for (let i = 0; i < paddingNeeded; i++) {
        this.writeU8(0);
      }
    }
  }

  get TrimmedBuffer(): Uint8Array {
    return this.buffer.subarray(0, this.offset);
  }

  writeHeaders(
    codeSize: number,
    dataSize: number,
    entryPointRva: number,
    importRva: number,
  ) {
    this.writeU8(0x4d);
    this.writeU8(0x5a);
    this.seek(0x3c);
    this.writeU32(0x80);

    this.seek(0x80);
    this.writeBytes([0x50, 0x45, 0x00, 0x00]);

    this.writeU16(0x8664); // x86_64
    this.writeU16(2); // 2 Sections
    this.writeU32(0);
    this.writeU32(0);
    this.writeU32(0);
    this.writeU16(0xf0);
    this.writeU16(0x0022);

    this.writeU16(0x020b); // PE32+
    this.writeU8(2);
    this.writeU8(25);
    this.writeU32(codeSize);
    this.writeU32(dataSize);
    this.writeU32(0);
    this.writeU32(entryPointRva);
    this.writeU32(entryPointRva);

    this.writeU64(0x00400000n);
    this.writeU32(0x1000);
    this.writeU32(0x200);
    this.writeU16(6);
    this.writeU16(0);
    this.writeU16(0);
    this.writeU16(0);
    this.writeU16(6);
    this.writeU16(0);
    this.writeU32(0);
    this.writeU32(0x3000);
    this.writeU32(0x200);
    this.writeU32(0);
    this.writeU16(3); // Windows Console CUI
    this.writeU16(0x8160);
    this.writeU64(0x100000n);
    this.writeU64(0x1000n);
    this.writeU64(0x100000n);
    this.writeU64(0x1000n);
    this.writeU32(0);
    this.writeU32(16);

    for (let i = 0; i < 16; i++) {
      if (i === 1) {
        this.writeU32(importRva);
        this.writeU32(40);
      } else {
        this.writeU32(0);
        this.writeU32(0);
      }
    }

    // .text Section Header
    this.seek(0x188);
    this.writeBytes([0x2e, 0x74, 0x65, 0x78, 0x74, 0x00, 0x00, 0x00]);
    this.writeU32(0x200);
    this.writeU32(0x1000);
    this.writeU32(0x200);
    this.writeU32(0x200);
    this.writeU32(0);
    this.writeU32(0);
    this.writeU16(0);
    this.writeU16(0);
    this.writeU32(0x60000020);

    // .rdata Section Header
    const alignedDataSize = Math.ceil(dataSize / 0x200) * 0x200;
    this.seek(0x1b0);
    this.writeBytes([0x2e, 0x72, 0x64, 0x61, 0x74, 0x00, 0x00, 0x00]);
    this.writeU32(dataSize);
    this.writeU32(0x2000);
    this.writeU32(alignedDataSize);
    this.writeU32(0x400);
    this.writeU32(0);
    this.writeU32(0);
    this.writeU16(0);
    this.writeU16(0);
    this.writeU32(0xc0000040);

    this.padToAlignment(0x200);
  }
}
