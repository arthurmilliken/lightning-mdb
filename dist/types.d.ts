/// <reference types="node" />
import { Database, DbOptions, PutFlags } from "./database";
import { Transaction } from "./transaction";
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
export declare type u64 = number;
export declare type Key = string | u64 | Buffer;
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
}
export interface CursorEntry<K extends Key = string> {
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
    first(): CursorEntry<K> | null;
    current(): CursorEntry<K> | null;
    last(): CursorEntry<K> | null;
    next(): CursorEntry<K> | null;
    prev(): CursorEntry<K> | null;
    find(key: K): CursorEntry<K> | null;
    findEntry(key: K): CursorEntry<K> | null;
    findNext(key: K): CursorEntry<K> | null;
    iterator(): Generator<CursorEntry<K>, void, K>;
}
export interface CursorPutFlags extends PutFlags {
    current?: boolean;
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
export interface CursorDupsort<K extends Key = string, V extends Key = string> extends Cursor<K> {
    firstDup(): CursorEntry<K> | null;
    findDup(key: K, value: V): CursorEntry<K> | null;
    findNextDup(key: K, value: V): CursorEntry<K> | null;
    currentPage(): CursorEntry<K>[] | null;
    lastDup(): CursorEntry<K> | null;
    nextDup(): CursorEntry<K> | null;
    nextPage(): CursorEntry<K>[] | null;
    nextKey(): CursorEntry<K> | null;
    prevDup(): CursorEntry<K> | null;
    prevKey(): CursorEntry<K> | null;
    prevPage(): CursorEntry<K>[] | null;
}
export interface DupCursorOptions<K extends Key = string, V extends Key = string> extends CursorOptions<K> {
    noDups?: boolean /** iterate unique keys only */;
    startValue?: V;
    endValue?: V;
    paginated?: boolean /** fetch one "page" at a time */;
}
