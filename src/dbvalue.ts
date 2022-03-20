export class DbValue {
  byteArray: BigUint64Array;
  constructor(wrapper?: BigUint64Array) {
    if (wrapper) this.byteArray = wrapper;
    else this.byteArray = new BigUint64Array(2);
  }
  get size() {
    return Number(this.byteArray[0]);
  }
  get data() {
    const ptr = new Deno.UnsafePointer(this.byteArray[1]);
    return new Deno.UnsafePointerView(ptr).getArrayBuffer(this.size);
  }
  set data(buf: ArrayBuffer) {
    this.byteArray[0] = BigInt(buf.byteLength);
    this.byteArray[1] = Deno.UnsafePointer.of(new Uint8Array(buf)).value;
  }
}
