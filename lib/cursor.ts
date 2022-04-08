import { lmdb } from "./binding";
import { CursorOp } from "./constants";
import { Database } from "./database";
import { openEnv } from "./environment";
import { Transaction } from "./transaction";
import { DbItem, Key, Value } from "./types";

const notFound = "Item not found";

export class Cursor<K extends Key = string> implements Cursor<K> {
  private _cursorp: bigint;
  get cursorp(): bigint {
    return this._cursorp;
  }
  private txn: Transaction;
  private db: Database<K>;
  protected _isOpen = true;
  get isOpen() {
    return this._isOpen;
  }

  constructor(txn: Transaction, db: Database<K>) {
    this._cursorp = lmdb.cursor_open(txn.txnp, db.dbi);
    this.txn = txn;
    this.db = db;
  }
  put(key: K, value: Value): void {
    throw new Error("Method not implemented.");
  }
  del(): void {
    throw new Error("Method not implemented.");
  }

  key(): K {
    this.assertOpen();
    const result = lmdb.cursor_get({
      cursorp: this._cursorp,
      op: CursorOp.GET_CURRENT,
      includeKey: true,
    });
    if (!result || !result.key) throw new Error(notFound);
    return this.db.decodeKey(result.key);
  }
  keyBuffer(): Buffer {
    this.assertOpen();
    const result = lmdb.cursor_get({
      cursorp: this._cursorp,
      op: CursorOp.GET_CURRENT,
      includeKey: true,
    });
    if (!result || !result.key) throw new Error(notFound);
    return result.key;
  }
  value(zeroCopy = false): Buffer {
    this.assertOpen();
    const result = lmdb.cursor_get({
      cursorp: this.cursorp,
      op: CursorOp.GET_CURRENT,
      includeValue: true,
      zeroCopy,
    });
    if (!result?.value) throw new Error(notFound);
    return <Buffer>result.value;
  }
  /** @returns current value as string */
  asString(): string {
    return this.value().toString();
  }
  /** @returns current value as number */
  asNumber(): number {
    return this.value().readDoubleBE();
  }
  /** @returns current value as boolean */
  asBoolean(): boolean {
    return this.value().readUInt8() ? true : false;
  }
  /** @returns current key (as Buffer) and value (as Buffer) */
  rawItem(
    includeKey = true,
    includeValue = true,
    zeroCopy = false
  ): DbItem<Buffer, Buffer> {
    this.assertOpen();
    const result = lmdb.cursor_get({
      cursorp: this.cursorp,
      op: CursorOp.GET_CURRENT,
      includeKey,
      includeValue,
      zeroCopy,
    });
    if (!result) throw new Error(notFound);
    return {
      key: result.key,
      value: result.value,
    };
  }
  item(includeValue = true, zeroCopy = false) {
    const bufItem = this.rawItem(includeValue, zeroCopy);
    return {
      key: bufItem.key ? this.db.decodeKey(bufItem.key) : undefined,
      value: bufItem.value,
    };
  }
  stringItem(): DbItem<K, string> {
    const item = this.item();
    return {
      key: item.key,
      value: item.value?.toString(),
    };
  }
  numberItem(): DbItem<K, number> {
    const item = this.item();
    return {
      key: item.key,
      value: item.value?.readDoubleBE(),
    };
  }
  booleanItem(): DbItem<K, boolean> {
    const item = this.item();
    return {
      key: item.key,
      value: item.value?.readUInt8() ? true : false,
    };
  }
  first(): boolean {
    this.assertOpen();
    const result = lmdb.cursor_get({
      cursorp: this.cursorp,
      op: CursorOp.FIRST,
    });
    if (!result) return false;
    else return true;
  }
  prev(skip = 0): boolean {
    this.assertOpen();
    while (skip-- >= 0) {
      const result = lmdb.cursor_get({
        cursorp: this.cursorp,
        op: CursorOp.PREV,
      });
      if (!result) return false;
    }
    return true;
  }
  next(skip = 0): boolean {
    this.assertOpen();
    while (skip-- >= 0) {
      const result = lmdb.cursor_get({
        cursorp: this.cursorp,
        op: CursorOp.NEXT,
      });
      if (!result) return false;
    }
    return true;
  }
  last(): boolean {
    this.assertOpen();
    const result = lmdb.cursor_get({
      cursorp: this.cursorp,
      op: CursorOp.LAST,
    });
    if (!result) return false;
    else return true;
  }
  find(key: K): boolean {
    this.assertOpen();
    const result = lmdb.cursor_get({
      cursorp: this.cursorp,
      op: CursorOp.SET_KEY,
      key: this.db.encodeKey(key),
    });
    if (!result) return false;
    else return true;
  }
  findNext(key: K): boolean {
    this.assertOpen();
    const result = lmdb.cursor_get({
      cursorp: this.cursorp,
      op: CursorOp.SET_RANGE,
      key: this.db.encodeKey(key),
    });
    if (!result) return false;
    else return true;
  }

  protected assertOpen(): void {
    if (!this.isOpen) throw new Error("Cursor is already closed");
  }

  close(): void {
    if (!this.isOpen) return;
    lmdb.cursor_close(this.cursorp);
    this._isOpen = false;
  }

  renew(txn: Transaction): void {
    if (this.isOpen) {
      this.close();
    }
    lmdb.cursor_renew(txn.txnp, this.cursorp);
    this._isOpen = true;
  }
}

async function main() {
  console.log("hello from cursor.ts!");
  const env = await openEnv(".testdb");
  const db = env.openDB(null);
  const txn = env.beginTxn();
  db.clear(txn);
  db.put("a", "apple sunday", txn);
  db.put("b", "banana sunday", txn);
  db.put("c", "cherry sunday", txn);
  db.put("d", "durian sunday", txn);
  db.put("e", "enchilada sunday", txn);
  db.put("f", "faux gras sunday", txn);
  const cursor = db.cursor(txn);
  while (cursor.next()) {
    const item = cursor.stringItem();
    console.log({
      m: "cursor.next()",
      key: item.key,
      value: item.value,
    });
  }
  txn.commit();
  db.close();
  env.close();
}
if (require.main === module) main();
