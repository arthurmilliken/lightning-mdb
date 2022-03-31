import { lmdb } from "./binding";
import { EnvFlag, MDB_CP_COMPACT, MDB_RDONLY, SetFlags } from "./constants";
import {
  Database,
  DbFlags,
  DbStat,
  EnvFlags,
  EnvInfo,
  EnvOptions,
  IEnv,
  ITxn,
} from "./types";
import { resolve } from "path";
import { Txn } from "./txn";
const { isMainThread } = require("worker_threads");
const { mkdir, stat } = require("fs/promises");

const alreadyClosed = "This Environment is already closed.";

function calcEnvFlags(flags: EnvOptions | EnvFlags) {
  const asFlags = <EnvFlags>flags;
  const asOptions = <EnvOptions>flags;
  return (
    (asFlags.noMetaSync ? EnvFlag.NOMETASYNC : 0) +
    (asFlags.noSync ? EnvFlag.NOSYNC : 0) +
    (asFlags.mapAsync ? EnvFlag.MAPASYNC : 0) +
    (asFlags.noMemInit ? EnvFlag.NOMEMINIT : 0) +
    (asOptions.fixedMap ? EnvFlag.FIXEDMAP : 0) +
    (asOptions.noSubdir ? EnvFlag.NOSUBDIR : 0) +
    (asOptions.readOnly ? EnvFlag.RDONLY : 0) +
    (asOptions.writeMap ? EnvFlag.WRITEMAP : 0) +
    (asOptions.noTLS ? EnvFlag.NOTLS : 0) +
    (asOptions.noLock ? EnvFlag.NOLOCK : 0) +
    (asOptions.noReadAhead ? EnvFlag.NORDAHEAD : 0)
  );
}

class Env implements IEnv {
  static deserialize(envp: bigint): Env {
    return new Env(envp);
  }

  readonly envp: bigint;
  private isOpen = false;
  constructor(envp?: bigint) {
    if (envp) {
      this.envp = envp;
      this.isOpen = true;
    } else if (!isMainThread) {
      throw new Error(
        "Cannot use empty constructor from worker. Use Env.deserialize() instead."
      );
    } else {
      this.envp = lmdb.env_create();
    }
  }
  private assertOpen(): void {
    if (!this.isOpen) throw new Error(alreadyClosed);
  }
  serialize(): bigint {
    this.assertOpen();
    return this.envp;
  }
  open(path: string, options?: EnvOptions, mode = 0o664): void {
    if (options?.mapSize) {
      this.setMapSize(options.mapSize);
    }
    if (options?.maxReaders) {
      lmdb.set_maxreaders(this.envp, options.maxReaders);
    }
    if (options?.maxDBs) {
      lmdb.set_maxdbs(this.envp, options.maxDBs);
    }
    const flags = calcEnvFlags(Object.assign({}, options));
    lmdb.env_open(this.envp, path, flags, mode);
    this.isOpen = true;
  }
  copy(path: string, compact?: boolean): void {
    this.assertOpen();
    const flags = compact ? MDB_CP_COMPACT : 0;
    lmdb.copy2(this.envp, path, flags);
  }
  copyAsync(path: string, compact?: boolean): Promise<void> {
    throw new Error("Method not implemented.");
  }
  copyfd(fd: number, compact?: boolean): void {
    this.assertOpen();
    const flags = compact ? MDB_CP_COMPACT : 0;
    lmdb.copyfd2(this.envp, fd, flags);
  }
  copyfdAsync(fd: number, compact?: boolean): Promise<void> {
    throw new Error("Method not implemented.");
  }
  stat(): DbStat {
    this.assertOpen();
    return lmdb.env_stat(this.envp);
  }
  info(): EnvInfo {
    this.assertOpen();
    return lmdb.env_info(this.envp);
  }
  sync(force?: boolean): void {
    this.assertOpen();
    lmdb.env_sync(this.envp, force || false);
  }
  close(): void {
    this.assertOpen();
    const path = this.getPath();
    lmdb.env_close(this.envp);
    this.isOpen = false;
    delete environments[path];
  }
  setFlags(flags: EnvFlags): void {
    this.assertOpen();
    const flagsOn = calcEnvFlags(flags);
    lmdb.env_set_flags(this.envp, flagsOn, SetFlags.ON);
    const flagsOff = calcEnvFlags({
      noMetaSync: flags.noMetaSync === false,
      noSync: flags.noSync === false,
      mapAsync: flags.mapAsync === false,
      noMemInit: flags.noMemInit === false,
    });
    lmdb.env_set_flags(this.envp, flagsOff, SetFlags.OFF);
  }
  getOptions(): EnvOptions {
    this.assertOpen();
    const flags = lmdb.env_get_flags(this.envp);
    return {
      fixedMap: (flags & EnvFlag.FIXEDMAP) > 0 ? true : false,
      noSubdir: (flags & EnvFlag.NOSUBDIR) > 0 ? true : false,
      readOnly: (flags & EnvFlag.RDONLY) > 0 ? true : false,
      writeMap: (flags & EnvFlag.WRITEMAP) > 0 ? true : false,
      noTLS: (flags & EnvFlag.NOTLS) > 0 ? true : false,
      noLock: (flags & EnvFlag.NOLOCK) > 0 ? true : false,
      noReadAhead: (flags & EnvFlag.NORDAHEAD) > 0 ? true : false,
      noMetaSync: (flags & EnvFlag.NOMETASYNC) > 0 ? true : false,
      noSync: (flags & EnvFlag.NOSYNC) > 0 ? true : false,
      mapAsync: (flags & EnvFlag.MAPASYNC) > 0 ? true : false,
      noMemInit: (flags & EnvFlag.NOMEMINIT) > 0 ? true : false,
      maxReaders: this.getMaxReaders(),
    };
  }
  getPath(): string {
    this.assertOpen();
    return lmdb.env_get_path(this.envp);
  }
  getfd(): number {
    this.assertOpen();
    return lmdb.env_get_fd(this.envp);
  }
  setMapSize(size: number): void {
    this.assertOpen();
    lmdb.env_set_mapsize(this.envp, size);
  }
  getMaxReaders(): number {
    this.assertOpen();
    return lmdb.get_maxreaders(this.envp);
  }
  getMaxKeySize(): number {
    this.assertOpen();
    return lmdb.get_max_keysize(this.envp);
  }
  beginTxn(readOnly?: false, parent: ITxn | null = null): ITxn {
    this.assertOpen();
    const txnp = lmdb.txn_begin(this.envp, parent, readOnly ? MDB_RDONLY : 0);
    return new Txn(txnp);
  }
  getDeadReaders(): number {
    this.assertOpen();
    return lmdb.reader_check(this.envp);
  }
  openDB(
    name: string | null,
    flags?: DbFlags | null,
    txn?: ITxn
  ): Database<string> {
    throw new Error("Method not implemented.");
    // create transaction if necessary
    // open database
    // commit transaction if necessary
    // return database
  }
}

const environments: Record<string, Env> = {};

async function openEnv(
  path: string,
  flags?: EnvOptions,
  mode?: number
): Promise<Env> {
  const absPath = resolve(path);
  if (environments[absPath]) throw new Error(`Env already open at '${path}'`);
  const stats = await stat(absPath);
  await mkdir(absPath, { recursive: true });
  const env = new Env();
  env.open(absPath, flags, mode);
  environments[absPath] = env;
  return env;
}

async function main() {
  const env = await openEnv(".testdb");
  console.log({ stat: env.stat() });
  console.log({ info: env.info() });
  env.close();
  console.log({ m: "closed env" });
}

if (require.main === module) main();
