import { lmdb } from "./binding";
import { AddMode, DbFlag, PutFlag } from "./constants";
import { Transaction } from "./transaction";
import { ICursor, CursorOptions, Key, KeyType, Value, PutFlags } from "./types";
import { Buffer } from "buffer";
import { isMainThread } from "worker_threads";
import { openEnv } from "./environment";

export interface DbOptions {
  /** create DB if not already existing */
  create?: boolean;
  /** use reverse string keys (compare final byte first) */
  reverseKey?: boolean;
  /** database keys must be of this type (default: "string") */
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
      name = name || null; // coalesce undefined
      const _flags = options ? calcDbFlags(options) : 0;
      if (!txn) throw new Error("Transaction is required");
      this._dbi = lmdb.dbi_open(txn?.txnp, name, _flags);
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
   * @returns Buffer of data item, or null if key not found
   */
  get(key: K, txn?: Transaction, zeroCopy?: boolean): Buffer | null {
    this.assertOpen();
    return this.useTransaction((useTxn) => {
      return lmdb.get(useTxn.txnp, this._dbi, this.encodeKey(key), zeroCopy);
    }, txn);
  }

  /**
   * Retrieve item as string
   * @param key
   * @param txn
   * @returns null if not found
   */
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

  /**
   * Retrieve item as number
   * @param key
   * @param txn
   * @returns null if not found
   */
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

  /**
   * Retrieve item as boolean
   * @param key
   * @param txn
   * @returns null if not found
   */
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
    lmdb.put(
      txn.txnp,
      this._dbi,
      keyBuf,
      valueBuf,
      flags?.append ? PutFlag.APPEND : 0
    );
  }

  putAsync(key: K, value: Value): Promise<Buffer | null> {
    throw new Error("Method not implemented.");
  }

  /**
   * Add item into database if the key does not already exist.
   * @param key the key to store
   * @param value the value to store
   * @param txn an open writable transaction
   * @param {AddMode} mode (default RETURN_BOOLEAN)
   *        RETURN_BOOLEAN - return true if successful, false if key already exists.
   *        RETURN_CURRENT - return true if successful, otherwise return current
   *          value as Buffer.
   *        RETURN_ZEROCOPY - as RETURN_CURRENT, but returned Buffer is created
   *          using zero-copy semantics. This buffer must be detached by calling
   *          detachBuffer() before the end of the transaction, and before
   *          attempting any other operation involving the same key. This also
   *          applies to code being run in other threads. Use with caution.
   * @returns boolean or Buffer. see `mode` param for details */
  add(
    key: K,
    value: Value,
    txn: Transaction,
    mode = AddMode.RETURN_BOOLEAN
  ): boolean | Buffer {
    this.assertOpen();
    txn.assertOpen();
    const keyBuf = this.encodeKey(key);
    const valueBuf = this.encodeValue(value);
    return lmdb.add(txn.txnp, this._dbi, keyBuf, valueBuf, mode);
  }

  addAsync(
    key: K,
    value: Value,
    mode: Exclude<AddMode, AddMode.RETURN_ZEROCOPY>
  ): boolean | Buffer {
    throw new Error("Method not implementd.");
  }

  /**
   * Reserve space inside the database at the current key, and return a Buffer
   * which the caller can fill in before the transaction ends.
   * @param key the key to store
   * @param size the size in Bytes to allocate for the Buffer
   * @param txn an open writable transaction
   * @param flags
   * @returns an empty buffer of `size` bytes, or false if
   *          `flags.noOverwrite == true` and key already exists.
   */
  reserve(
    key: K,
    size: number,
    txn: Transaction,
    flags?: PutFlags & { noOverwrite?: boolean }
  ): Buffer | false {
    this.assertOpen();
    txn.assertOpen();
    const keyBuf = this.encodeKey(key);
    const flagVal =
      (flags?.append ? PutFlag.APPEND : 0) +
      (flags?.noOverwrite ? PutFlag.NOOVERWRITE : 0);
    return lmdb.put(txn.txnp, this._dbi, keyBuf, size, flagVal);
  }

  /**
   * Removes key/data pair from the database.
   * @param key the key to delete
   * @param txn an open writeable transaction
   * @returns true if successful, false if the key does not exist.
   */
  del(key: K, txn: Transaction): boolean {
    this.assertOpen();
    const keyBuf = this.encodeKey(key);
    return lmdb.del(txn.txnp, this._dbi, keyBuf);
  }

  delAsync(key: K): Promise<void> {
    throw new Error("Method not implemented.");
  }

  cursor(options: CursorOptions<K>, txn?: Transaction): ICursor<K> {
    this.assertOpen();
    throw new Error("Method not implemented.");
  }

  /** Return a comparison as if the two items were keys in this database.
   * @param a the first item to compare
   * @param b the second item to compare
   * @param txn an optional transaction context
   * @returns < 0 if a < b, 0 if a == b, > 0 if a > b
   */
  compare(a: K, b: K, txn?: Transaction): number {
    this.assertOpen();
    const aBuf = this.encodeKey(a);
    const bBuf = this.encodeKey(b);
    let useTxn = txn;
    if (!useTxn) useTxn = new Transaction(this.envp, true);
    const cmp = lmdb.cmp(useTxn.txnp, this._dbi, aBuf, bBuf);
    if (!txn) useTxn.abort();
    return cmp;
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
  const db = env.openDB(null);
  const txn = env.beginTxn();
  db.clear(txn);
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
