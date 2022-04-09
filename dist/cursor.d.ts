/// <reference types="node" />
import { Database } from "./database";
import { Transaction } from "./transaction";
import { CursorItem, CursorPutFlags, DbItem, Key, Query, Value } from "./types";
export declare class Cursor<K extends Key = string> implements Cursor<K> {
    private _cursorp;
    get cursorp(): bigint;
    private txn;
    private db;
    protected _isOpen: boolean;
    get isOpen(): boolean;
    protected ownsTxn: boolean;
    constructor(db: Database<K>, txn?: Transaction);
    /** Store `value` at `key`, and move the cursor to the position of the
     * inserted record */
    put(key: K, value: Value, flags?: CursorPutFlags): void;
    /** Reserve space at `key`, move cursor to position of `key`, and return
     * an initialized Buffer which the caller can fill in before the end of
     * the transaction */
    reserve(key: K, size: number, flags?: CursorPutFlags): Buffer;
    /** Remove database entry (key + value) at current cursor position */
    del(): void;
    keyBuffer(): Buffer;
    key(): K;
    value(zeroCopy?: boolean): Buffer;
    /** @returns current value as string */
    asString(): string;
    /** @returns current value as number */
    asNumber(): number;
    /** @returns current value as boolean */
    asBoolean(): boolean;
    /** @returns current key (as Buffer) and value (as Buffer) */
    rawItem(includeKey?: boolean, includeValue?: boolean, zeroCopy?: boolean): CursorItem<Buffer, Buffer>;
    item(includeValue?: boolean, zeroCopy?: boolean): {
        key: K | undefined;
        value: Buffer | undefined;
    };
    stringItem(): CursorItem<K, string>;
    numberItem(): CursorItem<K, number>;
    booleanItem(): CursorItem<K, boolean>;
    first(): boolean;
    prev(skip?: number): boolean;
    next(skip?: number): boolean;
    last(): boolean;
    find(key: K): boolean;
    findNext(key: K): boolean;
    protected assertOpen(): void;
    close(): void;
    renew(txn: Transaction): void;
    /** @returns an iterator over items (each item as DbItem<K, Buffer>) */
    getCursorItems(q?: Query<K> & {
        zeroCopy?: boolean;
    }, includeKey?: boolean, includeValue?: boolean): IterableIterator<CursorItem<K, Buffer>>;
    /** @returns an iterator over keys */
    getItems(q?: Query<K>): IterableIterator<DbItem<K, Buffer>>;
    /** @returns an iterator over keys */
    getKeys(q?: Query<K>): IterableIterator<K>;
    /** @returns an iterator over values (each value as Buffer) */
    getValues(q?: Query<K> & {
        zeroCopy?: boolean;
    }): IterableIterator<Buffer>;
    /** @returns an iterator over values (each value as string) */
    getStrings(q?: Query<K>): IterableIterator<string>;
    /** @returns an iterator over values (each value as number) */
    getNumbers(q?: Query<K>): IterableIterator<number>;
    /** @returns an iterator over values (each value as boolean) */
    getBooleans(q?: Query<K>): IterableIterator<boolean>;
    /** @returns an iterator over items (each item as DbItem<K, string>) */
    getStringItems(q?: Query<K>): IterableIterator<DbItem<K, string>>;
    /** @returns an iterator over items (each item as DbItem<K, number>) */
    getNumberItems(q?: Query<K>): IterableIterator<DbItem<K, number>>;
    /** @returns an iterator over items (each item as DbItem<K, boolean>) */
    getBooleanItems(q?: Query<K>): IterableIterator<DbItem<K, boolean>>;
    /** @returns a count of items matching the given query */
    getCount(q?: Omit<Query<K>, "reverse">): number;
}
