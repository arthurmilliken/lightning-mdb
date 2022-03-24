import * as log from "https://deno.land/std@0.130.0/log/mod.ts";
import { ensureDir } from "https://deno.land/std@0.130.0/fs/mod.ts";
import { dirname } from "https://deno.land/std@0.130.0/path/mod.ts";
import {
  lmdb,
  MDB_CP_COMPACT,
  MDB_NOMETASYNC,
  MDB_NOSUBDIR,
  MDB_NOSYNC,
  MDB_PREVSNAPSHOT,
  MDB_RDONLY,
  SYNC_FORCE,
} from "./lmdb_ffi.ts";
import { DbData } from "./dbdata.ts";
import { DbError } from "./dberror.ts";
import { DbStat } from "./dbstat.ts";

export interface Version {
  major: number;
  minor: number;
  patch: number;
  string: string;
}

export interface EnvOptions {
  path: string;
  maxReaders?: number;
  maxDbs?: number;
  mapSize?: number;
  noSubdir?: boolean;
  readOnly?: boolean;
  prevSnapshot?: boolean;
}

export interface EnvInfo {
  mapSize: number;
  lastPage: number;
  lastTxn: number;
  maxReaders: number;
  numReaders: number;
}

const notOpen = () => new Error("DB environment is not open");
const encoder = new TextEncoder();
const decoder = new TextDecoder();

export class Environment {
  // Static behaviors
  private static version: Version;
  static getVersion(): Version {
    if (!Environment.version) {
      const major = new Int32Array(1);
      const minor = new Int32Array(1);
      const patch = new Int32Array(1);
      const versionPtr = lmdb.ffi_version(major, minor, patch);
      Environment.version = {
        major: major[0],
        minor: minor[0],
        patch: patch[0],
        string: new Deno.UnsafePointerView(versionPtr).getCString(),
      };
    }
    return Environment.version;
  }
  static getVersionString(): string {
    return Environment.getVersion().string;
  }

  // Instance behaviors

  options: EnvOptions;
  fenv: BigUint64Array = new BigUint64Array(1);
  dbKey: DbData = new DbData();
  dbData: DbData = new DbData();
  isOpen = false;

  constructor(options: EnvOptions) {
    this.options = options;
    let rc = lmdb.ffi_env_create(this.fenv);
    if (rc) throw DbError.from(rc);
    if (options?.maxDbs) {
      rc = lmdb.ffi_env_set_maxdbs(this.fenv, options.maxDbs);
      if (rc) throw DbError.from(rc);
    }
    if (options?.maxReaders) {
      rc = lmdb.ffi_env_set_maxreaders(this.fenv, options.maxReaders);
      if (rc) throw DbError.from(rc);
    }
    if (options?.mapSize) {
      this.setMapSize(options.mapSize);
    }
  }

  setMapSize(bytes: number): void {
    const rc = lmdb.ffi_env_set_mapsize(this.fenv, bytes);
    if (rc) throw DbError.from(rc);
  }

  getMaxReaders(): number {
    const readersData = new Uint32Array(1);
    const rc = lmdb.ffi_env_get_maxreaders(this.fenv, readersData);
    if (rc) throw DbError.from(rc);
    return readersData[0];
  }

  maxKeySize = 0;
  getMaxKeySize(): number {
    if (!this.maxKeySize)
      this.maxKeySize = lmdb.ffi_env_get_maxkeysize(this.fenv);
    return this.maxKeySize;
  }

  async open(): Promise<Environment> {
    // MDB_NOMETASYNC and MDB_NOSYNC are set to true so that disk flush can
    // be handled as an asynchronous non-blocking operation.
    const flagsVal =
      MDB_NOMETASYNC |
      MDB_NOSYNC |
      (this.options.noSubdir ? MDB_NOSUBDIR : 0) |
      (this.options.readOnly ? MDB_RDONLY : 0) |
      (this.options.prevSnapshot ? MDB_PREVSNAPSHOT : 0);
    // Create dir if needed.
    if (this.options.noSubdir) {
      await ensureDir(dirname(this.options.path));
    } else {
      await ensureDir(this.options.path);
    }
    this.dbData.data = encoder.encode(this.options.path);
    const rc = lmdb.ffi_env_open(this.fenv, this.dbData.fdata, flagsVal, 0o664);
    if (rc) throw DbError.from(rc);
    this.isOpen = true;
    return this;
  }

  async close(): Promise<void> {
    if (!this.isOpen) throw notOpen();
    await this.flush();
    lmdb.ffi_env_close(this.fenv);
    this.isOpen = false;
  }

  async copy(path: string, compact = false) {
    if (!this.isOpen) throw notOpen();
    await ensureDir(path);
    this.dbData.data = encoder.encode(path);
    const rc = await lmdb.ffi_env_copy2(
      this.fenv,
      this.dbData.fdata,
      compact ? MDB_CP_COMPACT : 0
    );
    if (rc) throw DbError.from(rc);
  }

  stat(): DbStat {
    if (!this.isOpen) throw notOpen();
    const fstat = new Float64Array(DbStat.LENGTH);
    const rc = lmdb.ffi_env_stat(this.fenv, fstat);
    if (rc) throw DbError.from(rc);
    return new DbStat(fstat);
  }

  info(): EnvInfo {
    if (!this.isOpen) throw notOpen();
    const INFO_LEN = 5;
    const INFO_MAPSIZE = 0;
    const INFO_LAST_PGNO = 1;
    const INFO_LAST_TXNID = 2;
    const INFO_MAXREADERS = 3;
    const INFO_NUMREADERS = 4;
    const info = new Float64Array(INFO_LEN);
    const rc = lmdb.ffi_env_info(this.fenv, info);
    if (rc) throw DbError.from(rc);
    return {
      mapSize: info[INFO_MAPSIZE],
      lastPage: info[INFO_LAST_PGNO],
      lastTxn: info[INFO_LAST_TXNID],
      maxReaders: info[INFO_MAXREADERS],
      numReaders: info[INFO_NUMREADERS],
    };
  }

  flushSync(): void {
    if (!this.isOpen) throw notOpen();
    const rc = lmdb.ffi_env_sync(this.fenv, SYNC_FORCE);
    if (rc) throw DbError.from(rc);
  }

  async flush(): Promise<void> {
    if (!this.isOpen) throw notOpen();
    const rc = await lmdb.ffi_env_sync_force(this.fenv);
    if (rc) throw DbError.from(rc);
  }

  getPath(): string {
    if (!this.isOpen) throw notOpen();
    const rc = lmdb.ffi_env_get_path(this.fenv, this.dbData.fdata);
    if (rc) throw DbError.from(rc);
    return decoder.decode(this.dbData.data);
  }
}

export async function openEnv(options: EnvOptions) {
  const dbEnv = new Environment(options);
  await dbEnv.open();
  return dbEnv;
}

async function main() {
  try {
    log.info({ version: Environment.getVersionString() });
    const dbEnv = await openEnv({ path: ".testdb" });
    log.info({ stat: dbEnv.stat().asRecord() });
    log.info({ info: dbEnv.info() });
    log.info({ path: dbEnv.getPath() });
    log.info("done!");
  } catch (err) {
    log.error(err);
  }
}

if (import.meta.main) main();
