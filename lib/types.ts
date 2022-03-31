import { DbFlags } from "./database";
import { DbStat, Environment } from "./environment";
import { Transaction } from "./transaction";

export interface DupFlags extends DbFlags {
  /** sorted dup items have fixed size */
  dupFixed?: boolean;
  /** dups are integerKey-style integers */
  integerDup?: boolean;
  /** use reverse string dups */
  reverseDup?: boolean;
}

export interface DupPutFlags extends PutFlags {
  /** For put: don't write if the key and data pair already exist.<br>
   * For mdb_cursor_del: remove all duplicate data items. */
  noDupData?: boolean;
  /** Duplicate data is being appended, don't split full pages. */
  appendDup?: boolean;
  /** Store multiple data items in one call. Only for #MDB_DUPFIXED. */
  multiple?: boolean;
}

export interface PutFlags {
  flags?: number /** bitmask */;
  /** Don't write if the key already exists. */
  noOverwrite?: boolean;
  /** For put: Just reserve space for data, don't copy it. Return a
   * pointer to the reserved space. */
  reserve?: boolean;
  /** Data is being appended, don't split full pages. */
  append?: boolean;
}

export type Key = string | number | Buffer;
export type Value = Key | boolean;

export type KeyType = "string" | "number" | "Buffer";
export type ValueType = "string" | "number" | "Buffer" | "boolean";

export interface IDatabase<K extends Key = string> {
  readonly envp: bigint;
  readonly dbi: number;
  stat(txn?: Transaction): DbStat;
  flags(txn?: Transaction): DbFlags;
  close(env: Environment): void;
  drop(txn?: Transaction, del?: boolean): void;
  get(key: K, txn?: Transaction, zeroCopy?: boolean): Buffer;
  getString(key: K, txn?: Transaction): string;
  getNumber(key: K, txn?: Transaction): number;
  getBoolean(key: K, txn?: Transaction): boolean;
  put(key: K, value: Value, txn: Transaction, flags?: PutFlags): void;
  putAsync(key: K, value: Value, flags?: PutFlags): Promise<void>;
  add(
    key: K,
    value: Value,
    txn: Transaction,
    flags?: PutFlags,
    zeroCopy?: boolean
  ): Buffer | null;
  addAsync(key: K, value: Value, flags?: PutFlags): Promise<Buffer | null>;
  del(key: K, txn: Transaction): void;
  delAsync(key: K): Promise<void>;
  cursor(options: CursorOptions<K>, txn?: Transaction): Cursor<K>;
  compare(a: K, b: K): number;
}

export interface CursorOptions<K extends Key = string> {
  start?: K;
  end?: K;
  reverse?: boolean;
  limit?: boolean;
  offset?: boolean;
  zeroCopy?: boolean;
}

export interface Entry<K extends Key = string> {
  keyBuf: Buffer;
  valueBuf: Buffer;
  key(): K;
  valueString(): string;
  valueNumber(): number;
  valueBoolean(): boolean;
  detach(): void;
}

export interface Cursor<K extends Key = string> {
  readonly cursorp: bigint;
  readonly txnp: bigint;
  readonly options: CursorOptions;
  close(): void;
  renew(txn: Transaction): void;
  put(key: Buffer, value: Buffer, flags: CursorPutFlags): void;
  del(noDupData?: boolean): void;

  first(): Entry<K> | null;
  current(): Entry<K> | null;
  last(): Entry<K> | null;
  next(): Entry<K> | null;
  prev(): Entry<K> | null;
  find(key: K): Entry<K> | null;
  findEntry(key: K): Entry<K> | null;
  findNext(key: K): Entry<K> | null;
  iterator(): Generator<Entry<K>, void, K>;
}

export interface CursorPutFlags extends PutFlags {
  current?: boolean;
  multiple?: boolean;
}

export interface DbDupsort<K extends Key = string, V extends Key = string>
  extends IDatabase<K> {
  getFlags(txn?: Transaction): DupFlags;
  put(key: K, value: V, txn: Transaction, flags: DupPutFlags): void;
  put(key: K, value: V, txn: Transaction, flags?: DupPutFlags): void;
  putAsync(key: K, value: V, flags?: DupPutFlags): Promise<void>;
  add(
    key: K,
    value: V,
    txn: Transaction,
    flags?: DupPutFlags,
    zeroCopy?: boolean
  ): Buffer | null;
  addAsync(key: K, value: V, flags?: DupPutFlags): Promise<Buffer | null>;
  delDup(key: K, value: V, txn: Transaction): void;
  delDupAsync(key: K, value: V): Promise<void>;
  compareData(a: V, b: V): number;
}

export interface CursorDupsort<K extends Key = string, V extends Key = string>
  extends Cursor<K> {
  firstDup(): Entry<K> | null;
  findDup(key: K, value: V): Entry<K> | null;
  findNextDup(key: K, value: V): Entry<K> | null;
  currentPage(): Entry<K>[] | null;
  lastDup(): Entry<K> | null;
  nextDup(): Entry<K> | null;
  nextPage(): Entry<K>[] | null;
  nextKey(): Entry<K> | null;
  prevDup(): Entry<K> | null;
  prevKey(): Entry<K> | null;
  prevPage(): Entry<K>[] | null;
}

export interface DupCursorOptions<
  K extends Key = string,
  V extends Key = string
> extends CursorOptions<K> {
  noDups?: boolean /** iterate unique keys only */;
  startValue?: V;
  endValue?: V;
  paginated?: boolean /** fetch one "page" at a time */;
}
