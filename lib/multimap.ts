import { lmdb } from "./binding";
import { DbFlag, PutFlag } from "./constants";
import { Database, SerializedDB } from "./database";
import { openEnv } from "./environment";
import { MultimapCursor } from "./multimap_cursor";
import { Transaction } from "./transaction";
import { Key, KeyType, MultimapOptions, MultimapPutFlags } from "./types";

function calcMultimapFlags(flags: MultimapOptions): number {
  return (
    DbFlag.DUPSORT +
    ((flags.create ? DbFlag.CREATE : 0) +
      (flags.reverseKey ? DbFlag.REVERSEKEY : 0) +
      (flags.reverseDup ? DbFlag.REVERSEDUP : 0) +
      (flags.dupFixed ? DbFlag.DUPFIXED : 0))
  );
}

interface SerializedMultimap {
  envp: bigint;
  dbi: number;
  keyType: KeyType;
  valueType: KeyType;
  isDupFixed: boolean;
}

/**
 * Multimap represents a "duplicate key, sorted value" database, which allows
 * multiple values to be stored under the same key.
 * (Also known as a "dupsort" database) */
export class Multimap<
  K extends Key = string,
  V extends Key = string
> extends Database<K> {
  /** Create a Multimap from a serialized representation
   * @param serialized created by Multimap.serialize()
   * @returns Multimap<K, V> */
  static deserialize<K extends Key = string, V extends Key = string>(
    serialized: SerializedMultimap
  ): Multimap<K, V> {
    return new Multimap<K, V>(serialized);
  }

  protected _valueType: KeyType;
  /** Data type for stored values */
  get valueType(): KeyType {
    return this._valueType;
  }

  protected _isDupFixed: boolean;
  get isDupFixed(): boolean {
    return this._isDupFixed;
  }

  /**
   * Open a Multimap database in the given environment
   * @param envp address of Environment pointer
   * @param name name of Multimap
   * @param txn an open writable transaction
   * @param options
   */
  constructor(
    envp: bigint,
    name: string,
    txn: Transaction,
    options?: MultimapOptions
  );
  /**
   * Create a Multimap from a serialized representation
   * @param serialized
   */
  constructor(serialized: SerializedMultimap);
  constructor(
    arg0: bigint | SerializedMultimap,
    name?: string,
    txn?: Transaction,
    options?: MultimapOptions
  ) {
    if (typeof arg0 === "bigint") {
      super({
        envp: arg0,
        dbi: 0, // will be overwritten below
        keyType: options?.keyType || "string",
      });
      const flags = calcMultimapFlags(options || {});
      if (!txn) throw new Error("Transaction is required");
      if (!name) throw new Error("Name is required");
      this._dbi = lmdb.dbi_open(txn.txnp, name, flags);
      this._valueType = options?.valueType || "string";
      this._isDupFixed = options?.dupFixed || false;
    } else {
      const serialized = <SerializedMultimap>arg0;
      super(serialized);
      this._valueType = serialized.valueType;
      this._isDupFixed = serialized.isDupFixed;
    }
  }

  /** Create serialization token for use with Worker Thread */
  serialize(): SerializedMultimap {
    this.assertOpen();
    return {
      envp: this.envp,
      dbi: this._dbi,
      keyType: this.keyType,
      valueType: this.valueType,
      isDupFixed: this.isDupFixed,
    };
  }

  getOptions(txn?: Transaction): MultimapOptions {
    this.assertOpen();
    return this.useTransaction((useTxn) => {
      const flags = lmdb.dbi_flags(useTxn.txnp, this._dbi);
      if (!(flags & DbFlag.DUPSORT))
        throw new Error("This is not a Multimap database");
      return {
        keyType: this.keyType,
        create: flags & DbFlag.CREATE ? true : false,
        reverseKey: flags & DbFlag.REVERSEKEY ? true : false,
        reverseDup: flags & DbFlag.REVERSEDUP ? true : false,
        dupFixed: flags & DbFlag.DUPFIXED ? true : false,
      };
    }, txn);
  }

  /**
   * Get item from multimap.
   * @param key the key under which the data is stored. If multiple items are
   *        stored under this key, only the FIRST data item will be returned.
   * @param txn an open Transaction
   * @param zeroCopy if true, returned Buffer is created using zero-copy
   *        semantics. This buffer must be detached by calling detachBuffer()
   *        before the end of the transaction, and before attempting any other
   *        operation involving the same key, even if that operation is being
   *        run in a separate thread. Use with caution.
   * @returns Buffer of data item
   */
  get(key: K, txn?: Transaction, zeroCopy = false): Buffer {
    return super.get(key, txn, zeroCopy);
  }

  /**
   * Store key/value pair into multimap. This record will be added as a duplicate
   * if the key already exists unless `flags.noOverwrite === true`. However, each
   * key/value pair is still unique.
   * @param key the key to store
   * @param value the value to store
   * @param txn an open writable transaction
   * @param {MultimapPutFlags} flags */
  put(key: K, value: V, txn: Transaction, flags?: MultimapPutFlags): void {
    this.assertOpen();
    txn.assertOpen();
    const keyBuf = this.encodeKey(key);
    const valueBuf = this.encodeValue(value);
    const _flags =
      (flags?.append ? PutFlag.APPEND : 0) +
      (flags?.appendDup ? PutFlag.APPENDDUP : 0) +
      (flags?.noOverwrite ? PutFlag.NOOVERWRITE : 0) +
      (flags?.noDupData ? PutFlag.NODUPDATA : 0);
    lmdb.put({
      txnp: txn.txnp,
      dbi: this._dbi,
      key: keyBuf,
      value: valueBuf,
      flags: _flags,
    });
  }

  putAsync(key: K, value: V, flags?: MultimapPutFlags): Promise<void> {
    throw new Error("Method not implemented.");
  }

  putMultiple(
    key: K,
    values: Buffer,
    bytesPerValue: number,
    txn: Transaction,
    flags?: Omit<MultimapPutFlags, "noDupData">
  ): void {
    this.assertOpen();
    txn.assertOpen();
    if (values.length % bytesPerValue !== 0) {
      throw new RangeError("values.length must be a multiple of bytesPerValue");
    }
    const keyBuf = this.encodeKey(key);
    const valueBuf = this.encodeValue(values);
    const _flags =
      (flags?.append ? PutFlag.APPEND : 0) +
      (flags?.appendDup ? PutFlag.APPENDDUP : 0) +
      (flags?.noOverwrite ? PutFlag.NOOVERWRITE : 0);
    lmdb.put_multiple({
      txnp: txn.txnp,
      dbi: this._dbi,
      key: keyBuf,
      values: valueBuf,
      bytesPerValue,
      flags: _flags,
    });
  }

  /**
   * Removes all key/value entries for the given key.
   * @param key the key to delete
   * @param txn an open writeable transaction
   */
  del(key: K, txn: Transaction): void {
    super.del(key, txn);
  }

  /**
   * Removes a single key/value entry from the multimap.
   * @param key the key to delete
   * @param value the value to delete
   * @param txn an open writeable transaction
   */
  delEntry(key: K, value: V, txn: Transaction): void {
    this.assertOpen();
    const keyBuf = this.encodeKey(key);
    const valueBuf = this.encodeValue(value);
    lmdb.del({ txnp: txn.txnp, dbi: this._dbi, key: keyBuf, value: valueBuf });
  }

  delEntryAsync(key: K, value: V): Promise<void> {
    throw new Error("Method not implemented.");
  }

  /** @returns a cursor for this multimap, which the caller can use to navigate keys */
  openCursor(txn?: Transaction): MultimapCursor<K, V> {
    return new MultimapCursor<K, V>(this, txn);
  }
}

async function main() {
  const env = await openEnv(".testdb", { maxDBs: 2 });
  const db = env.openMultimap("multimap", { create: true });
  const txn = env.beginTxn();
  db.clear(txn);
  db.put("a", "alpha1", txn);
  db.put("a", "alpha2", txn);
  db.put("a", "alpha3", txn);
  db.put("b", "bravo1", txn);
  db.put("b", "bravo2", txn);
  db.put("b", "bravo3", txn);
  db.put("c", "charlie1", txn);
  db.put("c", "charlie2", txn);
  db.put("c", "charlie3", txn);
  const cursor = db.openCursor(txn);
  while (cursor.next()) {
    const item = cursor.stringItem();
    console.log({ key: item.key, value: item.value });
  }
  txn.commit();
  db.close();
  env.close();
}
if (require.main === module) main();
