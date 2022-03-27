import { Key } from "./util.ts";
import { lmdb, MDB_KEYEXIST, MDB_NOTFOUND } from "./lmdb_ffi.ts";

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

/**
 * Thrown when a PUT operation is executed with the noOverwrite flag,
 * and the given key already exists.
 */
export class KeyExistsError<K extends Key = string> extends DbError {
  /** The db key which already exists */
  key: Key;
  /** The current db value in the database */
  value: ArrayBuffer;
  constructor(key: Key, value: ArrayBuffer, message?: string) {
    if (!message) message = DbError.errorMessage(MDB_KEYEXIST);
    super(message, MDB_KEYEXIST);
    this.key = key;
    this.value = value;
  }
}

export class NotFoundError extends DbError {
  key: Key;
  constructor(key: Key, message?: string) {
    if (!message) message = DbError.errorMessage(MDB_NOTFOUND);
    super(message, MDB_NOTFOUND);
    this.key = key;
  }
}

export function notImplemented() {
  return new Error("Not implemented");
}
