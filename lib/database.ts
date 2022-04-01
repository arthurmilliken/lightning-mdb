import { lmdb } from "./binding";
import { DbFlag, PutFlag } from "./constants";
import { Transaction } from "./transaction";
import { Cursor, CursorOptions, Key, KeyType, Value } from "./types";
import { Buffer } from "buffer";
import { isMainThread } from "worker_threads";
import { openEnv } from "./environment";

export interface DbOptions {
  /** create DB if not already existing */
  create?: boolean;
  /** use reverse string keys (compare final byte first) */
  reverseKey?: boolean;
  keyType?: KeyType;
}

export interface DbStat {
  pageSize: number /** Size of a database page.
  This is currently the same for all databases. */;
  depth: number /** Depth (height) of the B-tree */;
  branchPages: number /** Number of internal (non-leaf) pages */;
  leafPages: number /** Number of leaf pages */;
  overflowPages: number /** Number of overflow pages */;
  entries: number /** Number of data items */;
}

export interface PutFlags {
  /** Don't write if the key already exists. */
  noOverwrite?: boolean;
  /** Just reserve space for data, don't copy it. Return a
   * Buffer pointing to the reserved space, which the caller can fill in before
   * the transaction is committed. */
  reserve?: boolean;
  /** Data is being appended, don't split full pages. */
  append?: boolean;
  /** For noOverwrite = true, return zero-copy Buffer of value if key already
   * exists. This value is ignored if `.reserve = true` (Buffer will always be
   * zero-copy in this case).
   * Zero-copy Buffers MUST be detached using detachBuffer() before the end of
   * the current transaction, and before any other operations are attempted
   * involving the same key. This also applies to code being run in other threads.
   * Use with caution. */
  zeroCopy?: boolean;
}

export class Database<K extends Key = string> {
  /**
   * Use this method to create a Database for use in a Worker Thread
   * @param serialized created by Database.serialize()
   * @returns Database
   */
  static deserialize(serialized: SerializedDB): Database {
    return new Database(serialized);
  }

  envp: bigint;
  dbi: number;
  protected _isOpen = false;
  protected _keyType: KeyType;

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
      name = name || null; // coalesce undefined
      const _flags = options ? calcDbFlags(options) : 0;
      if (!txn) throw new Error("Transaction is required");
      this.dbi = lmdb.dbi_open(txn?.txnp, name, _flags);
      this.envp = envp;
      this._keyType = options?.keyType || "string";
    } else {
      const serialized = <SerializedDB>arg0;
      this.envp = serialized.envp;
      this.dbi = serialized.dbi;
      this._keyType = serialized.keyType;
    }
    this._isOpen = true;
  }
  serialize(): SerializedDB {
    return { envp: this.envp, dbi: this.dbi, keyType: this.keyType };
  }
  get isOpen(): boolean {
    return this._isOpen;
  }
  get keyType(): KeyType {
    return this._keyType;
  }

  protected useTransaction<T>(
    callback: (useTxn: Transaction) => T,
    txn?: Transaction
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

  stat(txn?: Transaction): DbStat {
    this.assertOpen();
    return this.useTransaction((useTxn) => {
      return lmdb.stat(useTxn.txnp, this.dbi);
    }, txn);
  }

  flags(txn?: Transaction): DbOptions {
    this.assertOpen();
    return this.useTransaction((useTxn) => {
      const _flags = lmdb.dbi_flags(useTxn.txnp, this.dbi);
      return {
        create: _flags & DbFlag.CREATE ? true : false,
        reverseKey: _flags & DbFlag.REVERSEKEY ? true : false,
      };
    }, txn);
  }
  close(): void {
    this.assertOpen();
    lmdb.dbi_close(this.envp, this.dbi);
    this._isOpen = false;
  }
  drop(txn: Transaction, del?: boolean): void {
    this.assertOpen();
    lmdb.mdb_drop(txn.txnp, this.dbi, del || false);
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
   * @returns Buffer of data item, or null if key not found
   */
  get(key: K, txn?: Transaction, zeroCopy?: boolean): Buffer | null {
    this.assertOpen();
    return this.useTransaction((useTxn) => {
      return lmdb.get(useTxn.txnp, this.dbi, this.encodeKey(key), zeroCopy);
    }, txn);
  }
  getString(key: K, txn?: Transaction): string | null {
    // v8 crashes if two Buffers are created which point to the same memory
    const zeroCopy = isMainThread ? true : false;
    return this.useTransaction((useTxn) => {
      const buf = this.get(key, useTxn, zeroCopy);
      if (!buf) return null;
      const str = buf.toString();
      if (buf) detachBuffer(buf);
      return str;
    }, txn);
  }
  getNumber(key: K, txn?: Transaction): number | null {
    // v8 crashes if two Buffers are created which point to the same memory
    const zeroCopy = isMainThread ? true : false;
    return this.useTransaction((useTxn) => {
      const buf = this.get(key, useTxn, zeroCopy);
      if (!buf) return null;
      const num = buf.readDoubleBE();
      detachBuffer(buf);
      return num;
    }, txn);
  }
  getBoolean(key: K, txn?: Transaction): boolean | null {
    // v8 crashes if two Buffers are created which point to the same memory
    const zeroCopy = isMainThread ? true : false;
    return this.useTransaction((useTxn) => {
      const buf = this.get(key, useTxn, zeroCopy);
      if (!buf) return null;
      const bool = buf.readUInt8() ? true : false;
      detachBuffer(buf);
      return bool;
    }, txn);
  }

  /**
   * Store item into database.
   *
   * This function stores key/data pairs in the database. The default behavior
   * is to enter the new key/data pair, replacing any previously existing key.
   * @param key the key to store in the database
   * @param value the value to store. If flags.reserve == true, this should be the
   *              number of bytes to reserve.
   * @param txn an open writable transaction
   * @param flags see @type {PutFlags} for details.
   * @returns null if successful, or:
   *          - a buffer containing the existing value if flags.noOverwrite == true
   *            and the key already exists
   *          - an allocated buffer of length `value` if flags.reserve == true
   */
  put(
    key: K,
    value: Value | number,
    txn: Transaction,
    flags?: PutFlags
  ): Buffer | null {
    this.assertOpen();
    const keyBuf = this.encodeKey(key);
    const valueBuf = this.encodeValue(value);
    const _flags = flags ? calcPutFlags(flags) : 0;
    const zeroCopy = flags?.zeroCopy ? true : false;
    return lmdb.put(txn.txnp, this.dbi, keyBuf, valueBuf, _flags, zeroCopy);
  }
  putAsync(key: K, value: Value, flags?: PutFlags): Promise<Buffer | null> {
    throw new Error("Method not implemented.");
  }
  del(key: K, txn: Transaction): void {
    this.assertOpen();
    const keyBuf = this.encodeKey(key);
    lmdb.del(txn.txnp, this.dbi, keyBuf);
  }
  delAsync(key: K): Promise<void> {
    throw new Error("Method not implemented.");
  }
  cursor(options: CursorOptions<K>, txn?: Transaction): Cursor<K> {
    this.assertOpen();
    throw new Error("Method not implemented.");
  }
  /**
   * Compare two data items according to a particular database.
   *
   * This returns a comparison as if the two data items were keys in the
   * specified database.
   * @param a the first item to compare
   * @param b the second item to compare
   * @param txn
   * @returns < 0 if a < b, 0 if a == b, > 0 if a > b
   */
  compare(a: K, b: K, txn?: Transaction): number {
    this.assertOpen();
    const aBuf = this.encodeKey(a);
    const bBuf = this.encodeKey(b);
    let useTxn = txn;
    if (!useTxn) useTxn = new Transaction(this.envp, true);
    const cmp = lmdb.cmp(useTxn.txnp, this.dbi, aBuf, bBuf);
    if (!txn) useTxn.abort();
    return cmp;
  }

  protected encodeKey(key: Key): Buffer {
    if (typeof key !== this.keyType) {
      throw new TypeError(
        `Key must be of type ${this.keyType}, found ${typeof key} instead`
      );
    }
    if (key instanceof Buffer) return key;
    if (typeof key === "string") return Buffer.from(key);
    if (typeof key === "number") {
      assertU64(key);
      const buf = Buffer.allocUnsafe(8);
      buf.writeBigInt64BE(BigInt(key));
      return buf;
    }
    throw new TypeError(`Invalid key: ${key}`);
  }

  protected encodeValue(value: Value): Buffer {
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
}

export function calcDbFlags(flags: DbOptions) {
  return (
    (flags.create ? DbFlag.CREATE : 0) +
    (flags.reverseKey ? DbFlag.REVERSEKEY : 0)
  );
}

export function calcPutFlags(flags: PutFlags) {
  return (
    (flags.noOverwrite ? PutFlag.NOOVERWRITE : 0) +
    (flags.reserve ? PutFlag.RESERVE : 0) +
    (flags.append ? PutFlag.APPEND : 0)
  );
}

export function detachBuffer(buf: Buffer) {
  lmdb.detach_buffer(buf);
}

export function assertU64(num: number) {
  if (
    typeof num !== "number" ||
    num < 0 ||
    num > Number.MAX_SAFE_INTEGER ||
    Math.floor(num) !== num
  ) {
    throw new TypeError(
      `${num} is not zero or a positive integer below Number.MAX_SAFE_INTEGER`
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
  console.log("after openEnv()");
  const db = env.openDB(null);
  console.log("after env.openDB()");
  const txn = env.beginTxn();
  db.clear(txn);
  console.log("after env.beginTxn()");
  db.put("a", "apple seeds", txn);
  db.put("b", "banana peels", txn);
  db.put("c", "cherry pits", txn);
  console.log({
    a: db.getString("a", txn),
    b: db.getString("b", txn),
    c: db.getString("c", txn),
  });
  txn.commit();
  db.close();
  env.close();
}
if (require.main === module) main();
