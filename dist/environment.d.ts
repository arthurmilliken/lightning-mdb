import { Transaction } from "./transaction";
import { Database, DbOptions, DbStat } from "./database";
import { Key } from "./types";
export declare class Environment {
    /**
     * Use this method to create an Environment for use in a Worker Thread
     * @param serialized the return value from Environment.serialize()
     * @returns Environment
     */
    static deserialize(serialized: bigint): Environment;
    readonly envp: bigint;
    private _isOpen;
    constructor(envp?: bigint);
    get isOpen(): boolean;
    private assertOpen;
    /**
     * Serialize this Environment so that it can be passed to Worker Threads.
     * @returns a token which can be converted into an Environment using
     *          Environment#deserialize()
     */
    serialize(): bigint;
    version(): Version;
    strerror(code: number): string;
    open(path: string, options?: EnvOptions, mode?: number): void;
    copy(path: string, compact?: boolean): void;
    copyAsync(path: string, compact?: boolean): Promise<void>;
    copyfd(fd: number, compact?: boolean): void;
    copyfdAsync(fd: number, compact?: boolean): Promise<void>;
    stat(): DbStat;
    info(): EnvInfo;
    sync(force?: boolean): void;
    close(): void;
    setFlags(flags: EnvFlags): void;
    getOptions(): EnvOptions;
    getPath(): string;
    getfd(): number;
    setMapSize(size: number): void;
    getMaxReaders(): number;
    getMaxKeySize(): number;
    beginTxn(readOnly?: boolean): Transaction;
    /**
     * Check for stale entries in the reader lock table.
     * @returns number of stale slots that were cleared.
     */
    readerCheck(): number;
    openDB<K extends Key = string>(name: string | null, options?: DbOptions, txn?: Transaction): Database<K>;
}
export declare function version(): Version;
export declare function strerror(code: number): string;
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
/**
 * Create and open an LMDB environment.
 *
 * @param path The directory in which the database files reside. This
 * directory will be created if it does not already exist.
 * @param flags see @type {EnvOptions} for details
 * @param mode The UNIX permissions to set on created files and semaphores.
 * This parameter is ignored on Windows.
 * @returns a promise which resolves to the open environment.
 */
export declare function openEnv(path: string, flags?: EnvOptions, mode?: number): Promise<Environment>;
