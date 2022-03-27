export type U64 = number /** unsigned 64-bit integer */;
export type Key = ArrayBuffer | string | U64;
export type Value = ArrayBuffer | string | number | boolean;

export const encoder = new TextEncoder();
export const decoder = new TextDecoder();

export function assertU64(num: number) {
  if (
    typeof num !== "number" ||
    num < 0 ||
    num > Number.MAX_SAFE_INTEGER ||
    Math.floor(num) !== num
  ) {
    throw new TypeError(
      `${num} is not a valid non-zero integer below Number.MAX_SAFE_INTEGER`
    );
  }
}

export function encodeKey(key: Key): ArrayBuffer {
  if (key instanceof ArrayBuffer) return key;
  if (typeof key === "string") return encoder.encode(key);
  if (typeof key === "number") {
    assertU64(key);
    return new BigUint64Array([BigInt(key)]).buffer;
  }
  throw new TypeError(`Invalid key: ${key}`);
}

export function encodeValue(value: Value): ArrayBuffer {
  if (value instanceof ArrayBuffer) return value;
  if (typeof value === "string") return encoder.encode(value);
  if (typeof value === "number") return new Float64Array([value]).buffer;
  if (typeof value === "boolean") {
    return value ? new Uint8Array([1]) : new Uint8Array([0]);
  }
  throw new TypeError(`Invalid value: ${value}`);
}
