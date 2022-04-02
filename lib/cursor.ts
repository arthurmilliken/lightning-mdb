import { lmdb } from "./binding";
import { openEnv } from "./environment";
import { Transaction } from "./transaction";
import {
  CursorOptions,
  CursorPutFlags,
  ICursor,
  ICursorItem,
  Key,
  KeyType,
} from "./types";

export class CursorItem<K extends Key = string> implements ICursorItem<K> {
  _cursor: Cursor<K>;
  get cursor(): Cursor<K> {
    return this._cursor;
  }

  constructor(cursor: Cursor<K>) {
    this._cursor = cursor;
  }

  key(): K | null {
    throw new Error("Method not implemented.");
  }
  value(): Buffer | null {
    throw new Error("Method not implemented.");
  }
  valueString(): string | null {
    throw new Error("Method not implemented.");
  }
  valueNumber(): number | null {
    throw new Error("Method not implemented.");
  }
  valueBoolean(): boolean | null {
    throw new Error("Method not implemented.");
  }
  detach(): void {
    throw new Error("Method not implemented.");
  }
}

export class Cursor<K extends Key = string> implements ICursor<K> {
  cursorp: bigint;
  txnp: bigint;
  options: CursorOptions<K>;
  dbi: number;

  constructor(txnp: bigint, dbi: number, options: CursorOptions<K>) {
    this.cursorp = 0n;
    this.txnp = txnp;
    this.dbi = dbi;
    this.options = Object.assign({ keyType: "string" }, options);
  }
  key(): K | null {
    throw new Error("Method not implemented.");
  }
  value(): Buffer | null {
    throw new Error("Method not implemented.");
  }
  valueString(): string | null {
    throw new Error("Method not implemented.");
  }
  valueNumber(): number | null {
    throw new Error("Method not implemented.");
  }
  valueBoolean(): boolean | null {
    throw new Error("Method not implemented.");
  }
  detach(): void {
    throw new Error("Method not implemented.");
  }
  close(): void {
    throw new Error("Method not implemented.");
  }
  renew(txn: Transaction): void {
    throw new Error("Method not implemented.");
  }
  put(key: Buffer, value: Buffer, flags: CursorPutFlags): void {
    throw new Error("Method not implemented.");
  }
  del(noDupData?: boolean): void {
    throw new Error("Method not implemented.");
  }
  first(): ICursorItem<K> | null {
    throw new Error("Method not implemented.");
  }
  current(): ICursorItem<K> | null {
    throw new Error("Method not implemented.");
  }
  last(): ICursorItem<K> | null {
    throw new Error("Method not implemented.");
  }
  next(steps?: number): ICursorItem<K> | null {
    throw new Error("Method not implemented.");
  }
  prev(steps?: number): ICursorItem<K> | null {
    throw new Error("Method not implemented.");
  }
  find(key: K): ICursorItem<K> | null {
    throw new Error("Method not implemented.");
  }
  findEntry(key: K): ICursorItem<K> | null {
    throw new Error("Method not implemented.");
  }
  findNext(key: K): ICursorItem<K> | null {
    throw new Error("Method not implemented.");
  }
  iterator(): Generator<ICursorItem<K>, void, K> {
    throw new Error("Method not implemented.");
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
