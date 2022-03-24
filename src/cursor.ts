import { copy } from "https://deno.land/std@0.130.0/bytes/mod.ts";
import { Database, PutFlags } from "./database.ts";
import {
  DbError,
  KeyExistsError,
  NotFoundError,
  notImplemented,
} from "./dberror.ts";
import { DbData } from "./dbdata.ts";
import {
  lmdb,
  CursorOp,
  MDB_NOTFOUND,
  MDB_APPEND,
  MDB_CURRENT,
  MDB_NOOVERWRITE,
  MDB_KEYEXIST,
} from "./lmdb_ffi.ts";
import { Transaction } from "./transaction.ts";

export interface CursorOptions {
  start?: ArrayBuffer;
  end?: ArrayBuffer;
  reverse?: boolean;
  limit?: number;
  offset?: number;
}

export class CursorItem {
  keyUnsafe: ArrayBuffer;
  valueUnsafe: ArrayBuffer;
  constructor(key: ArrayBuffer, value: ArrayBuffer) {
    this.keyUnsafe = key;
    this.valueUnsafe = value;
  }
  key(): ArrayBuffer {
    const src = new Uint8Array(this.keyUnsafe);
    const data = new Uint8Array(src.length);
    copy(src, data);
    return data.buffer;
  }
  value(): ArrayBuffer {
    const src = new Uint8Array(this.valueUnsafe);
    const data = new Uint8Array(src.length);
    copy(src, data);
    return data.buffer;
  }
}

export interface CursorPutFlags extends PutFlags {
  /**
   * replace the item at the current cursor position.
   * The key parameter must still be provided, and must match it.
   * This is intended to be used when the new data is the same
   * size as the old. Otherwise it will simply perform a delete
   * of the old record followed by an insert.
   */
  current?: boolean;
}

export class Cursor implements Iterable<CursorItem> {
  fcursor = new BigUint64Array(1);
  txn: Transaction;
  db: Database;
  options?: CursorOptions;

  protected dbKey = new DbData();
  protected dbValue = new DbData();

  constructor(txn: Transaction, db: Database, options?: CursorOptions) {
    this.txn = txn;
    this.db = db;
    this.options = options;
    const rc = lmdb.ffi_cursor_open(txn.ftxn, db.dbi, this.fcursor);
    if (rc) throw DbError.from(rc);
  }

  close(): void {
    lmdb.ffi_cursor_close(this.fcursor);
  }

  renew(txn: Transaction): void {
    const rc = lmdb.ffi_cursor_renew(txn.ftxn, this.fcursor);
    if (rc === MDB_NOTFOUND) this.close();
    throw notImplemented();
  }

  protected _get(op: CursorOp): number {
    return lmdb.ffi_cursor_get(
      this.fcursor,
      this.dbKey.fdata,
      this.dbValue.fdata,
      op
    );
  }

  protected get(op: CursorOp): CursorItem | null {
    const rc = this._get(op);
    if (rc === MDB_NOTFOUND) {
      return null;
    } else if (rc) throw DbError.from(rc);
    else return new CursorItem(this.dbKey.data, this.dbValue.data);
  }

  first(): CursorItem | null {
    return this.get(CursorOp.FIRST);
  }

  last(): CursorItem | null {
    return this.get(CursorOp.LAST);
  }

  next(): CursorItem | null {
    return this.get(CursorOp.NEXT);
  }

  prev(): CursorItem | null {
    return this.get(CursorOp.PREV);
  }

  set(key: ArrayBuffer): void {
    this.dbKey.data = key;
    const rc = this._get(CursorOp.SET);
    if (rc === MDB_NOTFOUND) {
      throw new NotFoundError(key);
    } else if (rc) throw DbError.from(rc);
  }

  setKey(key: ArrayBuffer): CursorItem | null {
    this.dbKey.data = key;
    const rc = this._get(CursorOp.SET_KEY);
    if (rc === MDB_NOTFOUND) return null;
    else if (rc) throw DbError.from(rc);
    else return new CursorItem(this.dbKey.data, this.dbValue.data);
  }

  setRange(key: ArrayBuffer): CursorItem | null {
    this.dbKey.data = key;
    const rc = this._get(CursorOp.SET_RANGE);
    if (rc === MDB_NOTFOUND) return null;
    else if (rc) throw DbError.from(rc);
    else return new CursorItem(this.dbKey.data, this.dbValue.data);
  }

  putUnsafe(
    key: ArrayBuffer,
    value: ArrayBuffer,
    flags?: CursorPutFlags
  ): void {
    this.dbKey.data = key;
    this.dbValue.data = value;
    let _flags = 0;
    if (flags) {
      _flags |=
        (flags.noOverwrite ? MDB_NOOVERWRITE : 0) |
        (flags.current ? MDB_CURRENT : 0) |
        (flags.append ? MDB_APPEND : 0);
    }
    const rc = lmdb.ffi_cursor_put(
      this.fcursor,
      this.dbKey.fdata,
      this.dbValue.fdata,
      _flags
    );
    if (rc === MDB_KEYEXIST)
      throw new KeyExistsError(this.dbKey.data, this.dbValue.data);
    else if (rc) throw DbError.from(rc);
  }

  put(key: ArrayBuffer, value: ArrayBuffer, flags?: CursorPutFlags): void {
    try {
      this.putUnsafe(key, value, flags);
    } catch (err) {
      if (err instanceof KeyExistsError) {
        const keyU8 = new Uint8Array(this.dbKey.data);
        const keyCopy = new Uint8Array(this.dbKey.size);
        copy(keyU8, keyCopy);
        const valueU8 = new Uint8Array(this.dbValue.data);
        const valueCopy = new Uint8Array(this.dbValue.size);
        copy(valueU8, valueCopy);
        throw new KeyExistsError(keyCopy, valueCopy);
      }
    }
  }

  *iterator(): Generator<CursorItem, void, ArrayBuffer | undefined> {
    const begin = this.options?.reverse
      ? this.last.bind(this)
      : this.first.bind(this);
    const incr = this.options?.reverse
      ? this.prev.bind(this)
      : this.next.bind(this);
    const comparison = this.options?.reverse ? -1 : 1;

    let item: CursorItem | null | undefined;
    if (this.options?.start) {
      item = this.setKey(this.options.start);
    } else {
      item = begin();
    }
    let found = 0;
    if (this.options?.offset) {
      let offset = found;
      while (offset < this.options.offset) {
        item = incr();
        if (item == null) return;
        offset++;
      }
    }
    const limit = this.options?.limit || Number.MAX_SAFE_INTEGER;
    while (found < limit && item !== null) {
      if (
        this.options?.end &&
        item &&
        this.db.compare(this.txn, item.keyUnsafe, this.options.end) *
          comparison >
          0
      ) {
        return;
      }
      if (item) {
        found++;
        yield item;
      }
      item = incr();
    }
  }

  [Symbol.iterator] = this.iterator;
}

import * as log from "https://deno.land/std@0.130.0/log/mod.ts";
import { Environment } from "./environment.ts";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

async function main() {
  try {
    const env = await new Environment({ path: ".testdb" }).open();
    const writer = new Transaction(env);
    const db = new Database(null, writer);
    const cursor = new Cursor(writer, db, {
      start: encoder.encode("e"),
      end: encoder.encode("ch"),
      limit: 4,
      reverse: true,
    });
    try {
      db.putUnsafe(encoder.encode("a"), encoder.encode("apple"), writer);
      db.putUnsafe(encoder.encode("b"), encoder.encode("banana"), writer);
      db.putUnsafe(encoder.encode("c"), encoder.encode("cherry"), writer);
      db.putUnsafe(encoder.encode("d"), encoder.encode("durian"), writer);
      db.putUnsafe(encoder.encode("e"), encoder.encode("enchilada"), writer);
      db.putUnsafe(encoder.encode("f"), encoder.encode("fava bean"), writer);
      for (const item of cursor) {
        log.info({
          m: "iterator",
          key: decoder.decode(item.keyUnsafe),
          value: decoder.decode(item.valueUnsafe),
        });
      }
      writer.commit();
    } catch (err) {
      console.error(err);
      writer.abort();
    } finally {
      cursor.close();
      await env.close();
    }
  } catch (err) {
    console.error(err);
  }
}

if (import.meta.main) main();
