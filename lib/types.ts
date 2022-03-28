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
  fixedMap?: boolean;
  noSubdir?: boolean;
  readOnly?: boolean;
  writeMap?: boolean;
  noTLS?: boolean;
  noLock?: boolean;
  noReadAhead?: boolean;
  mapSize?: number;
  maxReaders?: number;
  maxDBs?: number;
}

export interface EnvFlags {
  flags?: number /** bitmask of flags */;
  noMetaSync?: boolean;
  noSync?: boolean;
  mapAsync?: boolean;
  noMemInit?: boolean;
}

export interface Env {
  readonly pEnv: bigint;
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

  serialize(): Buffer; // for passing to worker threads.
}

export interface Txn {
  readonly pTxn: bigint;
  env(): Env;
  id(): number;
  commit(): void;
  abort(): void;
  reset(): void;
  renew(): void;
  openDB(name: string | null, flags?: DbFlags): Database;
}

export interface DbFlags {
  flags?: number /** bitmask */;
  create?: boolean;
  reverseKey?: boolean;
  integerKey?: boolean;
}

export interface PutFlags {
  flags?: number /** bitmask */;
  reserve?: boolean;
  append?: boolean;
}

export type Key = string | number | Buffer;
export type Value = Key | boolean;

export type KeyType = "string" | "number" | "binary";
export type ValueType = "string" | "number" | "binary" | "boolean";

export interface Database<K extends Key = string> {
  readonly dbi: number;
  stat(txn: Txn): DbStat;
  flags(txn: Txn): DbFlags;
  close(env: Env): void;
  drop(txn?: Txn, del?: boolean): void;
  get(key: K, txn?: Txn): Buffer;
  getString(key: K, txn?: Txn): string;
  getNumber(key: K, txn?: Txn): number;
  getBoolean(key: K, txn?: Txn): boolean;
  put(key: K, value: Value, txn: Txn, flags?: PutFlags): void;
  putAsync(key: K, value: Value, flags?: PutFlags): Promise<void>;
  add(key: K, value: Value, txn: Txn, flags?: PutFlags): Buffer | null;
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

export function key(k: Key): Buffer {
  throw new Error();
}
export function value(v: Value): Buffer {
  throw new Error();
}
export function asString(buf: Buffer): string {
  throw new Error();
}
export function asNumber(buf: Buffer): number {
  throw new Error();
}
export function asBoolean(buf: Buffer): boolean {
  throw new Error();
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

export interface DupEntry<K extends Key = string, V extends Key = string> {
  keyBuf: Buffer;
  key(): K;
  valueBuf: Buffer;
  value(): V;
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
}

export interface DupFlags extends DbFlags {
  dupFixed?: boolean;
  integerDup?: boolean;
  reverseDup?: boolean;
}

export interface DupPutFlags extends PutFlags {
  noDupData?: boolean;
  appendDup?: boolean;
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
