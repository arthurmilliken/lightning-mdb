/// <reference types="node" />
import { Transaction } from "./transaction";
import { Key, KeyType, Value, PutFlags, DbOptions, DbStat, Query, DbItem } from "./types";
import { Buffer } from "buffer";
import { Cursor } from "./cursor";
export declare class Database<K extends Key = string> {
    /**
     * Use this method to create a Database for use in a Worker Thread
     * @param serialized created by Database.serialize()
     * @returns Database
     */
    static deserialize(serialized: SerializedDB): Database;
    protected _isOpen: boolean;
    protected _keyType: KeyType;
    _envp: bigint;
    _dbi: number;
    /**
     * Opens a Database in the given environment
     * @param envp
     * @param name
     * @param options
     * @param txn
     */
    constructor(envp: bigint, name: string | null, txn: Transaction, options?: DbOptions);
    /**
     * Creates a Database from a serialized representation
     * @param serialized
     */
    constructor(serialized: SerializedDB);
    get envp(): bigint;
    get dbi(): number;
    get isOpen(): boolean;
    /** Data type for stored keys */
    get keyType(): KeyType;
    /** Create serialization token for use with Worker Thread */
    serialize(): SerializedDB;
    stat(txn?: Transaction): DbStat;
    flags(txn?: Transaction): DbOptions;
    close(): void;
    drop(txn: Transaction, del?: boolean): void;
    clear(txn: Transaction): void;
    dropAsync(del?: boolean): void;
    /**
     * Get item from database.
     * @param key
     * @param txn
     * @param zeroCopy if true, returned Buffer is created using zero-copy
     *        semantics. This buffer must be detached by calling detachBuffer()
     *        before the end of the transaction, and before attempting any other
     *        operation involving the same key. This also applies to code being
     *        run in other threads. Use with caution.
     * @returns Buffer of data item
     */
    get(key: K, txn?: Transaction, zeroCopy?: boolean): Buffer;
    /** Retrieve item as string */
    getString(key: K, txn?: Transaction): string;
    /**
     * Retrieve item as number
     * @param key
     * @param txn
     * @returns null if not found
     */
    getNumber(key: K, txn?: Transaction): number;
    /**
     * Retrieve value as boolean
     * @param key
     * @param txn
     * @returns null if not found
     */
    getBoolean(key: K, txn?: Transaction): boolean | null;
    /**
     * Store item into database
     * @param key the key to store
     * @param value the value to store
     * @param txn an open writable transaction
     * @param {PutFlags} flags */
    put(key: K, value: Value, txn: Transaction, flags?: PutFlags): void;
    putAsync(key: K, value: Value): Promise<Buffer | null>;
    /**
     * Reserve space inside the database at the current key, and return a Buffer
     * which the caller can fill in before the transaction ends.
     * @param key the key to store
     * @param size the size in Bytes to allocate for the Buffer
     * @param txn an open writable transaction
     * @param flags
     * @returns an empty buffer of `size` bytes, to be filled in before the
     *          transaction ends.
     */
    reserve(key: K, size: number, txn: Transaction, flags?: PutFlags): Buffer;
    /**
     * Removes key/data pair from the database.
     * @param key the key to delete
     * @param txn an open writeable transaction
     */
    del(key: K, txn: Transaction): void;
    delAsync(key: K): Promise<void>;
    /** Return a comparison as if the two items were keys in this database.
     * @param a the first item to compare
     * @param b the second item to compare
     * @param txn an optional transaction context
     * @returns < 0 if a < b, 0 if a == b, > 0 if a > b
     */
    compare(a: K, b: K, txn?: Transaction): number;
    compareBuffer(a: Buffer, b: Buffer, txn?: Transaction): number;
    encodeKey(key: Key): Buffer;
    decodeKey(keyBuf: Buffer): K;
    encodeValue(value: Value): Buffer;
    /** @returns a cursor for this database, which the caller can use to navigate keys */
    cursor(txn?: Transaction): Cursor<K>;
    /** @returns an iterator over items (each item as DbItem<K, Buffer>) */
    getItems(q?: Query<K> & {
        zeroCopy?: boolean;
    }, txn?: Transaction, includeKey?: boolean, includeValue?: boolean): IterableIterator<DbItem<K, Buffer>>;
    /** @returns an iterator over keys */
    getKeys(q?: Query<K>, txn?: Transaction): IterableIterator<K>;
    /** @returns an iterator over values (each value as Buffer) */
    getValues(q?: Query<K> & {
        zeroCopy?: boolean;
    }, txn?: Transaction): IterableIterator<Buffer>;
    /** @returns an iterator over values (each value as string) */
    getStrings(q?: Query<K>, txn?: Transaction): IterableIterator<string>;
    /** @returns an iterator over values (each value as number) */
    getNumbers(q?: Query<K>, txn?: Transaction): IterableIterator<number>;
    /** @returns an iterator over values (each value as boolean) */
    getBooleans(q?: Query<K>, txn?: Transaction): IterableIterator<boolean>;
    /** @returns an iterator over items (each item as DbItem<K, string>) */
    getStringItems(q?: Query<K>, txn?: Transaction): IterableIterator<DbItem<K, string>>;
    /** @returns an iterator over items (each item as DbItem<K, number>) */
    getNumberItems(q?: Query<K>, txn?: Transaction): IterableIterator<DbItem<K, number>>;
    /** @returns an iterator over items (each item as DbItem<K, boolean>) */
    getBooleanItems(q?: Query<K>, txn?: Transaction): IterableIterator<DbItem<K, boolean>>;
    /** @returns a count of items matching the given query */
    getCount(q?: Omit<Query<K>, "reverse">, txn?: Transaction): number;
    /** Helper function for handling optional transaction argument */
    protected useTransaction<T>(callback: (useTxn: Transaction) => T, txn: Transaction | undefined): T;
    protected assertOpen(): void;
}
export declare function calcDbFlags(flags: DbOptions): number;
export declare function detachBuffer(buf: Buffer): void;
export declare function assertUSafe(num: number): void;
export declare function bufWriteBoolean(buf: Buffer, val: boolean, offset?: number): void;
export declare function bufReadBoolean(buf: Buffer, offset?: number): boolean;
interface SerializedDB {
    envp: bigint;
    dbi: number;
    keyType: KeyType;
}
export {};
