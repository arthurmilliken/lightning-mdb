import { Transaction } from "./transaction";
import { Database } from "./database";
import { DbOptions, DbStat, EnvFlags, EnvInfo, EnvOptions, Key, Version } from "./types";
export declare class Environment {
    /**
     * Use this method to create an Environment for use in a Worker Thread
     * @param serialized the return value from Environment.serialize()
     * @returns Environment
     */
    static deserialize(serialized: bigint): Environment;
    private _isOpen;
    readonly envp: bigint;
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
    /** Dump the entries in the reader lock table. */
    readerList(): string[];
    /** Check for stale entries in the reader lock table.
     * @returns number of stale slots that were cleared. */
    readerCheck(): number;
    openDB<K extends Key = string>(name: string | null, options?: DbOptions, txn?: Transaction): Database<K>;
}
export declare function version(): Version;
export declare function strerror(code: number): string;
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
