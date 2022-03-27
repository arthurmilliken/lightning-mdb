import { copy } from "https://deno.land/std@0.130.0/bytes/mod.ts";
import * as log from "https://deno.land/std@0.130.0/log/mod.ts";

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
import { Key, encodeKey, decoder, Value, encodeValue } from "./util.ts";

export interface DbFlags {
  create?: boolean;
  reverseKey?: boolean;
  integerKey?: boolean;
}

export interface PutFlags {
  noOverwrite?: boolean;
  append?: boolean;
}

export const notOpen = () => new DbError("Database is already closed");
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
    txnOrEnv: Transaction | Environment,
    flags: number | DbFlags = 0
  ) {
    this.name = name;
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
    let txn: Transaction;
    if (txnOrEnv instanceof Transaction) {
      txn = txnOrEnv;
      this.env = txn.env;
      const rc = lmdb.ffi_dbi_open(txn.ftxn, fname, this.flags, fdbi);
      if (rc) throw DbError.from(rc);
    } else if (txnOrEnv instanceof Environment) {
      this.env = txnOrEnv;
      txn = new Transaction(txnOrEnv, false);
      const rc = lmdb.ffi_dbi_open(txn.ftxn, fname, this.flags, fdbi);
      if (rc) {
        txn.abort();
        throw DbError.from(rc);
      } else txn.commit();
    } else
      throw new TypeError("txnOrEnv must be either Transaction or Environment");
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
  getUnsafe(key: K, txn?: Transaction): ArrayBuffer {
    if (!this.dbi) throw notOpen();
    this.encodeKey(key);
    const rc = this.useTransaction((useTxn) => {
      return lmdb.ffi_get(
        useTxn.ftxn,
        this.dbi,
        this.dbKey.fdata,
        this.dbValue.fdata
      );
    }, txn);
    if (rc === MDB_NOTFOUND) throw new NotFoundError(key);
    else if (rc) throw DbError.from(rc);
    return this.dbValue.data;
  }

  get(key: K, txn?: Transaction): ArrayBuffer {
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

  getString(key: K, txn?: Transaction): string {
    return decoder.decode(this.getUnsafe(key, txn));
  }

  getNumber(key: K, txn?: Transaction): number {
    return new Float64Array(this.getUnsafe(key, txn))[0];
  }

  getBoolean(key: K, txn?: Transaction): boolean {
    return !!new Uint8Array(this.getUnsafe(key, txn))[0];
  }

  protected _put(key: K, value: Value, txn: Transaction, flags = 0) {
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

  async putAsync(key: K, value: Value, flags?: PutFlags): Promise<void> {
    const txn = new Transaction(this.env, false);
    try {
      this.put(key, value, txn, flags);
      await txn.commit();
    } catch (err) {
      txn.abort();
      throw err;
    }
  }

  del(key: K, txn: Transaction): void {
    this.encodeKey(key);
    const rc = lmdb.ffi_del(txn.ftxn, this.dbi, this.dbKey.fdata);
    if (rc) throw DbError.from(rc);
  }

  async delAsync(key: K): Promise<void> {
    const txn = new Transaction(this.env, false);
    try {
      this.del(key, txn);
      await txn.commit();
    } catch (err) {
      txn.abort();
      throw err;
    }
  }

  stat(txn?: Transaction): DbStat {
    if (!this.dbi) throw notOpen();
    return this.useTransaction((useTxn) => {
      const fstat = new Float64Array(DbStat.LENGTH);
      const rc = lmdb.ffi_stat(useTxn.ftxn, this.dbi, fstat);
      if (rc) throw DbError.from(rc);
      return new DbStat(fstat);
    }, txn);
  }

  drop(txn: Transaction, del = DROP_DELETE): void {
    if (!this.dbi) throw notOpen();
    const rc = lmdb.ffi_drop(txn.ftxn, this.dbi, del);
    if (rc) throw DbError.from(rc);
    if (del === DROP_DELETE) this.dbi = 0;
  }

  async dropAsync(del = DROP_DELETE): Promise<void> {
    const txn = new Transaction(this.env, false);
    try {
      this.drop(txn, del);
      await txn.commit();
    } catch (err) {
      txn.abort();
      throw err;
    }
  }

  clear = (txn: Transaction) => this.drop(txn, DROP_EMPTY);

  clearAsync = () => this.dropAsync(DROP_EMPTY);

  private fflags = new Uint32Array(1);
  protected _getFlags(txn?: Transaction): number {
    return this.useTransaction((useTxn) => {
      if (!this.dbi) throw notOpen();
      const rc = lmdb.ffi_dbi_flags(useTxn.ftxn, this.dbi, this.fflags);
      if (rc) throw DbError.from(rc);
      return this.fflags[0];
    }, txn);
  }

  getFlags(txn?: Transaction): DbFlags {
    return this.useTransaction((useTxn) => {
      const flags = this._getFlags(useTxn);
      return {
        create: !!(flags & MDB_CREATE),
        reverseKey: !!(flags & MDB_REVERSEKEY),
        integerKey: !!(flags & MDB_INTEGERKEY),
      };
    }, txn);
  }

  protected dbValueB = new DbData();
  compare(a: ArrayBuffer, b: ArrayBuffer, txn?: Transaction): number {
    return this.useTransaction((useTxn) => {
      if (!this.dbi) throw notOpen();
      this.dbValue.data = a;
      this.dbValueB.data = b;
      return lmdb.ffi_cmp(
        useTxn.ftxn,
        this.dbi,
        this.dbValue.fdata,
        this.dbValueB.fdata
      );
    }, txn);
  }

  /**
   * Helper method for performing read-only queries with an optional
   * transaction.
   *
   * If the user omits passing a transaction, then useTransaction
   * will create a temporary read-only transaction, pass it into the callback,
   * abort the temp transaction, and return the same value returned from the
   * callback.
   *
   * If the user supplies a transaction, then that transaction is
   * passed into the callback, and it is up to the user to commit or abort,
   * either within the callback or afterwards.
   *
   * @template T
   * @param callback performs business logic with the supplied txn or
   *                 creating a new one. Should return T
   * @param txn if supplied, use this transaction, otherwise create a
   *            temporary read-only transaction. Optional.
   * @returns {T}
   *
   * @example
   * // Create a temporary read-only transaction and automatically abort
   * let db: Database;
   * // ...initialize db
   * const stat: Stat = db.useTransaction((useTxn) => {
   *   return db.stat(useTxn);
   * });
   *
   * @example
   * // Use a pre-existing transaction, which must be committed manually
   * let myTxn: Transaction, db: Database;
   * // ...initialize myTxn and db
   * const success: boolean = db.useTransaction((useTxn) => {
   *   // ...perform business logic
   *   if (businessLogicSucceeded) return true;
   *   else return false;
   * }, myTxn)
   * if (success) myTxn.commit();
   * else myTxn.abort();
   */
  useTransaction<T>(
    callback: (useTxn: Transaction) => T,
    txn?: Transaction
  ): T {
    let useTxn: Transaction;
    if (txn) useTxn = txn;
    else useTxn = new Transaction(this.env, true);
    try {
      return callback(useTxn);
    } finally {
      if (!txn && useTxn.isOpen) useTxn.abort();
    }
  }
}

async function main() {
  try {
    const env = await new Environment({ path: "testdb" }).open();
    const db = new Database(null, env);
    try {
      await db.clearAsync();
      await db.putAsync("a", "apple-fu");
      log.info({ a: db.getString("a") });
      await db.putAsync("b", "banana-fu");
      log.info({ b: db.getString("b") });
      await db.putAsync("c", "cherry-fu");
      log.info({ c: db.getString("c") });

      await db.putAsync("true", true);
      await db.putAsync("false", false);
      log.info({
        true: db.getBoolean("true"),
        false: db.getBoolean("false"),
      });
    } catch (err) {
      log.error(err);
    }
    await env.close();
  } catch (err) {
    console.error(err);
  }
}

if (import.meta.main) main();
