import { lmdb } from "./binding";
import { DbFlag, PutFlag } from "./constants";
import { Transaction } from "./transaction";
import {
  Key,
  KeyType,
  Value,
  PutFlags,
  DbOptions,
  DbStat,
  Query,
  DbItem,
} from "./types";
import { Buffer } from "buffer";
import { isMainThread } from "worker_threads";
import { openEnv } from "./environment";
import { Cursor } from "./cursor";

export class Database<K extends Key = string> {
  /**
   * Use this method to create a Database for use in a Worker Thread
   * @param serialized created by Database.serialize()
   * @returns Database
   */
  static deserialize(serialized: SerializedDB): Database {
    return new Database(serialized);
  }

  protected _isOpen = false;
  protected _keyType: KeyType;
  _envp: bigint;
  _dbi: number;

  /**
   * Opens a Database in the given environment
   * @param envp
   * @param name
   * @param options
   * @param txn
   */
  constructor(
    envp: bigint,
    name: string | null,
    txn: Transaction,
    options?: DbOptions
  );
  /**
   * Creates a Database from a serialized representation
   * @param serialized
   */
  constructor(serialized: SerializedDB);
  constructor(
    arg0: bigint | SerializedDB,
    name?: string | null,
    txn?: Transaction,
    options?: DbOptions
  ) {
    if (typeof arg0 === "bigint") {
      if (!isMainThread) {
        throw new Error(
          "Cannot use this constructor from Worker Thread. Use Database.deserialize() instead."
        );
      }
      const envp = <bigint>arg0;
      name = name || null;
      const _flags = options ? calcDbFlags(options) : 0;
      if (!txn) throw new Error("Transaction is required");
      this._dbi = lmdb.dbi_open(txn.txnp, name, _flags);
      this._envp = envp;
      this._keyType = options?.keyType || "string";
    } else {
      const serialized = <SerializedDB>arg0;
      this._envp = serialized.envp;
      this._dbi = serialized.dbi;
      this._keyType = serialized.keyType;
    }
    this._isOpen = true;
  }
  get envp() {
    return this._envp;
  }
  get dbi() {
    return this._dbi;
  }
  get isOpen(): boolean {
    return this._isOpen;
  }
  /** Data type for stored keys */
  get keyType(): KeyType {
    return this._keyType;
  }

  /** Create serialization token for use with Worker Thread */
  serialize(): SerializedDB {
    this.assertOpen();
    return { envp: this.envp, dbi: this._dbi, keyType: this.keyType };
  }

  stat(txn?: Transaction): DbStat {
    this.assertOpen();
    return this.useTransaction((useTxn) => {
      return lmdb.stat(useTxn.txnp, this._dbi);
    }, txn);
  }

  flags(txn?: Transaction): DbOptions {
    this.assertOpen();
    return this.useTransaction((useTxn) => {
      const _flags = lmdb.dbi_flags(useTxn.txnp, this._dbi);
      return {
        create: _flags & DbFlag.CREATE ? true : false,
        reverseKey: _flags & DbFlag.REVERSEKEY ? true : false,
      };
    }, txn);
  }

  close(): void {
    this.assertOpen();
    lmdb.dbi_close(this.envp, this._dbi);
    this._isOpen = false;
  }

  drop(txn: Transaction, del?: boolean): void {
    this.assertOpen();
    txn.assertOpen();
    lmdb.mdb_drop(txn.txnp, this._dbi, del || false);
  }

  clear(txn: Transaction): void {
    this.drop(txn, false);
  }

  dropAsync(del?: boolean) {
    throw new Error("Method not implemented.");
  }

  /**
   * Get item from database.
   * @param key
   * @param txn
   * @param zeroCopy if true, returned Buffer is created using zero-copy
   *        semantics. This buffer must be detached by calling detachBuffer()
   *        before the end of the transaction, and before attempting any other
   *        operation involving the same key. This also applies to code being
   *        run in other threads. Use with caution.
   * @returns Buffer of data item
   */
  get(key: K, txn?: Transaction, zeroCopy = false): Buffer {
    this.assertOpen();
    return this.useTransaction((useTxn) => {
      return lmdb.get({
        txnp: useTxn.txnp,
        dbi: this._dbi,
        key: this.encodeKey(key),
        zeroCopy,
      });
    }, txn);
  }

  /** Retrieve item as string */
  getString(key: K, txn?: Transaction): string {
    return this.useTransaction((useTxn) => {
      return this.get(key, useTxn).toString();
    }, txn);
  }

  /**
   * Retrieve item as number
   * @param key
   * @param txn
   * @returns null if not found
   */
  getNumber(key: K, txn?: Transaction): number {
    return this.useTransaction((useTxn) => {
      return this.get(key, useTxn).readDoubleBE();
    }, txn);
  }

  /**
   * Retrieve value as boolean
   * @param key
   * @param txn
   * @returns null if not found
   */
  getBoolean(key: K, txn?: Transaction): boolean | null {
    return this.useTransaction((useTxn) => {
      return this.get(key, useTxn).readUInt8() ? true : false;
    }, txn);
  }

  /**
   * Store item into database
   * @param key the key to store
   * @param value the value to store
   * @param txn an open writable transaction
   * @param {PutFlags} flags */
  put(key: K, value: Value, txn: Transaction, flags?: PutFlags): void {
    this.assertOpen();
    txn.assertOpen();
    const keyBuf = this.encodeKey(key);
    const valueBuf = this.encodeValue(value);
    const _flags =
      (flags?.append ? PutFlag.APPEND : 0) +
      (flags?.noOverwrite ? PutFlag.NOOVERWRITE : 0);
    lmdb.put({
      txnp: txn.txnp,
      dbi: this._dbi,
      key: keyBuf,
      value: valueBuf,
      flags: _flags,
    });
  }

  putAsync(key: K, value: Value): Promise<Buffer | null> {
    throw new Error("Method not implemented.");
  }

  /**
   * Reserve space inside the database at the current key, and return a Buffer
   * which the caller can fill in before the transaction ends.
   * @param key the key to store
   * @param size the size in Bytes to allocate for the Buffer
   * @param txn an open writable transaction
   * @param flags
   * @returns an empty buffer of `size` bytes, to be filled in before the
   *          transaction ends.
   */
  reserve(key: K, size: number, txn: Transaction, flags?: PutFlags): Buffer {
    this.assertOpen();
    txn.assertOpen();
    const keyBuf = this.encodeKey(key);
    const _flags =
      (flags?.append ? PutFlag.APPEND : 0) +
      (flags?.noOverwrite ? PutFlag.NOOVERWRITE : 0);
    return lmdb.reserve({
      txnp: txn.txnp,
      dbi: this._dbi,
      key: keyBuf,
      size,
      flags: _flags,
    });
  }

  /**
   * Removes key/data pair from the database.
   * @param key the key to delete
   * @param txn an open writeable transaction
   */
  del(key: K, txn: Transaction): void {
    this.assertOpen();
    const keyBuf = this.encodeKey(key);
    lmdb.del(txn.txnp, this._dbi, keyBuf);
  }

  delAsync(key: K): Promise<void> {
    throw new Error("Method not implemented.");
  }

  /** Return a comparison as if the two items were keys in this database.
   * @param a the first item to compare
   * @param b the second item to compare
   * @param txn an optional transaction context
   * @returns < 0 if a < b, 0 if a == b, > 0 if a > b
   */
  compare(a: K, b: K, txn?: Transaction): number {
    return this.compareBuffer(this.encodeKey(a), this.encodeKey(b), txn);
  }

  compareBuffer(a: Buffer, b: Buffer, txn?: Transaction): number {
    this.assertOpen();
    let useTxn = txn;
    if (!useTxn) useTxn = new Transaction(this.envp, true);
    const cmp = lmdb.cmp(useTxn.txnp, this._dbi, a, b);
    if (!txn) useTxn.abort();
    return cmp;
  }

  encodeKey(key: Key): Buffer {
    if (typeof key !== this.keyType) {
      throw new TypeError(
        `Key must be of type ${this.keyType}, found ${typeof key} instead`
      );
    }
    if (key instanceof Buffer) return key;
    if (typeof key === "string") return Buffer.from(key);
    if (typeof key === "number") {
      assertUSafe(key);
      const buf = Buffer.allocUnsafe(8);
      buf.writeBigUInt64BE(BigInt(key));
      return buf;
    }
    throw new TypeError(`Invalid key: ${key}`);
  }

  decodeKey(keyBuf: Buffer): K {
    if (this.keyType === "Buffer") return <K>keyBuf;
    if (this.keyType === "string") return <K>keyBuf.toString();
    if (this.keyType === "number") return <K>Number(keyBuf.readBigUInt64BE());
    throw new Error(`Unknown keyType: ${this.keyType}`);
  }

  encodeValue(value: Value): Buffer {
    if (value instanceof Buffer) return value;
    if (typeof value === "string") return Buffer.from(value);
    if (typeof value === "number") {
      const buf = Buffer.allocUnsafe(8);
      buf.writeDoubleBE(value);
      return buf;
    }
    if (typeof value === "boolean") {
      const buf = Buffer.allocUnsafe(1);
      buf.writeUInt8(value ? 1 : 0);
      return buf;
    }
    throw new TypeError(`Invalid value: ${value}`);
  }

  /** @returns a cursor for this database, which the caller can use to navigate keys */
  cursor(txn?: Transaction): Cursor<K> {
    return this.useTransaction((useTxn) => {
      return new Cursor<K>(useTxn, this);
    }, txn);
  }

  /** @returns an iterator over items (each item as DbItem<K, Buffer>) */
  *getItems(
    q?: Query<K> & { zeroCopy?: boolean },
    txn?: Transaction,
    includeKey = true,
    includeValue = true
  ): IterableIterator<DbItem<K, Buffer>> {
    // Set up transaction
    let useTxn = txn;
    if (!useTxn) useTxn = new Transaction(this._envp, true);
    const cursor = new Cursor<K>(useTxn, this);

    // Set up navigation functions, based on q.reverse
    let next = q?.reverse ? cursor.prev.bind(cursor) : cursor.next.bind(cursor);
    let compare = (a: Buffer, b: Buffer) => {
      return this.compareBuffer(a, b, useTxn) * (q?.reverse ? -1 : 1);
    };
    let find = (start: K): boolean => {
      if (q?.reverse) {
        if (!cursor.find(start)) return cursor.prev();
        else return true;
      } else {
        return cursor.findNext(start);
      }
    };
    const exit = () => {
      cursor.close();
      if (!txn) useTxn?.abort();
    };

    // Start iteration
    let found = 0;
    const endBuf = q?.end ? this.encodeKey(q.end) : undefined;
    if (q?.start) {
      if (!find(q.start)) {
        return exit();
      }
    } else if (!next()) return exit;
    if (q?.offset) {
      if (!next(q.offset - 1)) return exit();
    }
    const rawItem = cursor.rawItem(
      endBuf ? true : includeKey,
      includeValue,
      q?.zeroCopy
    );
    if (endBuf && compare(<Buffer>rawItem.key, endBuf) > 0) return exit();
    found++;
    yield {
      key: includeKey && rawItem.key ? this.decodeKey(rawItem.key) : undefined,
      value: rawItem.value,
    };

    // Iterate over remainder
    while (next()) {
      if (q?.limit && ++found > q.limit) return exit();
      const rawItem = cursor.rawItem(
        endBuf ? true : includeKey,
        includeValue,
        q?.zeroCopy
      );
      if (endBuf && compare(<Buffer>rawItem.key, endBuf) > 0) return exit();
      yield {
        key:
          includeKey && rawItem.key ? this.decodeKey(rawItem.key) : undefined,
        value: rawItem.value,
      };
    }
    exit();
  }

  /** @returns an iterator over keys */
  *getKeys(q?: Query<K>, txn?: Transaction): IterableIterator<K> {
    for (const item of this.getItems(q, txn, true, false)) {
      if (!item.key) break;
      yield item.key;
    }
  }

  /** @returns an iterator over values (each value as Buffer) */
  *getValues(
    q?: Query<K> & { zeroCopy?: boolean },
    txn?: Transaction
  ): IterableIterator<Buffer> {
    for (const item of this.getItems(q, txn, false, true)) {
      if (!item.value) break;
      yield item.value;
    }
  }

  /** @returns an iterator over values (each value as string) */
  *getStrings(q?: Query<K>, txn?: Transaction): IterableIterator<string> {
    for (const value of this.getValues(q, txn)) {
      yield value.toString();
    }
  }
  /** @returns an iterator over values (each value as number) */
  *getNumbers(q?: Query<K>, txn?: Transaction): IterableIterator<number> {
    for (const value of this.getValues(q, txn)) {
      yield value.readDoubleBE();
    }
  }
  /** @returns an iterator over values (each value as boolean) */
  *getBooleans(q?: Query<K>, txn?: Transaction): IterableIterator<boolean> {
    for (const value of this.getValues(q, txn)) {
      yield bufReadBoolean(value);
    }
  }

  /** @returns an iterator over items (each item as DbItem<K, string>) */
  *getStringItems(
    q?: Query<K>,
    txn?: Transaction
  ): IterableIterator<DbItem<K, string>> {
    for (const item of this.getItems(q, txn, true, true)) {
      if (!(item.key || item.value)) break;
      yield {
        key: item.key,
        value: item.value?.toString(),
      };
    }
  }
  /** @returns an iterator over items (each item as DbItem<K, number>) */
  *getNumberItems(
    q?: Query<K>,
    txn?: Transaction
  ): IterableIterator<DbItem<K, number>> {
    for (const item of this.getItems(q, txn, true, true)) {
      if (!(item.key || item.value)) break;
      yield {
        key: item.key,
        value: item.value?.readDoubleBE(),
      };
    }
  }

  /** @returns an iterator over items (each item as DbItem<K, boolean>) */
  *getBooleanItems(
    q?: Query<K>,
    txn?: Transaction
  ): IterableIterator<DbItem<K, boolean>> {
    for (const item of this.getItems(q, txn, true, true)) {
      if (!(item.key || item.value)) break;
      yield {
        key: item.key,
        value: item.value ? bufReadBoolean(item.value) : false,
      };
    }
  }

  /** @returns a count of items matching the given query */
  getCount(q?: Omit<Query<K>, "reverse">, txn?: Transaction): number {
    let count = 0;
    for (const item of this.getItems(q, txn, false, false)) {
      count++;
    }
    return count;
  }

  /** Helper function for handling optional transaction argument */
  protected useTransaction<T>(
    callback: (useTxn: Transaction) => T,
    txn: Transaction | undefined
  ) {
    let useTxn: Transaction;
    if (txn) useTxn = txn;
    else useTxn = new Transaction(this.envp, true);
    try {
      return callback(useTxn);
    } finally {
      if (!txn && useTxn.isOpen) useTxn.abort();
    }
  }

  protected assertOpen(): void {
    if (!this.isOpen) throw new Error("Database is already closed.");
  }
}

export function calcDbFlags(flags: DbOptions) {
  return (
    (flags.create ? DbFlag.CREATE : 0) +
    (flags.reverseKey ? DbFlag.REVERSEKEY : 0)
  );
}

export function detachBuffer(buf: Buffer) {
  lmdb.detach_buffer(buf);
}

export function assertUSafe(num: number) {
  if (
    typeof num !== "number" ||
    num < 0 ||
    num > Number.MAX_SAFE_INTEGER ||
    Math.floor(num) !== num
  ) {
    throw new TypeError(
      `${num} must be an unsigned integer below ${Number.MAX_SAFE_INTEGER}`
    );
  }
}

export function bufWriteBoolean(buf: Buffer, val: boolean, offset = 0): void {
  buf.writeUInt8(val ? 1 : 0, offset);
}

export function bufReadBoolean(buf: Buffer, offset = 0): boolean {
  return buf.readUInt8(offset) ? true : false;
}

interface SerializedDB {
  envp: bigint;
  dbi: number;
  keyType: KeyType;
}

async function main() {
  const env = await openEnv(".testdb");
  const db = env.openDB(null);
  const txn = env.beginTxn();
  db.clear(txn);
  db.put("a", "alpha", txn);
  db.put("b", "bravo", txn);
  db.put("c", "charlie", txn);
  db.put("d", "delta", txn);
  db.put("e", "echo", txn);
  db.put("f", "foxtrot", txn);
  db.put("g", "golf", txn);
  txn.commit();
  const q: Query = {
    limit: 3,
  };
  for (const key of db.getKeys(q)) {
    console.log({ key });
  }
  for (const value of db.getStrings(q)) {
    console.log({ value });
  }
  for (const item of db.getItems(q)) {
    console.log({
      key: item.key,
      value: item.value?.toString(),
    });
  }

  const txn2 = env.beginTxn();
  db.put("x", true, txn2);
  db.put("y", false, txn2);
  db.put("z", true, txn2);
  console.log(Array.from(db.getBooleanItems({ start: "x", end: "z" }, txn2)));
  db.put("n1", 1, txn2);
  db.put("n2", 2, txn2);
  db.put("n3", 3, txn2);
  console.log(Array.from(db.getNumberItems({ start: "n", limit: 3 }, txn2)));
  let start = process.hrtime();
  const count = db.getCount({}, txn2);
  let diff = process.hrtime(start);
  console.log({ count, diff });
  start = process.hrtime();
  const all = Array.from(db.getItems({}, txn2));
  diff = process.hrtime(start);
  console.log({ all, diff });
  txn2.abort();
  db.close();
  env.close();
}
if (require.main === module) main();
