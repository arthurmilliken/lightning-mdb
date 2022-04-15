/// <reference types="node" />
import { Cursor } from "./cursor";
import { Database } from "./database";
import { Transaction } from "./transaction";
export declare type Key = string | number | Buffer;
export declare type Value = Key | boolean;
export declare type KeyType = "string" | "number" | "Buffer";
export declare type ValueType = "string" | "number" | "boolean" | "Buffer";
export interface Version {
    version: string;
    major: number;
    minor: number;
    patch: number;
}
export interface EnvInfo {
    mapAddr: bigint /** Address of map, if fixed (experimental) */;
    mapSize: number /** Size of the data memory map */;
    lastPage: number /** ID of the last used page */;
    lastTxn: number /** ID of the last committed transaction */;
    maxReaders: number /** max reader slots in the environment */;
    numReaders: number /** max reader slots used in the environment */;
}
export interface EnvOptions extends EnvFlags {
    /** mmap at a fixed address (experimental). @see lmdb.h for details */
    fixedMap?: boolean;
    /** treat `name` as a filename rather than a directory. @see lmdb.h for details */
    noSubdir?: boolean;
    /** read only. @see lmdb.h for details */
    readOnly?: boolean;
    /** use writable mmap. @see lmdb.h for details */
    writeMap?: boolean;
    /** tie reader locktable slots to #MDB_txn objects instead of to threads. @see lmdb.h for details */
    noTLS?: boolean;
    /** don't do any locking, caller must manage their own locks. @see lmdb.h for details */
    noLock?: boolean;
    /** don't do readahead (no effect on Windows). @see lmdb.h for details */
    noReadAhead?: boolean;
    /** size (in bytes) of memory map. @see lmdb.h for details */
    mapSize?: number;
    /** max number of readers. @see lmdb.h for details */
    maxReaders?: number;
    /** max number of dbs. @see lmdb.h for details */
    maxDBs?: number;
}
export interface EnvFlags {
    /** don't fsync metapage after commit. @see lmdb.h for details */
    noMetaSync?: boolean;
    /** don't fsync after commit. @see lmdb.h for details */
    noSync?: boolean;
    /** use asynchronous msync when #MDB_WRITEMAP is used. @see lmdb.h for details */
    mapAsync?: boolean;
    /** don't initialize malloc'd memory before writing to datafile. @see lmdb.h for details */
    noMemInit?: boolean;
}
export interface DbOptions {
    /** create DB if not already existing */
    create?: boolean;
    /** if true, keys are strings to be compared in reverse order, from the end
     * of the strings to the beginning. */
    reverseKey?: boolean;
    /** database keys must be of this type (default: "string") */
    keyType?: KeyType;
}
export interface DbStat {
    pageSize: number /** Size of a database page. This is the same for all databases. */;
    depth: number /** Depth (height) of the B-tree */;
    branchPages: number /** Number of internal (non-leaf) pages */;
    leafPages: number /** Number of leaf pages */;
    overflowPages: number /** Number of overflow pages */;
    entries: number /** Number of data items */;
}
export interface CursorItem<K extends Key = string, V extends Value = string> {
    key?: K;
    value?: V;
}
export declare type DbItem<K extends Key = string, V extends Value = string> = Required<CursorItem<K, V>>;
export interface Query<K extends Key = string> {
    start?: K;
    end?: K;
    reverse?: boolean;
    limit?: number;
    offset?: number;
}
export interface IEntry<K extends Key = string> {
    readonly cursor: Cursor<K>;
    key(): K | null;
    value(): Buffer | null;
    valueString(): string | null;
    valueNumber(): number | null;
    valueBoolean(): boolean | null;
    detach(): void;
}
export interface PutFlags {
    /** append the given key/data pair to the end of the database.
     * This option allows fast bulk loading when keys are already known to
     * be in the correct order. Loading unsorted keys with this flag will
     * throw MDB_KEYEXIST. */
    append?: boolean;
    /** enter the new key/data pair only if the key does not already appear
     * in the database. The function will throw if the key already appears
     * in the database */
    noOverwrite?: boolean;
}
export interface CursorFlags extends PutFlags {
    current?: boolean;
}
export interface MultimapOptions extends DbOptions {
    /** sorted dup items have fixed size */
    dupFixed?: boolean;
    /** use reverse string dups */
    reverseDup?: boolean;
    valueType?: KeyType;
}
export interface MultimapPutFlags extends PutFlags {
    /** Throw MDB_KEYEXIST if the key and data pair already exists. */
    noDupData?: boolean;
    /** Duplicate data is being appended, don't split full pages. */
    appendDup?: boolean;
}
export interface MultimapCursorFlags extends MultimapPutFlags, CursorFlags {
}
export interface IMultimap<K extends Key = string, V extends Key = string> extends Database<K> {
    getOptions(txn?: Transaction): MultimapOptions;
    put(key: K, value: V, txn: Transaction, flags?: MultimapPutFlags): Buffer | null;
    putAsync(key: K, value: V, flags?: MultimapPutFlags): Promise<void>;
    delDup(key: K, value: V, txn: Transaction): void;
    delDupAsync(key: K, value: V): Promise<void>;
    compareValues(a: V, b: V): number;
}
export interface IMultimapCursor<K extends Key = string, V extends Key = string> extends Cursor<K> {
    firstDup(): boolean;
    findDup(key: K, value: V): boolean;
    findNextDup(key: K, value: V): boolean;
    currentPage(): boolean;
    lastDup(): boolean;
    nextDup(): boolean;
    nextPage(): boolean;
    nextKey(): boolean;
    prevDup(): boolean;
    prevKey(): boolean;
    prevPage(): boolean;
}
export interface MultimapQuery<K extends Key = string, V extends Key = string> extends Query<K> {
    noDups?: boolean /** iterate unique keys only */;
    startValue?: V;
    endValue?: V;
    paginated?: boolean /** fetch one "page" at a time */;
}
