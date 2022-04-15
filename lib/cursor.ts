import { lmdb } from "./binding";
import { CursorOp, itemNotFound, PutFlag } from "./constants";
import { bufReadBoolean, Database } from "./database";
import { openEnv } from "./environment";
import { Transaction } from "./transaction";
import { CursorItem, CursorFlags, DbItem, Key, Query, Value } from "./types";

export class Cursor<K extends Key = string> implements Cursor<K> {
  protected _cursorp: bigint;
  get cursorp(): bigint {
    return this._cursorp;
  }
  protected txn: Transaction;
  protected db: Database<K>;
  protected _isOpen = true;
  get isOpen() {
    return this._isOpen;
  }
  protected ownsTxn = false;

  constructor(db: Database<K>, txn?: Transaction) {
    this.db = db;
    if (!txn) {
      this.txn = new Transaction(db.envp, true);
      this.ownsTxn = true;
    } else this.txn = txn;
    this._cursorp = lmdb.cursor_open(this.txn.txnp, db.dbi);
  }

  /** Store `value` at `key`, and move the cursor to the position of the
   * inserted record */
  put(key: K, value: Value, flags?: CursorFlags): void {
    this.assertOpen();
    const _flags =
      (flags?.append ? PutFlag.APPEND : 0) +
      (flags?.noOverwrite ? PutFlag.NOOVERWRITE : 0) +
      (flags?.current ? PutFlag.CURRENT : 0);
    lmdb.cursor_put({
      cursorp: this.cursorp,
      key: this.db.encodeKey(key),
      value: this.db.encodeValue(value),
      flags: _flags,
    });
  }

  /**
   * Reserve `size` bytes at `key`, move cursor to position of `key`, and
   * return an initialized Buffer which the caller can fill in before the
   * end of the transaction
   * @param key the key where the data will be inserted
   * @param size the size (in bytes) of the entry to reserve
   * @param {CursorFlags} flags
   * @returns an initialized Buffer, the contents of which will be persisted
   *          in the database when the transaction is committed
   */
  reserve(key: K, size: number, flags?: CursorFlags): Buffer {
    this.assertOpen();
    const _flags =
      (flags?.append ? PutFlag.APPEND : 0) +
      (flags?.noOverwrite ? PutFlag.NOOVERWRITE : 0) +
      (flags?.current ? PutFlag.CURRENT : 0);
    return lmdb.cursor_reserve({
      cursorp: this.cursorp,
      key: this.db.encodeKey(key),
      size,
      flags: _flags,
    });
  }

  /** Remove database entry (key + value) at current cursor position */
  del(): void {
    this.assertOpen();
    lmdb.cursor_del(this._cursorp);
  }

  /** @returns current key as Buffer */
  keyBuffer(): Buffer {
    this.assertOpen();
    const result = lmdb.cursor_get({
      cursorp: this._cursorp,
      op: CursorOp.GET_CURRENT,
      includeKey: true,
    });
    if (!result || !result.key) throw new Error(itemNotFound);
    return result.key;
  }

  /** @returns current key */
  key(): K {
    return this.db.decodeKey(this.keyBuffer());
  }

  /** @returns current value as Buffer */
  value(zeroCopy = false): Buffer {
    this.assertOpen();
    const result = lmdb.cursor_get({
      cursorp: this.cursorp,
      op: CursorOp.GET_CURRENT,
      includeValue: true,
      zeroCopy,
    });
    if (!result?.value) throw new Error(itemNotFound);
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

  /**
   * Fetch key and value data as Buffer objects
   * @param includeKey if false, the `key` property of the returned CursorItem
   *        will be undefined (default: true)
   * @param includeValue if false, the `value` property of the returned CursorItem
   *        will be undefined (default: true)
   * @param zeroCopy if true, returned `value` Buffer is created using zero-copy
   *        semantics. This buffer must be detached by calling detachBuffer()
   *        before the end of the transaction, and before attempting any other
   *        operation involving the same key, even if that operation is being
   *        run in a separate thread. Use with caution.
   * @returns {CursorItem<Buffer, Buffer>}
   */
  rawItem(
    includeKey = true,
    includeValue = true,
    zeroCopy = false
  ): CursorItem<Buffer, Buffer> {
    this.assertOpen();
    const result = lmdb.cursor_get({
      cursorp: this.cursorp,
      op: CursorOp.GET_CURRENT,
      includeKey,
      includeValue,
      zeroCopy,
    });
    if (!result) throw new Error(itemNotFound);
    return {
      key: result.key,
      value: result.value,
    };
  }

  /**
   * Fetch data at cursor position as a cursor item
   * @param includeValue if false, the `value` property of the returned CursorItem
   *        will be undefined (default: true)
   * @param zeroCopy if true, returned `value` Buffer is created using zero-copy
   *        semantics. This buffer must be detached by calling detachBuffer()
   *        before the end of the transaction, and before attempting any other
   *        operation involving the same key, even if that operation is being
   *        run in a separate thread. Use with caution.
   * @returns {CursorItem<K, Buffer>} at current cursor position
   */
  item(includeValue = true, zeroCopy = false): CursorItem<K, Buffer> {
    const bufItem = this.rawItem(true, includeValue, zeroCopy);
    return {
      key: bufItem.key ? this.db.decodeKey(bufItem.key) : undefined,
      value: bufItem.value,
    };
  }

  /** @returns {DbItem<K, string>} at current cursor position */
  stringItem(): DbItem<K, string> {
    const item = this.item();
    return {
      key: <K>item.key,
      value: <string>item.value?.toString(),
    };
  }

  /** @returns {DbItem<K, number>} at current cursor position */
  numberItem(): DbItem<K, number> {
    const item = this.item();
    return {
      key: <K>item.key,
      value: <number>item.value?.readDoubleBE(),
    };
  }

  /** @returns {DbItem<K, boolean>} at current cursor position */
  booleanItem(): DbItem<K, boolean> {
    const item = this.item();
    return {
      key: <K>item.key,
      value: item.value?.readUInt8() ? true : false,
    };
  }

  /** Move the cursor to the first entry in database
   * @returns false if no key found, true otherwise */
  first(): boolean {
    this.assertOpen();
    const result = lmdb.cursor_get({
      cursorp: this.cursorp,
      op: CursorOp.FIRST,
    });
    if (!result) return false;
    else return true;
  }

  /** Move the cursor to the previous entry
   * @param skip number of entries to skip
   * @returns false if no entry found, true otherwise */
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

  /** Move the cursor to the next entry
   * @param skip number of entries to skip
   * @returns false if no entry found, true otherwise */
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

  /** Move the cursor to the last entry in database
   * @returns false if no entry found, true otherwise */
  last(): boolean {
    this.assertOpen();
    const result = lmdb.cursor_get({
      cursorp: this.cursorp,
      op: CursorOp.LAST,
    });
    if (!result) return false;
    else return true;
  }

  /** Move the cursor to given key. If key does not exist, this function
   * will move the cursor to the next adjacent key and return false.
   * @returns true if key exists, false otherwise */
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

  /** Move the cursor to given key or next adjacent key
   * @returns false if no key found, true otherwise */
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

  /** Close this cursor. This must be called on all read-only cursors. */
  close(): void {
    if (!this.isOpen) return;
    lmdb.cursor_close(this.cursorp);
    if (this.ownsTxn && this.txn.isOpen) {
      this.txn.abort();
    }
    this._isOpen = false;
  }

  /** Re-use a closed cursor with the given transaction. */
  renew(txn: Transaction): void {
    if (this.isOpen) {
      this.close();
    }
    lmdb.cursor_renew(txn.txnp, this.cursorp);
    this._isOpen = true;
  }

  /** @returns an iterator over items (each item as CursorItem<K, Buffer>) */
  *getCursorItems(
    q?: Query<K> & { zeroCopy?: boolean },
    includeKey = true,
    includeValue = true
  ): IterableIterator<CursorItem<K, Buffer>> {
    // Set up navigation functions, based on q.reverse
    let first = q?.reverse ? this.last.bind(this) : this.first.bind(this);
    let next = q?.reverse ? this.prev.bind(this) : this.next.bind(this);
    let compare = (a: Buffer, b: Buffer) => {
      return this.db.compareBuffers(a, b, this.txn) * (q?.reverse ? -1 : 1);
    };
    let find = (start: K): boolean => {
      if (q?.reverse) {
        if (!this.find(start)) return this.prev();
        else return true;
      } else {
        return this.findNext(start);
      }
    };

    // Start iteration
    let found = 0;
    const endBuf = q?.end ? this.db.encodeKey(q.end) : undefined;
    if (q?.start) {
      if (!find(q.start)) {
        return;
      }
    } else {
      if (!first()) return;
    }
    if (q?.offset) {
      if (!next(q.offset - 1)) return;
    }
    const rawItem = this.rawItem(
      endBuf ? true : includeKey,
      includeValue,
      q?.zeroCopy
    );
    if (endBuf && compare(<Buffer>rawItem.key, endBuf) > 0) return;
    found++;
    yield {
      key:
        includeKey && rawItem.key ? this.db.decodeKey(rawItem.key) : undefined,
      value: rawItem.value,
    };

    // Iterate over remainder
    while (next()) {
      if (q?.limit && ++found > q.limit) return;
      const rawItem = this.rawItem(
        endBuf ? true : includeKey,
        includeValue,
        q?.zeroCopy
      );
      if (endBuf && compare(<Buffer>rawItem.key, endBuf) > 0) return;
      yield {
        key:
          includeKey && rawItem.key
            ? this.db.decodeKey(rawItem.key)
            : undefined,
        value: rawItem.value,
      };
    }
  }

  /** @returns an iterator over items (each item as DbItem<K, Buffer>) */
  *getItems(q?: Query<K>): IterableIterator<DbItem<K, Buffer>> {
    for (const item of this.getCursorItems(q, true, true)) {
      if (!item.key || !item.value) break;
      yield <DbItem<K, Buffer>>item;
    }
  }

  /** @returns an iterator over keys */
  *getKeys(q?: Query<K>): IterableIterator<K> {
    for (const item of this.getCursorItems(q, true, false)) {
      if (!item.key) break;
      yield item.key;
    }
  }

  /** @returns an iterator over values (each value as Buffer) */
  *getValues(q?: Query<K> & { zeroCopy?: boolean }): IterableIterator<Buffer> {
    for (const item of this.getCursorItems(q, false, true)) {
      if (!item.value) break;
      yield item.value;
    }
  }

  /** @returns an iterator over values (each value as string) */
  *getStrings(q?: Query<K>): IterableIterator<string> {
    for (const value of this.getValues(q)) {
      yield value.toString();
    }
  }
  /** @returns an iterator over values (each value as number) */
  *getNumbers(q?: Query<K>): IterableIterator<number> {
    for (const value of this.getValues(q)) {
      yield value.readDoubleBE();
    }
  }
  /** @returns an iterator over values (each value as boolean) */
  *getBooleans(q?: Query<K>): IterableIterator<boolean> {
    for (const value of this.getValues(q)) {
      yield bufReadBoolean(value);
    }
  }

  /** @returns an iterator over items (each item as DbItem<K, string>) */
  *getStringItems(q?: Query<K>): IterableIterator<DbItem<K, string>> {
    for (const item of this.getItems(q)) {
      yield {
        key: item.key,
        value: item.value?.toString(),
      };
    }
  }

  /** @returns an iterator over items (each item as DbItem<K, number>) */
  *getNumberItems(q?: Query<K>): IterableIterator<DbItem<K, number>> {
    for (const item of this.getItems(q)) {
      yield {
        key: item.key,
        value: item.value?.readDoubleBE(),
      };
    }
  }

  /** @returns an iterator over items (each item as DbItem<K, boolean>) */
  *getBooleanItems(q?: Query<K>): IterableIterator<DbItem<K, boolean>> {
    for (const item of this.getItems(q)) {
      yield {
        key: item.key,
        value: item.value ? bufReadBoolean(item.value) : false,
      };
    }
  }

  /** @returns a count of items matching the given query, or all items if
   * no query given */
  getCount(q?: Omit<Query<K>, "reverse">): number {
    let count = 0;
    for (const item of this.getCursorItems(q, false, false)) {
      count++;
    }
    return count;
  }
}

async function main() {
  console.log("hello from cursor.ts!");
  const env = await openEnv(".testdb");
  const db = env.openDB(null);
  const txn = env.beginTxn();
  db.clear(txn);
  db.put("a", "alpha", txn);
  db.put("b", "beta", txn);
  db.put("c", "charlie", txn);
  db.put("d", "delta", txn);
  db.put("e", "echo", txn);
  db.put("f", "foxtrot", txn);
  const cursor = db.openCursor(txn);
  for (const item of cursor.getStringItems()) {
    const value = `${item.value} foo`;
    const buf = cursor.reserve(item.key, value.length);
    buf.write(value);
  }
  for (const item of cursor.getStringItems()) {
    console.log(item);
  }
  console.log({ count: cursor.getCount() });
  for (const _item of cursor.getCursorItems({ start: "c", limit: 3 })) {
    cursor.del();
  }
  for (const item of cursor.getStringItems()) {
    console.log(item);
  }
  console.log({ count: cursor.getCount() });

  cursor.close();
  txn.commit();
  db.close();
  env.close();
}
if (require.main === module) main();
