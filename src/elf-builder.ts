const ELF_HEADER_SIZE = 64;
const PROGRAM_HEADER_SIZE = 56;

const IMAGE_BASE = 0x400000;
const TEXT_FILE_OFFSET = 0x1000;
const TEXT_RVA = 0x1000;
const RDATA_FILE_OFFSET = 0x2000;
const RDATA_RVA = 0x2000;

export class ELFBuilder {
  public buffer: Uint8Array;
  public view: DataView;
  public offset: number = 0;

  constructor(size: number = 8192) {
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

  writeHeaders(codeSize: number, dataSize: number) {
    const alignedCodeSize = Math.ceil(codeSize / 0x200) * 0x200;
    const textEnd = TEXT_FILE_OFFSET + alignedCodeSize;

    this.seek(0);

    // e_ident
    this.writeBytes([0x7f, 0x45, 0x4c, 0x46]);
    this.writeU8(2); // EI_CLASS: 64-bit
    this.writeU8(1); // EI_DATA: little-endian
    this.writeU8(1); // EI_VERSION
    this.writeU8(0); // EI_OSABI
    this.writeU8(0); // EI_ABIVERSION
    for (let i = 0; i < 7; i++) {
      this.writeU8(0);
    }

    this.writeU16(2); // e_type: ET_EXEC
    this.writeU16(0x3e); // e_machine: EM_X86_64
    this.writeU32(1); // e_version
    this.writeU64(BigInt(IMAGE_BASE + TEXT_RVA)); // e_entry
    this.writeU64(BigInt(ELF_HEADER_SIZE)); // e_phoff
    this.writeU64(0n); // e_shoff
    this.writeU32(0); // e_flags
    this.writeU16(ELF_HEADER_SIZE); // e_ehsize
    this.writeU16(PROGRAM_HEADER_SIZE); // e_phentsize
    this.writeU16(2); // e_phnum
    this.writeU16(0); // e_shentsize
    this.writeU16(0); // e_shnum
    this.writeU16(0); // e_shstrndx

    // Program header 1: headers + .text (R+X)
    this.writeU32(1); // p_type: PT_LOAD
    this.writeU32(5); // p_flags: PF_R | PF_X
    this.writeU64(0n); // p_offset
    this.writeU64(BigInt(IMAGE_BASE)); // p_vaddr
    this.writeU64(BigInt(IMAGE_BASE)); // p_paddr
    this.writeU64(BigInt(textEnd)); // p_filesz
    this.writeU64(BigInt(textEnd)); // p_memsz
    this.writeU64(0x1000n); // p_align

    // Program header 2: .rdata (R+W)
    this.writeU32(1); // p_type: PT_LOAD
    this.writeU32(6); // p_flags: PF_R | PF_W
    this.writeU64(BigInt(RDATA_FILE_OFFSET)); // p_offset
    this.writeU64(BigInt(IMAGE_BASE + RDATA_RVA)); // p_vaddr
    this.writeU64(BigInt(IMAGE_BASE + RDATA_RVA)); // p_paddr
    this.writeU64(BigInt(dataSize)); // p_filesz
    this.writeU64(BigInt(dataSize)); // p_memsz
    this.writeU64(0x1000n); // p_align
  }
}
