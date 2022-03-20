import * as log from "https://deno.land/std@0.130.0/log/mod.ts";
import { ensureDir } from "https://deno.land/std@0.130.0/fs/mod.ts";
import { dirname } from "https://deno.land/std@0.130.0/path/mod.ts";
import {
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
  MDB_NOTLS,
  MDB_PREVSNAPSHOT,
  MDB_PROBLEM,
  MDB_RDONLY,
  MDB_WRITEMAP,
  op,
} from "./lmdb_ffi.ts";
import { DbValue } from "./dbvalue.ts";

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
  mapAsync?: boolean;
  noTLS?: boolean;
  noLock?: boolean;
  noReadAhead?: boolean;
  noMemInit?: boolean;
  prevSnapshot?: boolean;
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

class DbError extends Error {
  code: number;
  constructor(message: string, code: number = -1) {
    super(message);
    this.code = code;
  }
  static fromCode(code: number) {
    const message = Environment.errorMessage(code);
    return new DbError(message, code);
  }
}

function notImplemented() {
  return new Error("Not implemented");
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

  private static errors: Record<number, string> = {};
  static errorMessage(code: number): string {
    if (!Environment.errors[code]) {
      const errorPtr = lmdb.ffi_strerror(code);
      Environment.errors[code] =
        new Deno.UnsafePointerView(errorPtr).getCString() ||
        `Unknown error type (${code})`;
    }
    return Environment.errors[code];
  }

  // Instance behaviors

  options?: EnvOptions;
  env: BigUint64Array = new BigUint64Array(1);
  dbKey: DbValue = new DbValue();
  dbData: DbValue = new DbValue();

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

  setMaxReaders(readers: number): void {
    const rc = lmdb.ffi_env_set_maxreaders(this.env, readers);
    if (rc) throw DbError.fromCode(rc);
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
  }

  close(): void {
    lmdb.ffi_env_close(this.env);
  }

  async copy(path: string, compact = false) {
    await ensureDir(path);
    this.dbData.data = encoder.encode(path);
    const rc = await lmdb.ffi_env_copy2(
      this.env,
      this.dbData.byteArray,
      compact ? MDB_CP_COMPACT : 0
    );
    if (rc) throw DbError.fromCode(rc);
  }
}

if (import.meta.main) {
  (async function main() {
    try {
      log.info({ version: Environment.getVersionString() });
      const dbenv = new Environment();
      await dbenv.open(".testdb");
      await dbenv.copy(".testdb3");
      dbenv.close();
      log.info("done!");
    } catch (err) {
      log.error(err);
    }
  })();
}
