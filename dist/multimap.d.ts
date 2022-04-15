/// <reference types="node" />
import { Database } from "./database";
import { Transaction } from "./transaction";
import { Key, KeyType, MultimapOptions, MultimapPutFlags } from "./types";
interface SerializedMultimap {
    envp: bigint;
    dbi: number;
    keyType: KeyType;
    valueType: KeyType;
}
/**
 * Multimap represents a "duplicate key, sorted value" database, which allows
 * multiple values to be stored under the same key.
 * (Also known as a "dupsort" database) */
export declare class Multimap<K extends Key = string, V extends Key = string> extends Database<K> {
    /** Create a Multimap from a serialized representation
     * @param serialized created by Multimap.serialize()
     * @returns Multimap<K, V> */
    static deserialize<K extends Key = string, V extends Key = string>(serialized: SerializedMultimap): Multimap<K, V>;
    protected _valueType: KeyType;
    /** Data type for stored values */
    get valueType(): KeyType;
    /**
     * Open a Multimap database in the given environment
     * @param envp address of Environment pointer
     * @param name name of Multimap
     * @param txn an open writable transaction
     * @param options
     */
    constructor(envp: bigint, name: string, txn: Transaction, options?: MultimapOptions);
    /**
     * Create a Multimap from a serialized representation
     * @param serialized
     */
    constructor(serialized: SerializedMultimap);
    getOptions(txn?: Transaction): MultimapOptions;
    /**
     * Get item from multimap
     * @param key the key under which the data is stored. If multiple items are
     *        stored under this key, only the FIRST data item will be returned.
     * @param txn an open Transaction
     * @param zeroCopy if true, returned Buffer is created using zero-copy
     *        semantics. This buffer must be detached by calling detachBuffer()
     *        before the end of the transaction, and before attempting any other
     *        operation involving the same key, even if that operation is being
     *        run in a separate thread. Use with caution.
     * @returns Buffer of data item
     */
    get(key: K, txn?: Transaction, zeroCopy?: boolean): Buffer;
    /**
     * Store key/value pair into multimap. This record will be added as a duplicate
     * if the key already exists unless `flags.noOverwrite === true`. However, each
     * key/value pair is still unique.
     * @param key the key to store
     * @param value the value to store
     * @param txn an open writable transaction
     * @param {MultimapPutFlags} flags */
    put(key: K, value: V, txn: Transaction, flags?: MultimapPutFlags): void;
    putAsync(key: K, value: V, flags?: MultimapPutFlags): Promise<void>;
    putMultiple(key: K, values: Buffer, numValues: number, bytesPerValue: number, flags?: MultimapPutFlags): void;
    /**
     * Removes all key/value entries for the given key.
     * @param key the key to delete
     * @param txn an open writeable transaction
     */
    del(key: K, txn: Transaction): void;
    /**
     * Removes a single key/value entry from the database.
     * @param key the key to delete
     * @param value the value to delete
     * @param txn an open writeable transaction
     */
    delEntry(key: K, value: V, txn: Transaction): void;
    delEntryAsync(key: K, value: V): Promise<void>;
}
export {};
