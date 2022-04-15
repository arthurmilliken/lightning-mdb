"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.openEnv = exports.strerror = exports.version = exports.Environment = void 0;
const binding_1 = require("./binding");
const constants_1 = require("./constants");
const path_1 = require("path");
const transaction_1 = require("./transaction");
const database_1 = require("./database");
const multimap_1 = require("./multimap");
const { isMainThread } = require("worker_threads");
const { mkdir } = require("fs/promises");
class Environment {
    constructor(envp) {
        this._isOpen = false;
        if (envp) {
            this.envp = envp;
            this._isOpen = true;
        }
        else if (!isMainThread) {
            throw new Error("Cannot use empty constructor from Worker Thread. Use Env.deserialize() instead.");
        }
        else {
            this.envp = binding_1.lmdb.env_create();
        }
    }
    /**
     * Use this method to create an Environment for use in a Worker Thread
     * @param serialized the return value from Environment.serialize()
     * @returns Environment
     */
    static deserialize(serialized) {
        return new Environment(serialized);
    }
    get isOpen() {
        return this._isOpen;
    }
    assertOpen() {
        if (!this.isOpen)
            throw new Error("This Environment is already closed.");
    }
    /**
     * Serialize this Environment so that it can be passed to Worker Threads.
     * @returns a token which can be converted into an Environment using
     *          Environment#deserialize()
     */
    serialize() {
        this.assertOpen();
        return this.envp;
    }
    /** @returns the LMDB library version information. */
    version() {
        return version();
    }
    /** @returns a string describing the given error code. */
    strerror(code) {
        return strerror(code);
    }
    /**
     * Open an Environment.
     * @param path The directory in which the database files reside. This
     *        directory must already exist and be writable.
     * @param {EnvOptions} options Special options for this environment.
     * @param mode The UNIX permissions to set on created files and semaphores.
     *        This parameter is ignored on Windows.
     */
    open(path, options, mode = 0o664) {
        if (options?.mapSize) {
            this.setMapSize(options.mapSize);
        }
        if (options?.maxReaders) {
            binding_1.lmdb.env_set_maxreaders(this.envp, options.maxReaders);
        }
        if (options?.maxDBs) {
            binding_1.lmdb.env_set_maxdbs(this.envp, options.maxDBs);
        }
        const flags = options ? calcEnvFlags(options) : 0;
        try {
            binding_1.lmdb.env_open(this.envp, path, flags, mode);
            this._isOpen = true;
        }
        catch (err) {
            binding_1.lmdb.env_close(this.envp);
            throw err;
        }
    }
    copy(path, compact) {
        this.assertOpen();
        const flags = compact ? constants_1.MDB_CP_COMPACT : 0;
        binding_1.lmdb.env_copy2(this.envp, path, flags);
    }
    copyAsync() {
        throw new Error("Method not implemented.");
    }
    copyfd(fd, compact) {
        this.assertOpen();
        const flags = compact ? constants_1.MDB_CP_COMPACT : 0;
        binding_1.lmdb.env_copyfd2(this.envp, fd, flags);
    }
    copyfdAsync() {
        throw new Error("Method not implemented.");
    }
    stat() {
        this.assertOpen();
        return binding_1.lmdb.env_stat(this.envp);
    }
    info() {
        this.assertOpen();
        return binding_1.lmdb.env_info(this.envp);
    }
    sync(force) {
        this.assertOpen();
        binding_1.lmdb.env_sync(this.envp, force || false);
    }
    close() {
        this.assertOpen();
        if (!isMainThread)
            throw new Error("Environment can only be closed from the main thread.");
        const path = this.getPath();
        binding_1.lmdb.env_close(this.envp);
        this._isOpen = false;
        delete environments[path];
    }
    setFlags(flags) {
        this.assertOpen();
        const flagsOn = calcEnvFlags(flags);
        binding_1.lmdb.env_set_flags(this.envp, flagsOn, false);
        const flagsOff = calcEnvFlags({
            noMetaSync: flags.noMetaSync === false,
            noSync: flags.noSync === false,
            mapAsync: flags.mapAsync === false,
            noMemInit: flags.noMemInit === false,
        });
        binding_1.lmdb.env_set_flags(this.envp, flagsOff, true);
    }
    getOptions() {
        this.assertOpen();
        const flags = binding_1.lmdb.env_get_flags(this.envp);
        return {
            fixedMap: (flags & constants_1.EnvFlag.FIXEDMAP) > 0 ? true : false,
            noSubdir: (flags & constants_1.EnvFlag.NOSUBDIR) > 0 ? true : false,
            readOnly: (flags & constants_1.EnvFlag.RDONLY) > 0 ? true : false,
            writeMap: (flags & constants_1.EnvFlag.WRITEMAP) > 0 ? true : false,
            noTLS: (flags & constants_1.EnvFlag.NOTLS) > 0 ? true : false,
            noLock: (flags & constants_1.EnvFlag.NOLOCK) > 0 ? true : false,
            noReadAhead: (flags & constants_1.EnvFlag.NORDAHEAD) > 0 ? true : false,
            noMetaSync: (flags & constants_1.EnvFlag.NOMETASYNC) > 0 ? true : false,
            noSync: (flags & constants_1.EnvFlag.NOSYNC) > 0 ? true : false,
            mapAsync: (flags & constants_1.EnvFlag.MAPASYNC) > 0 ? true : false,
            noMemInit: (flags & constants_1.EnvFlag.NOMEMINIT) > 0 ? true : false,
            maxReaders: this.getMaxReaders(),
        };
    }
    getPath() {
        this.assertOpen();
        return binding_1.lmdb.env_get_path(this.envp);
    }
    getfd() {
        this.assertOpen();
        return binding_1.lmdb.env_get_fd(this.envp);
    }
    setMapSize(size) {
        binding_1.lmdb.env_set_mapsize(this.envp, size);
    }
    getMaxReaders() {
        this.assertOpen();
        return binding_1.lmdb.env_get_maxreaders(this.envp);
    }
    getMaxKeySize() {
        this.assertOpen();
        return binding_1.lmdb.env_get_maxkeysize(this.envp);
    }
    beginTxn(readOnly = false) {
        this.assertOpen();
        return new transaction_1.Transaction(this.envp, readOnly);
    }
    /** Dump the entries in the reader lock table. */
    readerList() {
        return binding_1.lmdb.reader_list(this.envp);
    }
    /** Check for stale entries in the reader lock table.
     * @returns number of stale slots that were cleared. */
    readerCheck() {
        this.assertOpen();
        return binding_1.lmdb.reader_check(this.envp);
    }
    openDB(name, options, txn) {
        let useTxn = txn;
        if (!useTxn)
            useTxn = new transaction_1.Transaction(this.envp);
        const db = new database_1.Database(this.envp, name, useTxn, options);
        if (!txn)
            useTxn.commit();
        return db;
    }
    openMultimap(name, options, txn) {
        let useTxn = txn;
        if (!useTxn)
            useTxn = new transaction_1.Transaction(this.envp);
        const mm = new multimap_1.Multimap(this.envp, name, useTxn, options);
        if (!txn)
            useTxn.commit();
        return mm;
    }
}
exports.Environment = Environment;
/** @returns the LMDB library version information. */
function version() {
    return binding_1.lmdb.version();
}
exports.version = version;
/**
 * @param code
 * @returns a string describing a given error code.
 */
function strerror(code) {
    return binding_1.lmdb.strerror(code);
}
exports.strerror = strerror;
function calcEnvFlags(flags) {
    const asFlags = flags;
    const asOptions = flags;
    return ((asFlags.noMetaSync ? constants_1.EnvFlag.NOMETASYNC : 0) +
        (asFlags.noSync ? constants_1.EnvFlag.NOSYNC : 0) +
        (asFlags.mapAsync ? constants_1.EnvFlag.MAPASYNC : 0) +
        (asFlags.noMemInit ? constants_1.EnvFlag.NOMEMINIT : 0) +
        (asOptions.fixedMap ? constants_1.EnvFlag.FIXEDMAP : 0) +
        (asOptions.noSubdir ? constants_1.EnvFlag.NOSUBDIR : 0) +
        (asOptions.readOnly ? constants_1.EnvFlag.RDONLY : 0) +
        (asOptions.writeMap ? constants_1.EnvFlag.WRITEMAP : 0) +
        (asOptions.noTLS ? constants_1.EnvFlag.NOTLS : 0) +
        (asOptions.noLock ? constants_1.EnvFlag.NOLOCK : 0) +
        (asOptions.noReadAhead ? constants_1.EnvFlag.NORDAHEAD : 0));
}
const environments = {};
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
async function openEnv(path, flags, mode) {
    const absPath = path_1.resolve(path);
    if (environments[absPath])
        throw new Error(`Env already open at '${path}'`);
    let dir = absPath;
    if (flags?.noSubdir) {
        dir = path_1.dirname(absPath);
    }
    await mkdir(dir, { recursive: true });
    const env = new Environment();
    env.open(absPath, flags, mode);
    environments[absPath] = env;
    return env;
}
exports.openEnv = openEnv;
async function main() {
    const env = await openEnv(".testdb");
    console.log({ stat: env.stat() });
    console.log({ info: env.info() });
    env.close();
    console.log({ m: "closed env" });
}
if (require.main === module)
    main();
//# sourceMappingURL=environment.js.map