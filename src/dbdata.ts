import { DbError } from "./dberror.ts";

export interface DbEntry {
  key: DbData;
  data: DbData;
}

export class DbData {
  fdata: BigUint64Array;
  constructor(wrapper?: BigUint64Array) {
    if (wrapper) {
      if (wrapper.length !== 2) {
        throw new DbError(
          "DbData: wrapper must be a BigUint64Array of length 2"
        );
      }
      this.fdata = wrapper;
    } else this.fdata = new BigUint64Array(2);
  }
  get size() {
    return Number(this.fdata[0]);
  }
  get data() {
    const ptr = new Deno.UnsafePointer(this.fdata[1]);
    return new Deno.UnsafePointerView(ptr).getArrayBuffer(this.size);
  }
  set data(buf: ArrayBuffer) {
    this.fdata[0] = BigInt(buf.byteLength);
    this.fdata[1] = Deno.UnsafePointer.of(new Uint8Array(buf)).value;
  }
}

export interface DbString {
  readonly size: number;
  data: string;
}

export interface DbNumber {
  data: string;
}
