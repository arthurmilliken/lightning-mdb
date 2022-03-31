/// <reference types="node" />
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
export declare enum EnvFlag {
    FIXEDMAP = 1,
    NOSUBDIR = 16384,
    NOSYNC = 65536,
    RDONLY = 131072,
    NOMETASYNC = 262144,
    WRITEMAP = 524288,
    MAPASYNC = 1048576,
    NOTLS = 2097152,
    NOLOCK = 4194304,
    NORDAHEAD = 8388608,
    NOMEMINIT = 16777216
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
    getDeadReaders(): number;
    openDB(name: string | null, flags?: DbFlags | null, txn?: Txn): Database;
}
export interface Txn {
    readonly txnp: bigint;
    commit(): void;
    abort(): void;
    reset(): void;
    renew(): void;
    openDB(name: string | null, flags?: DbFlags): Database;
}
export declare enum DbFlag {
    REVERSEKEY = 2,
    /** use sorted duplicates */
    DUPSORT = 4,
    INTEGERKEY = 8,
    DUPFIXED = 16,
    INTEGERDUP = 32,
    REVERSEDUP = 64,
    CREATE = 262144
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
export declare enum PutFlag {
    NOOVERWRITE = 16,
    NODUPDATA = 32,
    /** For mdb_cursor_put: overwrite the current key/data pair */
    CURRENT = 64,
    RESERVE = 65536,
    APPEND = 131072,
    APPENDDUP = 262144,
    MULTIPLE = 524288
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
export declare type Key = string | number | Buffer;
export declare type Value = Key | boolean;
export declare type KeyType = "string" | "number" | "Buffer";
export declare type ValueType = "string" | "number" | "Buffer" | "boolean";
export interface Database<K extends Key = string> {
    readonly envp: bigint;
    readonly dbi: number;
    stat(txn?: Txn): DbStat;
    flags(txn?: Txn): DbFlags;
    close(env: Env): void;
    drop(txn?: Txn, del?: boolean): void;
    get(key: K, txn?: Txn, zeroCopy?: boolean): Buffer;
    getString(key: K, txn?: Txn): string;
    getNumber(key: K, txn?: Txn): number;
    getBoolean(key: K, txn?: Txn): boolean;
    put(key: K, value: Value, txn: Txn, flags?: PutFlags): void;
    putAsync(key: K, value: Value, flags?: PutFlags): Promise<void>;
    add(key: K, value: Value, txn: Txn, flags?: PutFlags, zeroCopy?: boolean): Buffer | null;
    addAsync(key: K, value: Value, flags?: PutFlags): Promise<Buffer | null>;
    del(key: K, txn: Txn): void;
    delAsync(key: K): Promise<void>;
    cursor(options: CursorOptions<K>, txn?: Txn): Cursor<K>;
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
export interface DbDupsort<K extends Key = string, V extends Key = string> extends Database<K> {
    getFlags(txn?: Txn): DupFlags;
    put(key: K, value: V, txn: Txn, flags: DupPutFlags): void;
    put(key: K, value: V, txn: Txn, flags?: DupPutFlags): void;
    putAsync(key: K, value: V, flags?: DupPutFlags): Promise<void>;
    add(key: K, value: V, txn: Txn, flags?: DupPutFlags, zeroCopy?: boolean): Buffer | null;
    addAsync(key: K, value: V, flags?: DupPutFlags): Promise<Buffer | null>;
    delDup(key: K, value: V, txn: Txn): void;
    delDupAsync(key: K, value: V): Promise<void>;
    compareData(a: V, b: V): number;
}
export interface CursorDupsort<K extends Key = string, V extends Key = string> extends Cursor<K> {
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
export interface DupCursorOptions<K extends Key = string, V extends Key = string> extends CursorOptions<K> {
    noDups?: boolean /** iterate unique keys only */;
    startValue?: V;
    endValue?: V;
    paginated?: boolean /** fetch one "page" at a time */;
}
export declare enum CursorOp {
    First = 0,
    FirstDup = 1,
    GetBoth = 2,
    GetBothRange = 3,
    GetCurrent = 4,
    GetMultiple = 5,
    Last = 6,
    LastDup = 7,
    Next = 8,
    NextDup = 9,
    NextMultiple = 10,
    NextNoDup = 11,
    Prev = 12,
    PrevDup = 13,
    PrevNoDup = 14,
    Set = 15,
    SetKey = 16,
    SetRange = 17,
    PrevMultiple = 18
}
