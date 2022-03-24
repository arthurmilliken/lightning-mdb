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
export class Database {
  name: string | null;
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
      const nameVal = new DbData();
      nameVal.data = new TextEncoder().encode(name);
      fname = nameVal.fdata;
    }
    const fdbi = new Uint32Array(1);
    const rc = lmdb.ffi_dbi_open(txn.ftxn, fname, this.flags, fdbi);
    if (rc) throw DbError.from(rc);
    this.dbi = fdbi[0];
  }

  /**
   * NOTE: the data returned is owned by the database, may not be modified
   *       in any way, and is only valid until the next update or end of
   *       transaction.
   * @param key
   * @param txn
   */
  getUnsafe(key: ArrayBuffer, txn: Transaction): ArrayBuffer {
    if (!this.dbi) throw notOpen();
    this.dbKey.data = key;
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

  get(key: ArrayBuffer, txn: Transaction): ArrayBuffer {
    try {
      const valueU8 = new Uint8Array(this.getUnsafe(key, txn));
      const valueCopy = new Uint8Array(valueU8.length);
      copy(valueU8, valueCopy);
      return valueCopy;
    } catch (err) {
      if (err instanceof NotFoundError) {
        const keyCopy = new Uint8Array(key.byteLength);
        copy(new Uint8Array(key), keyCopy);
        err.key = keyCopy;
      }
      throw err;
    }
  }

  protected _put(
    key: ArrayBuffer,
    data: ArrayBuffer,
    txn: Transaction,
    flags: number
  ) {
    this.dbKey.data = key;
    this.dbValue.data = data;
    const rc = lmdb.ffi_put(
      txn.ftxn,
      this.dbi,
      this.dbKey.fdata,
      this.dbValue.fdata,
      flags
    );
    if (rc === MDB_KEYEXIST)
      throw new KeyExistsError(this.dbKey.data, this.dbValue.data);
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
  putUnsafe(
    key: ArrayBuffer,
    value: ArrayBuffer,
    txn: Transaction,
    flags?: PutFlags
  ): void {
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

  put(
    key: ArrayBuffer,
    value: ArrayBuffer,
    txn: Transaction,
    flags?: PutFlags
  ): void {
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

  del(key: ArrayBuffer, txn: Transaction): void {
    this.dbKey.data = key;
    const rc = lmdb.ffi_del(txn.ftxn, this.dbi, this.dbKey.fdata);
    if (rc) throw DbError.from(rc);
  }

  stat(txn: Transaction): DbStat {
    if (!this.dbi) throw notOpen();
    const fstat = new Float64Array(DbStat.LENGTH);
    const rc = lmdb.ffi_stat(txn.ftxn, this.dbi, fstat);
    if (rc) throw DbError.from(rc);
    return new DbStat(fstat);
  }

  drop(txn: Transaction, del = DROP_DELETE): void {
    if (!this.dbi) throw notOpen();
    const rc = lmdb.ffi_drop(txn.ftxn, this.dbi, del);
    if (rc) throw DbError.from(rc);
    if (del === DROP_DELETE) this.dbi = 0;
  }

  clear = (txn: Transaction) => this.drop(txn, DROP_EMPTY);

  private fflags = new Uint32Array(1);
  protected _getFlags(txn: Transaction): number {
    if (!this.dbi) throw notOpen();
    const rc = lmdb.ffi_dbi_flags(txn.ftxn, this.dbi, this.fflags);
    if (rc) throw DbError.from(rc);
    return this.fflags[0];
  }

  getFlags(txn: Transaction): DbFlags {
    const flags = this._getFlags(txn);
    return {
      create: !!(flags & MDB_CREATE),
      reverseKey: !!(flags & MDB_REVERSEKEY),
      integerKey: !!(flags & MDB_INTEGERKEY),
    };
  }

  protected dbValueB = new DbData();
  compare(txn: Transaction, a: ArrayBuffer, b: ArrayBuffer): number {
    this.dbValue.data = a;
    this.dbValueB.data = b;
    return lmdb.ffi_cmp(
      txn.ftxn,
      this.dbi,
      this.dbValue.fdata,
      this.dbValueB.fdata
    );
  }
}

import * as log from "https://deno.land/std@0.130.0/log/mod.ts";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

async function main() {
  try {
    const env = await new Environment({ path: "testdb" }).open();
    const writer = new Transaction(env);
    const db = new Database(null, writer);
    try {
      db.put(encoder.encode("a"), encoder.encode("apple"), writer);
      const abuf = db.getUnsafe(encoder.encode("a"), writer);
      db.put(encoder.encode("b"), encoder.encode("banana"), writer);
      log.info({ abuf: decoder.decode(abuf) });
      db.put(encoder.encode("c"), encoder.encode("cherry"), writer);
      await writer.commit();
      log.info({ m: "after commit()", abuf: decoder.decode(abuf) });
    } catch (err) {
      log.error(err);
      writer.abort();
    }
    await true;
  } catch (err) {
    console.error(err);
  }
}

if (import.meta.main) main();
