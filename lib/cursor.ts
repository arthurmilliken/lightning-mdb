import { lmdb } from "./binding";
import { CursorOp } from "./constants";
import { openEnv } from "./environment";
import { Transaction } from "./transaction";
import { CursorPutFlags, DbItem, IEntry, Key, KeyType, Value } from "./types";
import { ICursor } from "./_cursor";

const notFound = "Item not found";

export class Cursor<K extends Key = string> implements Cursor<K> {
  private _cursorp: bigint;
  get cursorp(): bigint {
    return this._cursorp;
  }
  private _txnp: bigint;
  get txnp(): bigint {
    return this._txnp;
  }
  private _dbi: number;
  get dbi(): number {
    return this._dbi;
  }
  private _isOpen: boolean;
  get isOpen(): boolean {
    return this._isOpen;
  }
  private _keyType: KeyType;
  get keyType(): KeyType {
    return this._keyType;
  }

  constructor(txnp: bigint, dbi: number, keyType: KeyType) {
    this._cursorp = lmdb.cursor_open(txnp, dbi);
    this._txnp = txnp;
    this._dbi = dbi;
    this._keyType = keyType;
    this._isOpen = true;
  }
  put(key: K, value: Value): void {
    throw new Error("Method not implemented.");
  }
  del(): void {
    throw new Error("Method not implemented.");
  }
  protected decodeKey(keyBuf: Buffer): K {
    if (this.keyType === "Buffer") return <K>keyBuf;
    if (this.keyType === "string") return <K>keyBuf.toString();
    if (this.keyType === "number") return <K>Number(keyBuf.readBigUInt64BE());
    throw new Error(`Unknown keyType: ${this.keyType}`);
  }
  key(): K {
    this.assertOpen();
    const result = lmdb.cursor_get({
      cursorp: this._cursorp,
      op: CursorOp.GET_CURRENT,
      returnKey: true,
    });
    if (!result || !result.key) throw new Error(notFound);
    return this.decodeKey(result.key);
  }
  value(zeroCopy = false): Buffer {
    this.assertOpen();
    const result = lmdb.cursor_get({
      cursorp: this.cursorp,
      op: CursorOp.GET_CURRENT,
      returnValue: true,
      zeroCopy,
    });
    if (!result?.value) throw new Error(notFound);
    return <Buffer>result.value;
  }
  asString(): string {
    return this.value().toString();
  }
  asNumber(): number {
    return this.value().readDoubleBE();
  }
  asBoolean(): boolean {
    return this.value().readUInt8() ? true : false;
  }
  item(zeroCopy = false): DbItem<K, Buffer> {
    this.assertOpen();
    const result = lmdb.cursor_get({
      cursorp: this.cursorp,
      op: CursorOp.GET_CURRENT,
      returnKey: true,
      returnValue: true,
      zeroCopy,
    });
    if (!result) throw new Error(notFound);
    return {
      key: result.key ? this.decodeKey(result.key) : undefined,
      value: result.value || undefined,
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
  find(key: Buffer): boolean {
    this.assertOpen();
    const result = lmdb.cursor_get({
      cursorp: this.cursorp,
      op: CursorOp.SET_KEY,
      key,
    });
    if (!result) return false;
    else return true;
  }
  findNext(key: Buffer): boolean {
    this.assertOpen();
    const result = lmdb.cursor_get({
      cursorp: this.cursorp,
      op: CursorOp.SET_RANGE,
      key,
    });
    if (!result) return false;
    else return true;
  }

  protected assertOpen(): void {
    if (!this.isOpen) throw new Error("Cursor is already closed");
  }

  close(): void {
    this.assertOpen();
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
  const txn2 = env.beginTxn(false);
  console.log({ a: db.getString("a", txn2), txn2: txn2.txnp });
  const txn3 = env.beginTxn(false);
  console.log({ b: db.getString("b", txn3), txn3: txn3.txnp });
  const txn4 = env.beginTxn(false);
  console.log({ c: db.getString("c", txn4), txn4: txn4.txnp });
  console.log(env.readerList().join());
  txn.commit();
  txn2.abort();
  txn3.abort();
  txn4.abort();
  db.close();
  env.close();
}
if (require.main === module) main();
