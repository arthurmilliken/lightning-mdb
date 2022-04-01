/// <reference types="node" />
import { Transaction } from "./transaction";
import { Cursor, CursorOptions, Key, KeyType, Value } from "./types";
import { Buffer } from "buffer";
interface SerializedDB {
    envp: bigint;
    dbi: number;
    keyType: KeyType;
}
export interface DbOptions {
    /** create DB if not already existing */
    create?: boolean;
    /** use reverse string keys (compare final byte first) */
    reverseKey?: boolean;
    keyType?: KeyType;
}
export interface DbStat {
    pageSize: number /** Size of a database page.
    This is currently the same for all databases. */;
    depth: number /** Depth (height) of the B-tree */;
    branchPages: number /** Number of internal (non-leaf) pages */;
    leafPages: number /** Number of leaf pages */;
    overflowPages: number /** Number of overflow pages */;
    entries: number /** Number of data items */;
}
export interface PutFlags {
    /** Don't write if the key already exists. */
    noOverwrite?: boolean;
    /** Just reserve space for data, don't copy it. Return a
     * Buffer pointing to the reserved space, which the caller can fill in before
     * the transaction is committed. */
    reserve?: boolean;
    /** Data is being appended, don't split full pages. */
    append?: boolean;
    /** for noOverwrite = true, return zero-copy Buffer of value if key already exists
     * this value is ignored if reserve = true (Buffer will always be zero-copy).
     * Zero-copy Buffers MUST be detached using detachBuffer() before the next write
     * operation or end of transaction. */
    zeroCopy?: boolean;
}
export declare class Database<K extends Key = string> {
    /**
     * Use this method to create a Database for use in a Worker Thread
     * @param serialized created by Database.serialize()
     * @returns Database
     */
    static deserialize(serialized: SerializedDB): Database;
    envp: bigint;
    dbi: number;
    protected _isOpen: boolean;
    protected _keyType: KeyType;
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
    serialize(): SerializedDB;
    get isOpen(): boolean;
    get keyType(): KeyType;
    protected useTransaction<T>(callback: (useTxn: Transaction) => T, txn?: Transaction): T;
    protected assertOpen(): void;
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
     *        operation involving the same key.
     * @returns Buffer of data item, or null if key not found
     */
    get(key: K, txn?: Transaction, zeroCopy?: boolean): Buffer | null;
    getString(key: K, txn?: Transaction): string | null;
    getNumber(key: K, txn?: Transaction): number | null;
    getBoolean(key: K, txn?: Transaction): boolean | null;
    /**
     * Store item into database.
     *
     * This function stores key/data pairs in the database. The default behavior
     * is to enter the new key/data pair, replacing any previously existing key.
     * @param key the key to store in the database
     * @param value the value to store. If flags.reserve == true, this should be the
     *              number of bytes to reserve.
     * @param txn an open writable transaction
     * @param flags see @type {PutFlags} for details.
     * @returns null if successful
     *          a buffer containing the existing value if flags.noOverwrite == true
     *            and the key already exists
     *          an allocated buffer of length `value` if flags.reserve == true
     */
    put(key: K, value: Value | number, txn: Transaction, flags?: PutFlags): Buffer | null;
    putAsync(key: K, value: Value, flags?: PutFlags): Promise<Buffer | null>;
    del(key: K, txn: Transaction): void;
    delAsync(key: K): Promise<void>;
    cursor(options: CursorOptions<K>, txn?: Transaction): Cursor<K>;
    /**
     * Compare two data items according to a particular database.
     *
     * This returns a comparison as if the two data items were keys in the
     * specified database.
     * @param a the first item to compare
     * @param b the second item to compare
     * @param txn
     * @returns < 0 if a < b, 0 if a == b, > 0 if a > b
     */
    compare(a: K, b: K, txn?: Transaction): number;
    protected encodeKey(key: Key): Buffer;
    protected encodeValue(value: Value): Buffer;
}
export declare function calcDbFlags(flags: DbOptions): number;
export declare function calcPutFlags(flags: PutFlags): number;
export declare function detachBuffer(buf: Buffer): void;
export declare function assertU64(num: number): void;
export declare function bufWriteBoolean(buf: Buffer, val: boolean, offset?: number): void;
export declare function bufReadBoolean(buf: Buffer, offset?: number): boolean;
export {};
