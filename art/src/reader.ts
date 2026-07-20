/** Little-endian cursor over a byte buffer. */
export class Reader {
  private view: DataView;

  constructor(readonly bytes: Uint8Array, public pos = 0) {
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  }

  u8(): number {
    return this.bytes[this.pos++]!;
  }

  u16(): number {
    const v = this.view.getUint16(this.pos, true);
    this.pos += 2;
    return v;
  }

  i16(): number {
    const v = this.view.getInt16(this.pos, true);
    this.pos += 2;
    return v;
  }

  u32(): number {
    const v = this.view.getUint32(this.pos, true);
    this.pos += 4;
    return v;
  }

  i32(): number {
    const v = this.view.getInt32(this.pos, true);
    this.pos += 4;
    return v;
  }

  raw(n: number): Uint8Array {
    const v = this.bytes.subarray(this.pos, this.pos + n);
    this.pos += n;
    return v;
  }

  /** NUL-terminated, latin-1 — the format predates any Unicode contract. */
  cstr(): string {
    const end = this.bytes.indexOf(0, this.pos);
    if (end < 0) throw new Error(`unterminated string at ${this.pos}`);
    let s = "";
    for (let i = this.pos; i < end; i++) s += String.fromCharCode(this.bytes[i]!);
    this.pos = end + 1;
    return s;
  }
}
