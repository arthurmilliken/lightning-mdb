export interface DbVersion {
  version: string;
  major: number;
  minor: number;
  patch: number;
}

export interface DbStat {
  pageSize: number;
  depth: number;
  branchPages: number;
  leafPages: number;
  overflowPages: number;
  entries: number;
}

export interface EnvInfo {
  mapAddr: bigint;
  mapSize: number;
  lastPage: number;
  lastTxn: number;
  maxReaders: number;
  numReaders: number;
}

export interface EnvOptions extends EnvFlags {
  /** mmap at a fixed address (experimental) */
  fixedMap?: boolean;
  /** no environment directory */
  noSubdir?: boolean;
  /** read only */
  readOnly?: boolean;
  /** use writable mmap */
  writeMap?: boolean;
  /** tie reader locktable slots to #MDB_txn objects instead of to threads */
  noTLS?: boolean;
  /** don't do any locking, caller must manage their own locks */
  noLock?: boolean;
  /** don't do readahead (no effect on Windows) */
  noReadAhead?: boolean;
  /** size (in bytes) of memory map */
  mapSize?: number;
  /** max number of readers */
  maxReaders?: number;
  /** max number of dbs */
  maxDBs?: number;
}

export interface EnvFlags {
  flags?: number /** bitmask of flags */;
  /** don't fsync metapage after commit */
  noMetaSync?: boolean;
  /** don't fsync after commit */
  noSync?: boolean;
  /** use asynchronous msync when #MDB_WRITEMAP is used */
  mapAsync?: boolean;
  /** don't initialize malloc'd memory before writing to datafile */
  noMemInit?: boolean;
}

export enum EnvFlag {
  FIXEDMAP = 0x01,
  NOSUBDIR = 0x4000,
  NOSYNC = 0x10000,
  RDONLY = 0x20000,
  NOMETASYNC = 0x40000,
  WRITEMAP = 0x80000,
  MAPASYNC = 0x100000,
  NOTLS = 0x200000,
  NOLOCK = 0x400000,
  NORDAHEAD = 0x800000,
  NOMEMINIT = 0x1000000,
}

export interface Env {
  readonly envp: bigint;
  open(path: string, flags: EnvOptions, mode: number): void;
  copy(path: string, compact?: boolean): void;
  copyFD(fd: number, compact?: boolean): void;
  stat(): DbStat;
  info(): EnvInfo;
  sync(force?: boolean): void;
  close(): void;
  setFlags(flags: EnvFlags): void;
  getFlags(): EnvOptions;
  getPath(): string;
  getFD(): number;
  setMapSize(size: number): void;
  getMaxReaders(): number;
  getMaxKeySize(): number;
  setUserCtx(ctx: Buffer): void;
  getUserCtx(): Buffer;
  beginTxn(readOnly?: false, parent?: Txn): Txn;
}

export interface Txn {
  readonly txnp: bigint;
  env(): Env;
  id(): number;
  commit(): void;
  abort(): void;
  reset(): void;
  renew(): void;
  openDB(name: string | null, flags?: DbFlags): Database;
}

export enum DbFlag {
  REVERSEKEY = 0x02,
  /** use sorted duplicates */
  DUPSORT = 0x04,
  INTEGERKEY = 0x08,
  DUPFIXED = 0x10,
  INTEGERDUP = 0x20,
  REVERSEDUP = 0x40,
  CREATE = 0x40000,
}

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

export interface DbFlags {
  flags?: number /** bitmask */;
  /** create DB if not already existing */
  create?: boolean;
  /** use reverse string keys */
  reverseKey?: boolean;
  /** numeric keys in native byte order: either unsigned int or size_t.
   *  The keys must all be of the same size. */
  integerKey?: boolean;
}

export enum PutFlag {
  NOOVERWRITE = 0x10,
  NODUPDATA = 0x20,
  /** For mdb_cursor_put: overwrite the current key/data pair */
  CURRENT = 0x40,
  RESERVE = 0x10000,
  APPEND = 0x20000,
  APPENDDUP = 0x40000,
  MULTIPLE = 0x80000,
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

export type KeyType = "string" | "number" | "binary";
export type ValueType = "string" | "number" | "binary" | "boolean";

export interface Database<K extends Key = string> {
  readonly envp: bigint;
  readonly dbi: number;
  stat(txn: Txn): DbStat;
  flags(txn: Txn): DbFlags;
  close(env: Env): void;
  drop(txn?: Txn, del?: boolean): void;
  get(key: K, txn?: Txn): Buffer;
  getBufferFast(key: K, txn?: Txn): Buffer;
  getString(key: K, txn?: Txn): string;
  getNumber(key: K, txn?: Txn): number;
  getBoolean(key: K, txn?: Txn): boolean;
  put(key: K, value: Value, txn: Txn, flags?: PutFlags): void;
  putAsync(key: K, value: Value, flags?: PutFlags): Promise<void>;
  add(key: K, value: Value, txn: Txn, flags?: PutFlags): Buffer | null;
  addFast(key: K, value: Value, txn: Txn, flags?: PutFlags): Buffer | null;
  addAsync(key: K, value: Value, flags?: PutFlags): Promise<Buffer | null>;
  del(key: K, txn: Txn): void;
  delAsync(key: K): Promise<void>;
  cursor(options: CursorOptions<K>, txn?: Txn): Cursor<K>;
}

export interface CursorOptions<K extends Key = string> {
  start?: K;
  end?: K;
  reverse?: boolean;
  limit?: boolean;
  offset?: boolean;
}

export interface Entry<K extends Key = string> {
  keyBuf: Buffer;
  valueBuf: Buffer;
  key(): K;
  valueString(): string;
  valueNumber(): number;
  valueBoolean(): boolean;
}

export interface Cursor<K extends Key = string> {
  readonly cursorPtr: number;
  readonly txn: Txn;
  readonly db: Database;
  close(): void;
  renew(txn: Txn): void;
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
  extends Database<K> {
  getFlags(txn?: Txn): DupFlags;
  put(key: K, value: V, txn: Txn, flags: DupPutFlags): void;
  put(key: K, value: V, txn: Txn, flags?: DupPutFlags): void;
  putAsync(key: K, value: V, flags?: DupPutFlags): Promise<void>;
  add(key: K, value: V, txn: Txn, flags?: DupPutFlags): Buffer | null;
  addAsync(key: K, value: V, flags?: DupPutFlags): Promise<Buffer | null>;
  delDup(key: K, value: V, txn: Txn): void;
  delDupAsync(key: K, value: V): Promise<void>;
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

enum CursorOp {
  First = 0,
  FirstDup /* dupsort */,
  GetBoth /* dupsort */,
  GetBothRange /* dupsort */,
  GetCurrent,
  GetMultiple /* dupfixed */,
  Last,
  LastDup /* dupsort */,
  Next,
  NextDup /* dupsort */,
  NextMultiple /* dupfixed */,
  NextNoDup /* dupsort */,
  Prev,
  PrevDup /* dupsort */,
  PrevNoDup /* dupsort */,
  Set,
  SetKey,
  SetRange,
  PrevMultiple /* dupfixed */,
}

interface lmdb {
  version(): DbVersion;
  strerror(code: number): string;
}
