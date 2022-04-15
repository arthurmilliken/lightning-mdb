import { lmdb } from "./binding";
import { DbFlag, PutFlag } from "./constants";
import { Transaction } from "./transaction";
import { Key, KeyType, Value, PutFlags, DbOptions, DbStat } from "./types";
import { Buffer } from "buffer";
import { isMainThread } from "worker_threads";
import { openEnv } from "./environment";
import { Cursor } from "./cursor";

export interface SerializedDB {
  envp: bigint /** Address of MDB_env pointer */;
  dbi: number /** MDB_dbi handle */;
  keyType: KeyType /** Type for database keys */;
}

export class Database<K extends Key = string> {
  /** Create a Database from a serialized representation
   * @param serialized created by Database.serialize()
   * @returns Database<K> */
  static deserialize<K extends Key = string>(
    serialized: SerializedDB
  ): Database<K> {
    return new Database<K>(serialized);
  }

  protected _isOpen = false;
  get isOpen(): boolean {
    return this._isOpen;
  }

  protected _keyType: KeyType;
  /** Data type for stored keys */
  get keyType(): KeyType {
    return this._keyType;
  }

  protected _envp: bigint;
  get envp() {
    return this._envp;
  }

  protected _dbi: number;
  get dbi() {
    return this._dbi;
  }

  /**
   * Open a Database in the given environment
   * @param envp address of Environment pointer
   * @param name name of Database, or null for default (root) database
   * @param txn an open writable transaction
   * @param options
   */
  constructor(
    envp: bigint,
    name: string | null,
    txn: Transaction,
    options?: DbOptions
  );
  /**
   * Create a Database from a serialized representation
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
      const flags = options ? calcDbFlags(options) : 0;
      if (!txn) throw new Error("Transaction is required");
      this._dbi = lmdb.dbi_open(txn.txnp, name, flags);
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

  getOptions(txn?: Transaction): DbOptions {
    this.assertOpen();
    return this.useTransaction((useTxn) => {
      const flags = lmdb.dbi_flags(useTxn.txnp, this._dbi);
      return {
        keyType: this.keyType,
        create: flags & DbFlag.CREATE ? true : false,
        reverseKey: flags & DbFlag.REVERSEKEY ? true : false,
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
   * @param key the key under which the item is stored
   * @param txn an open Transaction (optional)
   * @param zeroCopy if true, returned Buffer is created using zero-copy
   *        semantics. This buffer must be detached by calling detachBuffer()
   *        before the end of the transaction, and before attempting any other
   *        operation involving the same key, even if that operation is being
   *        run in a separate thread. Use with caution.
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

  putAsync(key: K, value: Value, flags?: PutFlags): Promise<void> {
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
    lmdb.del({ txnp: txn.txnp, dbi: this._dbi, key: keyBuf });
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
  compareKeys(a: K, b: K, txn?: Transaction): number {
    return this.compareBuffers(this.encodeKey(a), this.encodeKey(b), txn);
  }

  compareBuffers(a: Buffer, b: Buffer, txn?: Transaction): number {
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
  openCursor(txn?: Transaction): Cursor<K> {
    return new Cursor<K>(this, txn);
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

async function main() {
  const env = await openEnv(".testdb");
  const db = env.openDB(null);
  const txn = env.beginTxn();
  db.clear(txn);
  db.put("a", "alpha", txn);
  db.put("b", "bravo", txn);
  db.put("c", "charlie", txn);
  const start = process.hrtime();
  const c = db.getString("c", txn);
  const diff = process.hrtime(start);
  console.log({ c, diff });
  txn.commit();
  db.close();
  env.close();
}
if (require.main === module) main();
