import { lmdb } from "./lmdb_ffi.ts";

export class DbError extends Error {
  code: number;
  constructor(message: string, code: number = -1) {
    super(message);
    this.code = code;
  }

  private static errors: Record<number, string> = {};
  static errorMessage(code: number): string {
    if (!DbError.errors[code]) {
      const errorPtr = lmdb.ffi_strerror(code);
      DbError.errors[code] =
        new Deno.UnsafePointerView(errorPtr).getCString() ||
        `Unknown error type (${code})`;
    }
    return DbError.errors[code];
  }
  static from(code: number) {
    const message = DbError.errorMessage(code);
    return new DbError(message, code);
  }
}

export function notImplemented() {
  return new Error("Not implemented");
}
