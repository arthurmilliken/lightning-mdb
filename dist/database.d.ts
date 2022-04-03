/// <reference types="node" />
import { AddMode } from "./constants";
import { Transaction } from "./transaction";
import { Key, KeyType, Value, PutFlags, DbOptions, DbStat } from "./types";
import { Buffer } from "buffer";
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
     * @returns Buffer of data item, or null if key not found
     */
    get(key: K, txn?: Transaction, zeroCopy?: boolean): Buffer | null;
    /**
     * Retrieve item as string
     * @param key
     * @param txn
     * @returns null if not found
     */
    getString(key: K, txn?: Transaction): string | null;
    /**
     * Retrieve item as number
     * @param key
     * @param txn
     * @returns null if not found
     */
    getNumber(key: K, txn?: Transaction): number | null;
    /**
     * Retrieve item as boolean
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
     * Add item into database if the key does not already exist.
     * @param key the key to store
     * @param value the value to store
     * @param txn an open writable transaction
     * @param {AddMode} mode (default RETURN_BOOLEAN)
     *        RETURN_BOOLEAN - return true if successful, false if key already exists.
     *        RETURN_CURRENT - return true if successful, otherwise return current
     *          value as Buffer.
     *        RETURN_ZEROCOPY - as RETURN_CURRENT, but returned Buffer is created
     *          using zero-copy semantics. This buffer must be detached by calling
     *          detachBuffer() before the end of the transaction, and before
     *          attempting any other operation involving the same key. This also
     *          applies to code being run in other threads. Use with caution.
     * @returns boolean or Buffer. see `mode` param for details */
    add(key: K, value: Value, txn: Transaction, mode?: AddMode): boolean | Buffer;
    addAsync(key: K, value: Value, mode: Exclude<AddMode, AddMode.RETURN_ZEROCOPY>): boolean | Buffer;
    /**
     * Reserve space inside the database at the current key, and return a Buffer
     * which the caller can fill in before the transaction ends.
     * @param key the key to store
     * @param size the size in Bytes to allocate for the Buffer
     * @param txn an open writable transaction
     * @param flags
     * @returns an empty buffer of `size` bytes, or false if
     *          `flags.noOverwrite == true` and key already exists.
     */
    reserve(key: K, size: number, txn: Transaction, flags?: PutFlags & {
        noOverwrite?: boolean;
    }): Buffer | false;
    /**
     * Removes key/data pair from the database.
     * @param key the key to delete
     * @param txn an open writeable transaction
     * @returns true if successful, false if the key does not exist.
     */
    del(key: K, txn: Transaction): boolean;
    delAsync(key: K): Promise<void>;
    /** Return a comparison as if the two items were keys in this database.
     * @param a the first item to compare
     * @param b the second item to compare
     * @param txn an optional transaction context
     * @returns < 0 if a < b, 0 if a == b, > 0 if a > b
     */
    compare(a: K, b: K, txn?: Transaction): number;
    /** Helper function for handling optional transaction argument */
    protected useTransaction<T>(callback: (useTxn: Transaction) => T, txn: Transaction | undefined): T;
    protected assertOpen(): void;
    protected encodeKey(key: Key): Buffer;
    protected encodeValue(value: Value): Buffer;
}
export declare function calcDbFlags(flags: DbOptions): number;
export declare function detachBuffer(buf: Buffer): void;
export declare function assertU64(num: number): void;
export declare function bufWriteBoolean(buf: Buffer, val: boolean, offset?: number): void;
export declare function bufReadBoolean(buf: Buffer, offset?: number): boolean;
interface SerializedDB {
    envp: bigint;
    dbi: number;
    keyType: KeyType;
}
export {};
