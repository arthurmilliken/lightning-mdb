/// <reference types="node" />
import { Cursor } from "./cursor";
import { Database, DbOptions } from "./database";
import { Transaction } from "./transaction";
export declare type Key = string | number | Buffer;
export declare type Value = Key | boolean;
export declare type KeyType = "string" | "number" | "Buffer";
export declare type ValueType = "string" | "number" | "boolean" | "Buffer";
export interface CursorOptions<K extends Key = string> {
    start?: K;
    end?: K;
    reverse?: boolean;
    limit?: boolean;
    offset?: boolean;
    zeroCopy?: boolean;
    keyType?: KeyType;
}
export interface ICursorItem<K extends Key = string> {
    readonly cursor: Cursor<K>;
    key(): K | null;
    value(): Buffer | null;
    valueString(): string | null;
    valueNumber(): number | null;
    valueBoolean(): boolean | null;
    detach(): void;
}
export interface ICursor<K extends Key = string> {
    readonly cursorp: bigint;
    readonly txnp: bigint;
    readonly dbi: number;
    readonly options: CursorOptions<K>;
    key(): K | null;
    value(): Buffer | null;
    valueString(): string | null;
    valueNumber(): number | null;
    valueBoolean(): boolean | null;
    detach(): void;
    close(): void;
    renew(txn: Transaction): void;
    put(key: Buffer, value: Buffer, flags: CursorPutFlags): void;
    del(noDupData?: boolean): void;
    first(): ICursorItem<K> | null;
    current(): ICursorItem<K> | null;
    last(): ICursorItem<K> | null;
    next(steps?: number): ICursorItem<K> | null;
    prev(steps?: number): ICursorItem<K> | null;
    find(key: K): ICursorItem<K> | null;
    findEntry(key: K): ICursorItem<K> | null;
    findNext(key: K): ICursorItem<K> | null;
    iterator(): Generator<ICursorItem<K>, void, K>;
}
export interface PutFlags {
    /** append the given key/data pair to the end of the database.
     * This option allows fast bulk loading when keys are already known to
     * be in the correct order. Loading unsorted keys with this flag will
     * throw an error. */
    append?: boolean;
}
export interface CursorPutFlags extends PutFlags {
    current?: boolean;
    multiple?: boolean;
}
export interface DupFlags extends DbOptions {
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
export interface DbDupsort<K extends Key = string, V extends Key = string> extends Database<K> {
    getFlags(txn?: Transaction): DupFlags;
    put(key: K, value: V, txn: Transaction, flags?: DupPutFlags): Buffer | null;
    putAsync(key: K, value: V, flags?: DupPutFlags): Promise<Buffer | null>;
    delDup(key: K, value: V, txn: Transaction): void;
    delDupAsync(key: K, value: V): Promise<void>;
    compareData(a: V, b: V): number;
}
export interface CursorDupsort<K extends Key = string, V extends Key = string> extends ICursor<K> {
    firstDup(): ICursorItem<K> | null;
    findDup(key: K, value: V): ICursorItem<K> | null;
    findNextDup(key: K, value: V): ICursorItem<K> | null;
    currentPage(): ICursorItem<K>[] | null;
    lastDup(): ICursorItem<K> | null;
    nextDup(): ICursorItem<K> | null;
    nextPage(): ICursorItem<K>[] | null;
    nextKey(): ICursorItem<K> | null;
    prevDup(): ICursorItem<K> | null;
    prevKey(): ICursorItem<K> | null;
    prevPage(): ICursorItem<K>[] | null;
}
export interface DupCursorOptions<K extends Key = string, V extends Key = string> extends CursorOptions<K> {
    noDups?: boolean /** iterate unique keys only */;
    startValue?: V;
    endValue?: V;
    paginated?: boolean /** fetch one "page" at a time */;
}
