import { copy } from "https://deno.land/std@0.130.0/bytes/mod.ts";

import {
  lmdb,
  MDB_APPEND,
  MDB_CREATE,
  MDB_INTEGERKEY,
  MDB_KEYEXIST,
  MDB_NOOVERWRITE,
  MDB_NOTFOUND,
  MDB_REVERSEKEY,
} from "./lmdb_ffi.ts";
import { DbError, KeyExistsError, NotFoundError } from "./dberror.ts";
import { Transaction } from "./transaction.ts";
import { DbData } from "./dbdata.ts";
import { DbStat } from "./dbstat.ts";
import { Environment } from "./environment.ts";

export type U64 = number /** unsigned 64-bit integer */;
export type Key = ArrayBuffer | string | U64;
export type Value = ArrayBuffer | string | number | boolean;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

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

export interface DbFlags {
  create?: boolean;
  reverseKey?: boolean;
  integerKey?: boolean;
}

export interface PutFlags {
  noOverwrite?: boolean;
  append?: boolean;
}

export const notOpen = () => new DbError("Database is not open.");
const DROP_EMPTY = 0;
const DROP_DELETE = 1;

/**
 * A Key/Value store.
 */
export class Database<K extends Key = string> {
  name: string | null;
  env: Environment;
  flags: number;
  dbi: number;

  protected dbKey = new DbData();
  protected dbValue = new DbData();

  constructor(
    name: string | null,
    txn: Transaction,
    flags: number | DbFlags = 0
  ) {
    this.name = name;
    this.env = txn.env;
    if (typeof flags === "number") {
      this.flags = flags;
    } else {
      this.flags =
        (flags.create ? MDB_CREATE : 0) |
        (flags.reverseKey ? MDB_REVERSEKEY : 0) |
        (flags.integerKey ? MDB_INTEGERKEY : 0);
    }
    let fname: BigUint64Array | null;
    if (!name) fname = null;
    else {
      const nameData = new DbData();
      nameData.data = new TextEncoder().encode(name);
      fname = nameData.fdata;
    }
    const fdbi = new Uint32Array(1);
    const rc = lmdb.ffi_dbi_open(txn.ftxn, fname, this.flags, fdbi);
    if (rc) throw DbError.from(rc);
    this.dbi = fdbi[0];
  }

  protected encodeKey(key: K): void {
    if (typeof key === "number" && !(this.flags & MDB_INTEGERKEY))
      throw new DbError("This database does not support integer keys");
    this.dbKey.data = encodeKey(key);
  }

  /**
   * NOTE: the data returned is owned by the database, may not be modified
   *       in any way, and is only valid until the next update or end of
   *       transaction.
   * @param key
   * @param txn
   */
  getUnsafe(key: K, txn: Transaction): ArrayBuffer {
    if (!this.dbi) throw notOpen();
    this.encodeKey(key);
    const rc = lmdb.ffi_get(
      txn.ftxn,
      this.dbi,
      this.dbKey.fdata,
      this.dbValue.fdata
    );
    if (rc === MDB_NOTFOUND) throw new NotFoundError(key);
    else if (rc) throw DbError.from(rc);
    return this.dbValue.data;
  }

  get(key: K, txn: Transaction): ArrayBuffer {
    try {
      const valueU8 = new Uint8Array(this.getUnsafe(key, txn));
      const valueCopy = new Uint8Array(valueU8.length);
      copy(valueU8, valueCopy);
      return valueCopy;
    } catch (err) {
      if (err instanceof NotFoundError) {
        if (typeof key === "string" || typeof key === "number") throw err;
        const keyCopy = new Uint8Array(key.byteLength);
        copy(new Uint8Array(key), keyCopy);
        err.key = keyCopy;
      }
      throw err;
    }
  }

  getString(key: K, txn: Transaction): string {
    return decoder.decode(this.getUnsafe(key, txn));
  }

  getNumber(key: K, txn: Transaction): number {
    const buf = this.getUnsafe(key, txn);
    return new Float64Array(buf)[0];
  }

  getBoolean(key: K, txn: Transaction): boolean {
    const buf = this.getUnsafe(key, txn);
    return !!new Uint8Array(buf)[0];
  }

  protected _put(key: K, value: Value, txn: Transaction, flags: number) {
    if (!this.dbi) throw notOpen();
    this.encodeKey(key);
    this.dbValue.data = encodeValue(value);
    const rc = lmdb.ffi_put(
      txn.ftxn,
      this.dbi,
      this.dbKey.fdata,
      this.dbValue.fdata,
      flags
    );
    if (rc === MDB_KEYEXIST) throw new KeyExistsError(key, this.dbValue.data);
    else if (rc) throw DbError.from(rc);
  }

  /**
   * NOTE: when throwing a KeyExistsError, err.data is owned by the database,
   *       and may not be modified in any way, and is only valid until the
   *       next update or end of transaction.
   * @param key
   * @param value
   * @param txn
   * @param flags
   */
  putUnsafe(key: K, value: Value, txn: Transaction, flags?: PutFlags): void {
    return this._put(
      key,
      value,
      txn,
      flags
        ? (flags.append ? MDB_APPEND : 0) |
            (flags.noOverwrite ? MDB_NOOVERWRITE : 0)
        : 0
    );
  }

  put(key: K, value: Value, txn: Transaction, flags?: PutFlags): void {
    try {
      this.putUnsafe(key, value, txn, flags);
    } catch (err) {
      if (err instanceof KeyExistsError) {
        const keyU8 = new Uint8Array(this.dbKey.data);
        const keyCopy = new Uint8Array(this.dbKey.size);
        copy(keyU8, keyCopy);
        const valueU8 = new Uint8Array(this.dbValue.data);
        const valueCopy = new Uint8Array(this.dbValue.size);
        copy(valueU8, valueCopy);
        throw new KeyExistsError(keyCopy, valueCopy);
      } else throw err;
    }
  }

  del(key: K, txn?: Transaction): void {
    if (!this.dbi) throw notOpen();
    return this.useTransaction(
      (useTxn) => {
        this.encodeKey(key);
        const rc = lmdb.ffi_del(useTxn.ftxn, this.dbi, this.dbKey.fdata);
        if (rc) throw DbError.from(rc);
      },
      txn,
      false
    );
  }

  stat(txn?: Transaction): DbStat {
    if (!this.dbi) throw notOpen();
    return this.useTransaction(
      (useTxn) => {
        const fstat = new Float64Array(DbStat.LENGTH);
        const rc = lmdb.ffi_stat(useTxn.ftxn, this.dbi, fstat);
        if (rc) throw DbError.from(rc);
        return new DbStat(fstat);
      },
      txn,
      true
    );
  }

  drop(txn?: Transaction, del = DROP_DELETE): void {
    this.useTransaction(
      (useTxn) => {
        if (!this.dbi) throw notOpen();
        const rc = lmdb.ffi_drop(useTxn.ftxn, this.dbi, del);
        if (rc) throw DbError.from(rc);
        if (del === DROP_DELETE) this.dbi = 0;
      },
      txn,
      false
    );
  }

  clear = (txn?: Transaction) => this.drop(txn, DROP_EMPTY);

  private fflags = new Uint32Array(1);
  protected _getFlags(txn?: Transaction): number {
    return this.useTransaction(
      (useTxn) => {
        if (!this.dbi) throw notOpen();
        const rc = lmdb.ffi_dbi_flags(useTxn.ftxn, this.dbi, this.fflags);
        if (rc) throw DbError.from(rc);
        return this.fflags[0];
      },
      txn,
      true
    );
  }

  getFlags(txn?: Transaction): DbFlags {
    return this.useTransaction(
      (useTxn) => {
        const flags = this._getFlags(useTxn);
        return {
          create: !!(flags & MDB_CREATE),
          reverseKey: !!(flags & MDB_REVERSEKEY),
          integerKey: !!(flags & MDB_INTEGERKEY),
        };
      },
      txn,
      true
    );
  }

  protected dbValueB = new DbData();
  compare(a: ArrayBuffer, b: ArrayBuffer, txn?: Transaction): number {
    return this.useTransaction(
      (useTxn) => {
        if (!this.dbi) throw notOpen();
        this.dbValue.data = a;
        this.dbValueB.data = b;
        return lmdb.ffi_cmp(
          useTxn.ftxn,
          this.dbi,
          this.dbValue.fdata,
          this.dbValueB.fdata
        );
      },
      txn,
      true
    );
  }

  protected useTransaction<T>(
    callback: (useTxn: Transaction) => T,
    txn?: Transaction,
    readonly?: boolean
  ) {
    let useTxn: Transaction;
    if (txn) useTxn = txn;
    else useTxn = new Transaction(this.env, readonly);
    try {
      const result = callback(useTxn);
      if (!txn && useTxn.isOpen) useTxn.commit();
      return result;
    } catch (err) {
      if (!txn && useTxn.isOpen) useTxn.abort();
      throw err;
    }
  }
}

import * as log from "https://deno.land/std@0.130.0/log/mod.ts";

async function main() {
  try {
    const env = await new Environment({ path: "testdb" }).open();
    const txn = new Transaction(env);
    const db = new Database(null, txn);
    try {
      db.clear(txn);
      db.put("a", "apple-fu", txn);
      log.info({ a: db.getString("a", txn) });
      db.put("b", "banana-fu", txn);
      log.info({ b: db.getString("b", txn) });
      db.put("c", "cherry-fu", txn);
      log.info({ c: db.getString("c", txn) });

      db.put("true", true, txn);
      db.put("false", false, txn);
      log.info({
        true: db.getBoolean("true", txn),
        false: db.getBoolean("false", txn),
      });

      txn.commit();
    } catch (err) {
      log.error(err);
      txn.abort();
    }
    await env.close();
  } catch (err) {
    console.error(err);
  }
}

if (import.meta.main) main();
