import * as log from "https://deno.land/std@0.130.0/log/mod.ts";
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
  MDB_INTEGERKEY,
} from "./lmdb_ffi.ts";
import { Transaction } from "./transaction.ts";
import { Environment } from "./environment.ts";
import { decoder, encodeKey, encodeValue, Key, Value } from "./util.ts";

export interface CursorOptions<K extends Key = string> {
  start?: K;
  end?: K;
  reverse?: boolean;
  limit?: number;
  offset?: number;
  readOnly?: boolean;
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
  keyString(): string {
    return decoder.decode(this.keyUnsafe);
  }
  keyNumber(): number {
    return new Float64Array(this.keyUnsafe)[0];
  }
  value(): ArrayBuffer {
    const src = new Uint8Array(this.valueUnsafe);
    const data = new Uint8Array(src.length);
    copy(src, data);
    return data.buffer;
  }
  valueString(): string {
    return decoder.decode(this.valueUnsafe);
  }
  valueNumber(): number {
    return new Float64Array(this.valueUnsafe)[0];
  }
  valueBoolean(): boolean {
    return !!new Uint8Array(this.valueUnsafe)[0];
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

const notOpen = () => new DbError("Cursor is already closed");

/**
 * Allows traversal of keys and values in database.
 */
export class Cursor<K extends Key = string> implements Iterable<CursorItem> {
  fcursor = new BigUint64Array(1);
  db: Database;
  txn: Transaction;
  ownsTxn: boolean;
  options: CursorOptions<K> | null;
  isOpen: boolean;

  protected dbKey = new DbData();
  protected dbValue = new DbData();

  private id = ++curId;

  constructor(
    db: Database,
    options?: CursorOptions<K> | null,
    txn?: Transaction
  ) {
    this.db = db;
    this.options = options || null;
    if (txn) {
      this.txn = txn;
      this.ownsTxn = false;
    } else {
      this.txn = new Transaction(db.env, options?.readOnly);
      this.ownsTxn = true;
    }
    const rc = lmdb.ffi_cursor_open(this.txn.ftxn, db.dbi, this.fcursor);
    if (rc) throw DbError.from(rc);
    this.isOpen = true;
    records[this.id] = {
      addr: this.fcursor[0],
      isOpen: true,
    };
    registry.register(this, this.id);
  }

  close(): void {
    if (!this.isOpen) return;
    lmdb.ffi_cursor_close(this.fcursor);
    if (this.ownsTxn) this.txn.commit();
    this.isOpen = false;
    records[this.id].isOpen = false;
  }

  renew(options: CursorOptions<K> | null, txn?: Transaction): void {
    if (this.isOpen) this.close();
    if (options) this.options = options;
    if (txn) {
      this.txn = txn;
      this.ownsTxn = false;
    } else {
      this.txn = new Transaction(this.db.env, options?.readOnly);
      this.ownsTxn = true;
    }

    const rc = lmdb.ffi_cursor_renew(this.txn.ftxn, this.fcursor);
    if (rc) {
      this.close();
      throw DbError.from(rc);
    }
    this.isOpen = true;
    records[this.id].isOpen = true;
  }

  protected encodeKey(key: K): void {
    if (typeof key === "number" && !(this.db.flags & MDB_INTEGERKEY))
      throw new DbError("This database does not support integer keys");
    this.dbKey.data = encodeKey(key);
  }

  protected _get(op: CursorOp): number {
    if (!this.isOpen) throw notOpen();
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

  first = () => this.get(CursorOp.FIRST);
  last = () => this.get(CursorOp.LAST);
  next = () => this.get(CursorOp.NEXT);
  prev = () => this.get(CursorOp.PREV);

  set(key: K): void {
    this.encodeKey(key);
    const rc = this._get(CursorOp.SET);
    if (rc === MDB_NOTFOUND) {
      throw new NotFoundError(key);
    } else if (rc) throw DbError.from(rc);
  }

  setKey(key: K): CursorItem | null {
    this.encodeKey(key);
    const rc = this._get(CursorOp.SET_KEY);
    if (rc === MDB_NOTFOUND) return null;
    else if (rc) throw DbError.from(rc);
    else return new CursorItem(this.dbKey.data, this.dbValue.data);
  }

  setRange(key: K): CursorItem | null {
    this.encodeKey(key);
    const rc = this._get(CursorOp.SET_RANGE);
    if (rc === MDB_NOTFOUND) return null;
    else if (rc) throw DbError.from(rc);
    else return new CursorItem(this.dbKey.data, this.dbValue.data);
  }

  putUnsafe(key: K, value: Value, flags?: CursorPutFlags): void {
    if (!this.isOpen) throw notOpen();
    this.encodeKey(key);
    this.dbValue.data = encodeValue(value);
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

  put(key: K, value: Value, flags?: CursorPutFlags): void {
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

  *iterator(): Generator<CursorItem, void, K | undefined> {
    if (!this.isOpen) throw notOpen();
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
        if (item == null) {
          this.close();
          return;
        }
        offset++;
      }
    }
    const limit = this.options?.limit || Number.MAX_SAFE_INTEGER;
    while (found < limit && item !== null) {
      if (
        this.options?.end &&
        item &&
        this.db.compare(item.keyUnsafe, encodeKey(this.options.end), this.txn) *
          comparison >
          0
      ) {
        this.close();
        return;
      }
      if (item) {
        found++;
        const setK = yield item;
        if (setK) this.set(setK);
      }
      item = incr();
    }
    this.close();
  }

  [Symbol.iterator] = this.iterator;
}

/////////////////////////////////
// Finalization management begin
let curId = 0;
interface Finalizer {
  addr: bigint;
  isOpen: boolean;
}
const records: Record<number, Finalizer> = {};
const registry = new FinalizationRegistry((id: number) => {
  const record = records[id];
  if (!record) return;
  if (record.isOpen) {
    const fcursor = new BigUint64Array([BigInt(record.addr)]);
    lmdb.ffi_cursor_close(fcursor);
  }
  delete records[id];
});
// Finalization management end
/////////////////////////////////

async function main() {
  log.info("main(): start");
  try {
    const env = await new Environment({ path: ".testdb" }).open();
    log.info("main(): after env.open()");
    const db = new Database(null, env);
    log.info("main(): after new Database()");
    await db.clearAsync();
    log.info("main(): after db.clear()");
    try {
      log.info("main(): after new Cursor()");
      await db.putAsync("a", "apple");
      await db.putAsync("b", "banana");
      await db.putAsync("c", "cherry");
      await db.putAsync("d", "durian");
      await db.putAsync("e", "enchilada");
      await db.putAsync("f", "fava bean");
      log.info("main(): after puts");
      const cursor = new Cursor(db, {
        reverse: true,
      });
      for (const item of cursor) {
        log.info({
          m: "iterator",
          key: item.keyString(),
          value: item.valueString(),
        });
      }
    } finally {
      await env.close();
    }
  } catch (err) {
    console.error(err);
  }
}

if (import.meta.main) main();
