"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const binding_1 = require("./binding");
const constants_1 = require("./constants");
const path_1 = require("path");
const txn_1 = require("./txn");
const { isMainThread } = require("worker_threads");
const { mkdir, stat } = require("fs/promises");
const alreadyClosed = "This Environment is already closed.";
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
class Env {
    constructor(envp) {
        this.isOpen = false;
        if (envp) {
            this.envp = envp;
            this.isOpen = true;
        }
        else if (!isMainThread) {
            throw new Error("Cannot use empty constructor from worker. Use Env.deserialize() instead.");
        }
        else {
            this.envp = binding_1.lmdb.env_create();
        }
    }
    static deserialize(envp) {
        return new Env(envp);
    }
    assertOpen() {
        if (!this.isOpen)
            throw new Error(alreadyClosed);
    }
    serialize() {
        this.assertOpen();
        return this.envp;
    }
    open(path, options, mode = 0o664) {
        if (options === null || options === void 0 ? void 0 : options.mapSize) {
            this.setMapSize(options.mapSize);
        }
        if (options === null || options === void 0 ? void 0 : options.maxReaders) {
            binding_1.lmdb.set_maxreaders(this.envp, options.maxReaders);
        }
        if (options === null || options === void 0 ? void 0 : options.maxDBs) {
            binding_1.lmdb.set_maxdbs(this.envp, options.maxDBs);
        }
        const flags = calcEnvFlags(Object.assign({}, options));
        binding_1.lmdb.env_open(this.envp, path, flags, mode);
        this.isOpen = true;
    }
    copy(path, compact) {
        this.assertOpen();
        const flags = compact ? constants_1.MDB_CP_COMPACT : 0;
        binding_1.lmdb.copy(this.envp, path, flags);
    }
    copyAsync(path, compact) {
        throw new Error("Method not implemented.");
    }
    copyFD(fd, compact) {
        this.assertOpen();
        const flags = compact ? constants_1.MDB_CP_COMPACT : 0;
        binding_1.lmdb.copyfd(this.envp, fd, flags);
    }
    copyFDAsync(fd, compact) {
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
        const path = this.getPath();
        binding_1.lmdb.env_close(this.envp);
        this.isOpen = false;
        delete environments[path];
    }
    setFlags(flags) {
        this.assertOpen();
        const flagsOn = calcEnvFlags(flags);
        binding_1.lmdb.env_set_flags(this.envp, flagsOn, constants_1.SetFlags.ON);
        const flagsOff = calcEnvFlags({
            noMetaSync: flags.noMetaSync === false,
            noSync: flags.noSync === false,
            mapAsync: flags.mapAsync === false,
            noMemInit: flags.noMemInit === false,
        });
        binding_1.lmdb.env_set_flags(this.envp, flagsOff, constants_1.SetFlags.OFF);
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
    getFD() {
        this.assertOpen();
        return binding_1.lmdb.env_get_fd(this.envp);
    }
    setMapSize(size) {
        this.assertOpen();
        binding_1.lmdb.env_set_mapsize(this.envp, size);
    }
    getMaxReaders() {
        this.assertOpen();
        return binding_1.lmdb.get_maxreaders(this.envp);
    }
    getMaxKeySize() {
        this.assertOpen();
        return binding_1.lmdb.get_max_keysize(this.envp);
    }
    beginTxn(readOnly, parent = null) {
        this.assertOpen();
        const txnp = binding_1.lmdb.txn_begin(this.envp, parent, readOnly ? constants_1.MDB_RDONLY : 0);
        return new txn_1.Txn(txnp);
    }
    getDeadReaders() {
        this.assertOpen();
        return binding_1.lmdb.reader_check(this.envp);
    }
    openDB(name, flags, txn) {
        throw new Error("Method not implemented.");
        // create transaction if necessary
        // open database
        // commit transaction if necessary
        // return database
    }
}
const environments = {};
function openEnv(path, flags, mode) {
    return __awaiter(this, void 0, void 0, function* () {
        const absPath = path_1.resolve(path);
        if (environments[absPath])
            throw new Error(`Env already open at '${path}'`);
        const stats = yield stat(absPath);
        yield mkdir(absPath, { recursive: true });
        const env = new Env();
        env.open(absPath, flags, mode);
        environments[absPath] = env;
        return env;
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const env = yield openEnv(".testdb");
        console.log({ stat: env.stat() });
        console.log({ info: env.info() });
        env.close();
        console.log({ m: "closed env" });
    });
}
if (require.main === module)
    main();
//# sourceMappingURL=env.js.map