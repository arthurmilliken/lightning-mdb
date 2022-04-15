/// <reference types="node" />
import { Database } from "./database";
import { Transaction } from "./transaction";
import { CursorItem, CursorFlags, DbItem, Key, Query, Value } from "./types";
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
    put(key: K, value: Value, flags?: CursorFlags): void;
    /** Reserve `size` bytes at `key`, move cursor to position of `key`, and
     * return an initialized Buffer which the caller can fill in before the
     * end of the transaction */
    reserve(key: K, size: number, flags?: CursorFlags): Buffer;
    /** Remove database entry (key + value) at current cursor position */
    del(): void;
    /** @returns current key as Buffer */
    keyBuffer(): Buffer;
    /** @returns current key */
    key(): K;
    /** @returns current value as Buffer */
    value(zeroCopy?: boolean): Buffer;
    /** @returns current value as string */
    asString(): string;
    /** @returns current value as number */
    asNumber(): number;
    /** @returns current value as boolean */
    asBoolean(): boolean;
    /** @returns current key (as Buffer) and value (as Buffer) */
    rawItem(includeKey?: boolean, includeValue?: boolean, zeroCopy?: boolean): CursorItem<Buffer, Buffer>;
    /** @returns {CursorItem<K, Buffer>} at current cursor position */
    item(includeValue?: boolean, zeroCopy?: boolean): CursorItem<K, Buffer>;
    /** @returns {DbItem<K, string>} at current cursor position */
    stringItem(): DbItem<K, string>;
    /** @returns {DbItem<K, number>} at current cursor position */
    numberItem(): DbItem<K, number>;
    /** @returns {DbItem<K, boolean>} at current cursor position */
    booleanItem(): DbItem<K, boolean>;
    /** Move the cursor to the first key in database
     * @returns false if no key found, true otherwise */
    first(): boolean;
    /** Move the cursor to the previous key
     * @param skip number of keys to skip
     * @returns false if no key found, true otherwise */
    prev(skip?: number): boolean;
    /** Move the cursor to the next key
     * @param skip number of keys to skip
     * @returns false if no key found, true otherwise */
    next(skip?: number): boolean;
    /** Move the cursor to the last key in database
     * @returns false if no key found, true otherwise */
    last(): boolean;
    /** Move the cursor to given key. If key does not exist, this function
     * will move the cursor to the next adjacent key and return false.
     * @returns true if key exists, false otherwise */
    find(key: K): boolean;
    /** Move the cursor to given key or next adjacent key
     * @returns false if no key found, true otherwise */
    findNext(key: K): boolean;
    protected assertOpen(): void;
    /** Close this cursor. This must be called on all read-only cursors. */
    close(): void;
    /** Re-use a closed cursor with the given transaction. */
    renew(txn: Transaction): void;
    /** @returns an iterator over items (each item as CursorItem<K, Buffer>) */
    getCursorItems(q?: Query<K> & {
        zeroCopy?: boolean;
    }, includeKey?: boolean, includeValue?: boolean): IterableIterator<CursorItem<K, Buffer>>;
    /** @returns an iterator over items (each item as DbItem<K, Buffer>) */
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
    /** @returns a count of items matching the given query, or all items if
     * no query given */
    getCount(q?: Omit<Query<K>, "reverse">): number;
}
