import * as log from "https://deno.land/std@0.130.0/log/mod.ts";
import { ensureDir } from "https://deno.land/std@0.130.0/fs/mod.ts";
import { dirname } from "https://deno.land/std@0.130.0/path/mod.ts";
import {
  FLAGS_OFF,
  FLAGS_ON,
  lmdb,
  MDB_CP_COMPACT,
  MDB_CREATE,
  MDB_KEYEXIST,
  MDB_MAPASYNC,
  MDB_NOLOCK,
  MDB_NOMEMINIT,
  MDB_NOMETASYNC,
  MDB_NOOVERWRITE,
  MDB_NORDAHEAD,
  MDB_NOSUBDIR,
  MDB_NOSYNC,
  MDB_NOTLS,
  MDB_PREVSNAPSHOT,
  MDB_PROBLEM,
  MDB_RDONLY,
  MDB_WRITEMAP,
  op,
  SYNC_DONT_FORCE,
  SYNC_FORCE,
} from "./lmdb_ffi.ts";
import { DbValue } from "./dbvalue.ts";
import { DbError, notImplemented } from "./dberror.ts";

export interface Version {
  major: number;
  minor: number;
  patch: number;
  string: string;
}

export interface EnvOptions {
  maxReaders?: number;
  maxDbs?: number;
  mapSize?: number;
}

export interface EnvFlags {
  noSubdir?: boolean;
  readOnly?: boolean;
  writeMap?: boolean;
  noMetaSync?: boolean;
  noSync?: boolean;
  mapAsync?: boolean;
  noTLS?: boolean;
  noLock?: boolean;
  noReadAhead?: boolean;
  noMemInit?: boolean;
  prevSnapshot?: boolean;
}

export interface EnvFlagsWriteable {
  noMetaSync?: boolean;
  noSync?: boolean;
  mapAsync?: boolean;
  noMemInit?: boolean;
}

export function calcEnvFlags(f: EnvFlagsWriteable, inverse = false) {
  if (inverse) {
    // Count only the flags explicitly set to FALSE
    return (
      (f.noMetaSync == false ? MDB_NOMETASYNC : 0) +
      (f.noSync == false ? MDB_NOSYNC : 0) +
      (f.mapAsync == false ? MDB_MAPASYNC : 0) +
      (f.noMemInit == false ? MDB_NOMEMINIT : 0)
    );
  } else {
    return (
      (f.noMetaSync ? MDB_NOMETASYNC : 0) +
      (f.noSync ? MDB_NOSYNC : 0) +
      (f.mapAsync ? MDB_MAPASYNC : 0) +
      (f.noMemInit ? MDB_NOMEMINIT : 0)
    );
  }
}

export enum Mode {
  None = 0o0,
  Read = 0o4,
  Write = 0o6,
}

export interface FMode {
  self: Mode;
  group: Mode;
  other: Mode;
}

const envModeDefault: FMode = {
  self: Mode.Write,
  group: Mode.Write,
  other: Mode.Read,
};

export interface DbStat {
  pageSize: number;
  depth: number;
  branchPages: number;
  leafPages: number;
  overflowPages: number;
  entries: number;
}

export interface EnvInfo {
  mapSize: number;
  lastPage: number;
  lastTxn: number;
  maxReaders: number;
  numReaders: number;
}

function dbNotOpen() {
  return new Error("Database is not open");
}

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

  options?: EnvOptions;
  env: BigUint64Array = new BigUint64Array(1);
  dbKey: DbValue = new DbValue();
  dbData: DbValue = new DbValue();
  isOpen = false;

  constructor(options?: EnvOptions) {
    this.options = options;
    let rc = lmdb.ffi_env_create(this.env);
    if (rc) throw DbError.fromCode(rc);
    if (options?.maxDbs) {
      rc = lmdb.ffi_env_set_maxdbs(this.env, options.maxDbs);
      if (rc) throw DbError.fromCode(rc);
    }
    if (options?.maxReaders) {
      rc = lmdb.ffi_env_set_maxreaders(this.env, options.maxReaders);
      if (rc) throw DbError.fromCode(rc);
    }
    if (options?.mapSize) {
      this.setMapSize(options.mapSize);
    }
  }

  setMapSize(bytes: number): void {
    const rc = lmdb.ffi_env_set_mapsize(this.env, bytes);
    if (rc) throw DbError.fromCode(rc);
  }

  getMaxReaders(): number {
    const readersData = new Uint32Array(1);
    const rc = lmdb.ffi_env_get_maxreaders(this.env, readersData);
    if (rc) throw DbError.fromCode(rc);
    return readersData[0];
  }

  getMaxKeySize(): number {
    return lmdb.ffi_env_get_maxkeysize(this.env);
  }

  async open(path: string, flags?: EnvFlags, mode?: FMode): Promise<void> {
    // Calculate flags.
    const f: EnvFlags = Object.assign({}, flags);
    const flagsVal =
      (f.noSubdir ? MDB_NOSUBDIR : 0) +
      (f.readOnly ? MDB_RDONLY : 0) +
      (f.writeMap ? MDB_WRITEMAP : 0) +
      (f.noMetaSync ? MDB_NOMETASYNC : 0) +
      (f.mapAsync ? MDB_MAPASYNC : 0) +
      (f.noTLS ? MDB_NOTLS : 0) +
      (f.noLock ? MDB_NOLOCK : 0) +
      (f.noReadAhead ? MDB_NORDAHEAD : 0) +
      (f.noMemInit ? MDB_NOMEMINIT : 0) +
      (f.prevSnapshot ? MDB_PREVSNAPSHOT : 0);
    // Calculate mode.
    const _mode: FMode = Object.assign({}, envModeDefault, mode);
    const modeVal = _mode.self * 0o100 + _mode.group * 0o10 + _mode.other;
    // Create dir if needed.
    if (flags?.noSubdir) {
      await ensureDir(dirname(path));
    } else {
      await ensureDir(path);
    }
    this.dbData.data = encoder.encode(path);
    const rc = lmdb.ffi_env_open(
      this.env,
      this.dbData.byteArray,
      flagsVal,
      modeVal
    );
    if (rc) throw DbError.fromCode(rc);
    this.isOpen = true;
  }

  close(): void {
    if (!this.isOpen) throw dbNotOpen();
    lmdb.ffi_env_close(this.env);
    this.isOpen = false;
  }

  async copy(path: string, compact = false) {
    if (!this.isOpen) throw dbNotOpen();
    await ensureDir(path);
    this.dbData.data = encoder.encode(path);
    const rc = await lmdb.ffi_env_copy2(
      this.env,
      this.dbData.byteArray,
      compact ? MDB_CP_COMPACT : 0
    );
    if (rc) throw DbError.fromCode(rc);
  }

  stat(): DbStat {
    if (!this.isOpen) throw dbNotOpen();
    const STAT_LEN = 6;
    const STAT_PSIZE = 0;
    const STAT_DEPTH = 1;
    const STAT_BRANCH_PAGES = 2;
    const STAT_LEAF_PAGES = 3;
    const STAT_OVERFLOW_PAGES = 4;
    const STAT_ENTRIES = 5;
    const stat = new Float64Array(STAT_LEN);
    const rc = lmdb.ffi_env_stat(this.env, stat);
    if (rc) throw DbError.fromCode(rc);
    return {
      pageSize: stat[STAT_PSIZE],
      depth: stat[STAT_DEPTH],
      branchPages: stat[STAT_BRANCH_PAGES],
      leafPages: stat[STAT_LEAF_PAGES],
      overflowPages: stat[STAT_OVERFLOW_PAGES],
      entries: stat[STAT_ENTRIES],
    };
  }

  info(): EnvInfo {
    if (!this.isOpen) throw dbNotOpen();
    const INFO_LEN = 5;
    const INFO_MAPSIZE = 0;
    const INFO_LAST_PGNO = 1;
    const INFO_LAST_TXNID = 2;
    const INFO_MAXREADERS = 3;
    const INFO_NUMREADERS = 4;
    const info = new Float64Array(INFO_LEN);
    const rc = lmdb.ffi_env_info(this.env, info);
    if (rc) throw DbError.fromCode(rc);
    return {
      mapSize: info[INFO_MAPSIZE],
      lastPage: info[INFO_LAST_PGNO],
      lastTxn: info[INFO_LAST_TXNID],
      maxReaders: info[INFO_MAXREADERS],
      numReaders: info[INFO_NUMREADERS],
    };
  }

  flush(force = false): void {
    if (!this.isOpen) throw dbNotOpen();
    const rc = lmdb.ffi_env_sync(
      this.env,
      force ? SYNC_FORCE : SYNC_DONT_FORCE
    );
    if (rc) throw DbError.fromCode(rc);
  }

  setFlags(flags: EnvFlagsWriteable): void {
    const flagsOn = calcEnvFlags(flags);
    if (flagsOn) {
      const rc = lmdb.ffi_env_set_flags(this.env, flagsOn, FLAGS_ON);
      if (rc) throw DbError.fromCode(rc);
    }
    const flagsOff = calcEnvFlags(flags, true);
    if (flagsOff) {
      const rc = lmdb.ffi_env_set_flags(this.env, flagsOff, FLAGS_OFF);
      if (rc) throw DbError.fromCode(rc);
    }
  }

  getFlags(): EnvFlags {
    const flagsData = new Uint32Array(1);
    const rc = lmdb.ffi_env_get_flags(this.env, flagsData);
    const flags = flagsData[0];
    if (rc) throw DbError.fromCode(rc);
    return {
      noSubdir: (flags & MDB_NOSUBDIR) > 0,
      readOnly: (flags & MDB_RDONLY) > 0,
      writeMap: (flags & MDB_WRITEMAP) > 0,
      noMetaSync: (flags & MDB_NOMETASYNC) > 0,
      noSync: (flags & MDB_NOSYNC) > 0,
      mapAsync: (flags & MDB_MAPASYNC) > 0,
      noTLS: (flags & MDB_NOTLS) > 0,
      noLock: (flags & MDB_NOLOCK) > 0,
      noReadAhead: (flags & MDB_NORDAHEAD) > 0,
      noMemInit: (flags & MDB_NOMEMINIT) > 0,
      prevSnapshot: (flags & MDB_PREVSNAPSHOT) > 0,
    };
  }

  getPath(): string {
    if (!this.isOpen) throw dbNotOpen();
    const rc = lmdb.ffi_env_get_path(this.env, this.dbData.byteArray);
    if (rc) throw DbError.fromCode(rc);
    return decoder.decode(this.dbData.data);
  }
}

async function main() {
  try {
    log.info({ version: Environment.getVersionString() });
    const dbEnv = new Environment();
    log.info({
      maxKeySize: dbEnv.getMaxKeySize(),
      maxReaders: dbEnv.getMaxReaders(),
    });
    await dbEnv.open(".testdb");
    log.info({ stat: dbEnv.stat() });
    log.info({ info: dbEnv.info() });
    log.info({ path: dbEnv.getPath() });
    log.info("done!");
  } catch (err) {
    log.error(err);
  }
}

if (import.meta.main) main();
