import { lmdb } from "./binding";
import { DbFlag } from "./constants";
import { DbStat, Environment } from "./environment";
import { Transaction } from "./transaction";
import { Cursor, CursorOptions, IDatabase, PutFlags, Value } from "./types";
const { isMainThread } = require("worker_threads");

interface SerializedDB {
  envp: bigint;
  dbi: number;
}

export interface DbFlags {
  /** create DB if not already existing */
  create?: boolean;
  /** use reverse string keys */
  reverseKey?: boolean;
  /** numeric keys in native byte order: either unsigned int or size_t.
   *  The keys must all be of the same size. */
  integerKey?: boolean;
}

export function calcDbFlags(flags: DbFlags) {
  return (
    (flags.create ? DbFlag.CREATE : 0) +
    (flags.integerKey ? DbFlag.INTEGERKEY : 0) +
    (flags.reverseKey ? DbFlag.REVERSEKEY : 0)
  );
}

export class Database implements IDatabase {
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
  private _isOpen = false;

  /**
   * Opens a Database in the given environment
   * @param envp
   * @param name
   * @param flags
   * @param txn
   */
  constructor(
    envp: bigint,
    name: string | null,
    flags?: DbFlags,
    txn?: Transaction
  );
  /**
   * Creates a Database from a serialized representation
   * @param serialized
   */
  constructor(serialized: SerializedDB);
  constructor(
    arg0: bigint | SerializedDB,
    name?: string | null,
    flags?: DbFlags,
    txn?: Transaction
  ) {
    if (arg0 instanceof BigInt) {
      if (!isMainThread) {
        throw new Error(
          "Cannot use this constructor from Worker Thread. Use Database.deserialize() instead."
        );
      }
      const envp = <bigint>arg0;
      name = name || null; // coalesce undefined
      const _flags = calcDbFlags(Object.assign({}, flags));
      let useTxn = txn;
      if (!useTxn) useTxn = new Transaction(envp);
      this.dbi = lmdb.dbi_open(useTxn.txnp, name, _flags);
      if (!txn) useTxn.commit();
      this.envp = envp;
    } else {
      const serialized = <SerializedDB>arg0;
      this.envp = serialized.envp;
      this.dbi = serialized.dbi;
    }
  }
  serialize(): SerializedDB {
    return { envp: this.envp, dbi: this.dbi };
  }
  get isOpen(): boolean {
    return this._isOpen;
  }
  stat(txn?: Transaction): DbStat {
    throw new Error("Method not implemented.");
  }
  flags(txn?: Transaction): DbFlags {
    throw new Error("Method not implemented.");
  }
  close(env: Environment): void {
    throw new Error("Method not implemented.");
  }
  drop(txn?: Transaction, del?: boolean): void {
    throw new Error("Method not implemented.");
  }
  get(key: string, txn?: Transaction, zeroCopy?: boolean): Buffer {
    throw new Error("Method not implemented.");
  }
  getString(key: string, txn?: Transaction): string {
    throw new Error("Method not implemented.");
  }
  getNumber(key: string, txn?: Transaction): number {
    throw new Error("Method not implemented.");
  }
  getBoolean(key: string, txn?: Transaction): boolean {
    throw new Error("Method not implemented.");
  }
  put(key: string, value: Value, txn: Transaction, flags?: PutFlags): void {
    throw new Error("Method not implemented.");
  }
  putAsync(key: string, value: Value, flags?: PutFlags): Promise<void> {
    throw new Error("Method not implemented.");
  }
  add(
    key: string,
    value: Value,
    txn: Transaction,
    flags?: PutFlags,
    zeroCopy?: boolean
  ): Buffer | null {
    throw new Error("Method not implemented.");
  }
  addAsync(
    key: string,
    value: Value,
    flags?: PutFlags
  ): Promise<Buffer | null> {
    throw new Error("Method not implemented.");
  }
  del(key: string, txn: Transaction): void {
    throw new Error("Method not implemented.");
  }
  delAsync(key: string): Promise<void> {
    throw new Error("Method not implemented.");
  }
  cursor(options: CursorOptions<string>, txn?: Transaction): Cursor<string> {
    throw new Error("Method not implemented.");
  }
  compare(a: string, b: string): number {
    throw new Error("Method not implemented.");
  }
}
