import { lmdb } from "./binding";
import { EnvFlag, MDB_CP_COMPACT } from "./constants";
import { dirname, resolve } from "path";
import { Transaction } from "./transaction";
import { Database } from "./database";
import {
  DbOptions,
  DbStat,
  EnvFlags,
  EnvInfo,
  EnvOptions,
  Key,
  Version,
} from "./types";
const { isMainThread } = require("worker_threads");
const { mkdir } = require("fs/promises");

export class Environment {
  /**
   * Use this method to create an Environment for use in a Worker Thread
   * @param serialized the return value from Environment.serialize()
   * @returns Environment
   */
  static deserialize(serialized: bigint): Environment {
    return new Environment(serialized);
  }

  private _isOpen = false;
  readonly envp: bigint;

  constructor(envp?: bigint) {
    if (envp) {
      this.envp = envp;
      this._isOpen = true;
    } else if (!isMainThread) {
      throw new Error(
        "Cannot use empty constructor from Worker Thread. Use Env.deserialize() instead."
      );
    } else {
      this.envp = lmdb.env_create();
    }
  }
  get isOpen(): boolean {
    return this._isOpen;
  }
  private assertOpen(): void {
    if (!this.isOpen) throw new Error("This Environment is already closed.");
  }
  /**
   * Serialize this Environment so that it can be passed to Worker Threads.
   * @returns a token which can be converted into an Environment using
   *          Environment#deserialize()
   */
  serialize(): bigint {
    this.assertOpen();
    return this.envp;
  }
  version(): Version {
    return version();
  }
  strerror(code: number): string {
    return strerror(code);
  }
  open(path: string, options?: EnvOptions, mode = 0o664): void {
    if (options?.mapSize) {
      this.setMapSize(options.mapSize);
    }
    if (options?.maxReaders) {
      lmdb.env_set_maxreaders(this.envp, options.maxReaders);
    }
    if (options?.maxDBs) {
      lmdb.env_set_maxdbs(this.envp, options.maxDBs);
    }
    const flags = options ? calcEnvFlags(options) : 0;
    lmdb.env_open(this.envp, path, flags, mode);
    this._isOpen = true;
  }
  copy(path: string, compact?: boolean): void {
    this.assertOpen();
    const flags = compact ? MDB_CP_COMPACT : 0;
    lmdb.env_copy2(this.envp, path, flags);
  }
  copyAsync(): Promise<void> {
    throw new Error("Method not implemented.");
  }
  copyfd(fd: number, compact?: boolean): void {
    this.assertOpen();
    const flags = compact ? MDB_CP_COMPACT : 0;
    lmdb.env_copyfd2(this.envp, fd, flags);
  }
  copyfdAsync(): Promise<void> {
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
    this._isOpen = false;
    delete environments[path];
  }
  setFlags(flags: EnvFlags): void {
    this.assertOpen();
    const flagsOn = calcEnvFlags(flags);
    lmdb.env_set_flags(this.envp, flagsOn, false);
    const flagsOff = calcEnvFlags({
      noMetaSync: flags.noMetaSync === false,
      noSync: flags.noSync === false,
      mapAsync: flags.mapAsync === false,
      noMemInit: flags.noMemInit === false,
    });
    lmdb.env_set_flags(this.envp, flagsOff, true);
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
    lmdb.env_set_mapsize(this.envp, size);
  }
  getMaxReaders(): number {
    this.assertOpen();
    return lmdb.env_get_maxreaders(this.envp);
  }
  getMaxKeySize(): number {
    this.assertOpen();
    return lmdb.env_get_maxkeysize(this.envp);
  }
  beginTxn(readOnly = false): Transaction {
    this.assertOpen();
    return new Transaction(this.envp, readOnly);
  }
  /** Dump the entries in the reader lock table. */
  readerList(): string[] {
    return lmdb.reader_list(this.envp);
  }
  /** Check for stale entries in the reader lock table.
   * @returns number of stale slots that were cleared. */
  readerCheck(): number {
    this.assertOpen();
    return lmdb.reader_check(this.envp);
  }
  openDB<K extends Key = string>(
    name: string | null,
    options?: DbOptions,
    txn?: Transaction
  ): Database<K> {
    let useTxn = txn;
    if (!useTxn) useTxn = new Transaction(this.envp);
    const db = new Database<K>(this.envp, name, useTxn, options);
    if (!txn) useTxn.commit();
    return db;
  }
}

export function version(): Version {
  return lmdb.version();
}

export function strerror(code: number): string {
  return lmdb.strerror(code);
}

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

const environments: Record<string, Environment> = {};

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
export async function openEnv(
  path: string,
  flags?: EnvOptions,
  mode?: number
): Promise<Environment> {
  const absPath = resolve(path);
  if (environments[absPath]) throw new Error(`Env already open at '${path}'`);
  let dir = absPath;
  if (flags?.noSubdir) {
    dir = dirname(absPath);
  }
  await mkdir(dir, { recursive: true });
  const env = new Environment();
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
