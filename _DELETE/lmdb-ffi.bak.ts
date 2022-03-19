import * as log from "https://deno.land/std@0.129.0/log/mod.ts";

/** mdb_env Environment Flags */

/** mmap at a fixed address (experimental) */
export const MDB_FIXEDMAP = 0x01;
/** no environment directory */
export const MDB_NOSUBDIR = 0x4000;
/** don't fsync after commit */
export const MDB_NOSYNC = 0x10000;
/** read only */
export const MDB_RDONLY = 0x20000;
/** don't fsync metapage after commit */
export const MDB_NOMETASYNC = 0x40000;
/** use writable mmap */
export const MDB_WRITEMAP = 0x80000;
/** use asynchronous msync when #MDB_WRITEMAP is used */
export const MDB_MAPASYNC = 0x100000;
/** tie reader locktable slots to #MDB_txn objects instead of to threads */
export const MDB_NOTLS = 0x200000;
/** don't do any locking, caller must manage their own locks */
export const MDB_NOLOCK = 0x400000;
/** don't do readahead (no effect on Windows) */
export const MDB_NORDAHEAD = 0x800000;
/** don't initialize malloc'd memory before writing to datafile */
export const MDB_NOMEMINIT = 0x1000000;
/** use the previous snapshot rather than the latest one */
export const MDB_PREVSNAPSHOT = 0x2000000;

/**	mdb_dbi_open	Database Flags */

/** use reverse string keys */
export const MDB_REVERSEKEY = 0x02;
/** use sorted duplicates */
export const MDB_DUPSORT = 0x04;
/** numeric keys in native byte order, either unsigned int or #mdb_size_t.
 *	(lmdb expects 32-bit int <= size_t <= 32/64-bit mdb_size_t.)
 *  The keys must all be of the same size. */
export const MDB_INTEGERKEY = 0x08;
/** with #MDB_DUPSORT, sorted dup items have fixed size */
export const MDB_DUPFIXED = 0x10;
/** with #MDB_DUPSORT, dups are #MDB_INTEGERKEY-style integers */
export const MDB_INTEGERDUP = 0x20;
/** with #MDB_DUPSORT, use reverse string dups */
export const MDB_REVERSEDUP = 0x40;
/** create DB if not already existing */
export const MDB_CREATE = 0x40000;

/**	mdb_put	Write Flags */

/** For put: Don't write if the key already exists. */
export const MDB_NOOVERWRITE = 0x10;
/** Only for #MDB_DUPSORT<br>
 * For put: don't write if the key and data pair already exist.<br>
 * For mdb_cursor_del: remove all duplicate data items.
 */
export const MDB_NODUPDATA = 0x20;
/** For mdb_cursor_put: overwrite the current key/data pair */
export const MDB_CURRENT = 0x40;
/** For put: Just reserve space for data, don't copy it. Return a
 * pointer to the reserved space.
 */
export const MDB_RESERVE = 0x10000;
/** Data is being appended, don't split full pages. */
export const MDB_APPEND = 0x20000;
/** Duplicate data is being appended, don't split full pages. */
export const MDB_APPENDDUP = 0x40000;
/** Store multiple data items in one call. Only for #MDB_DUPFIXED. */
export const MDB_MULTIPLE = 0x80000;

/** mdb_copy Copy Flags */

/** Compacting copy: Omit free space from copy, and renumber all
 * pages sequentially.
 */
export const MDB_CP_COMPACT = 0x01;

/** errors	Return Codes */

/**	Successful result */
export const MDB_SUCCESS = 0;
/** key/data pair already exists */
export const MDB_KEYEXIST = -30799;
/** key/data pair not found (EOF) */
export const MDB_NOTFOUND = -30798;
/** Requested page not found - this usually indicates corruption */
export const MDB_PAGE_NOTFOUND = -30797;
/** Located page was wrong type */
export const MDB_CORRUPTED = -30796;
/** Update of meta page failed or environment had fatal error */
export const MDB_PANIC = -30795;
/** Environment version mismatch */
export const MDB_VERSION_MISMATCH = -30794;
/** File is not a valid LMDB file */
export const MDB_INVALID = -30793;
/** Environment mapsize reached */
export const MDB_MAP_FULL = -30792;
/** Environment maxdbs reached */
export const MDB_DBS_FULL = -30791;
/** Environment maxreaders reached */
export const MDB_READERS_FULL = -30790;
/** Too many TLS keys in use - Windows only */
export const MDB_TLS_FULL = -30789;
/** Txn has too many dirty pages */
export const MDB_TXN_FULL = -30788;
/** Cursor stack too deep - internal error */
export const MDB_CURSOR_FULL = -30787;
/** Page has not enough space - internal error */
export const MDB_PAGE_FULL = -30786;
/** Database contents grew beyond environment mapsize */
export const MDB_MAP_RESIZED = -30785;
/** Operation and DB incompatible, or DB type changed. This can mean:
 *	- The operation expects an #MDB_DUPSORT / #MDB_DUPFIXED database.
 *	- Opening a named DB when the unnamed DB has #MDB_DUPSORT / #MDB_INTEGERKEY.
 *	- Accessing a data record as a database, or vice versa.
 *	- The database was dropped and recreated with different flags.
 */
export const MDB_INCOMPATIBLE = -30784;
/** Invalid reuse of reader locktable slot */
export const MDB_BAD_RSLOT = -30783;
/** Transaction must abort, has a child, or is invalid */
export const MDB_BAD_TXN = -30782;
/** Unsupported size of key/DB name/data, or wrong DUPFIXED size */
export const MDB_BAD_VALSIZE = -30781;
/** The specified DBI was changed unexpectedly */
export const MDB_BAD_DBI = -30780;
/** Unexpected problem - txn should abort */
export const MDB_PROBLEM = -30779;
/** The last defined error code */
export const MDB_LAST_ERRCODE = MDB_PROBLEM;

/** the directory specified by the path parameter doesn't exist. */
export const ENOENT = 2;
/** the user didn't have permission to access the environment files. */
export const EACCES = 13;
/** the environment was locked by another process. */
export const EAGAIN = 11;

const STAT_INCR = 8;
const STAT_RC = 0;
const STAT_PSIZE = 1;
const STAT_DEPTH = 2;
const STAT_BRANCH_PAGES = 3;
const STAT_LEAF_PAGES = 4;
const STAT_OVERFLOW_PAGES = 5;
const STAT_ENTRIES = 6;

const V_MAJOR_OFFSET = 0;
const V_MINOR_OFFSET = 8;
const V_PATCH_OFFSET = 16;
const V_VERSION_OFFSET = 24;

let libSuffix = "";
switch (Deno.build.os) {
  case "windows":
    libSuffix = "dll";
    break;
  case "darwin":
    libSuffix = "dylib";
    break;
  case "linux":
    libSuffix = "so";
    break;
}

const libName = `./build/lib/liblmdb-ffi.${libSuffix}`;
// Open library and define exported symbols
const dylib = Deno.dlopen(libName, {
  send: {
    parameters: ["pointer", "usize"],
    result: "void",
  },
  ffi_version: {
    parameters: [],
    result: "pointer",
  },
  ffi_strerror: {
    parameters: ["i32"],
    result: "pointer",
  },
  // Env functions
  ffi_env_create: {
    parameters: [],
    result: "pointer",
  },
  ffi_env_open: {
    parameters: ["pointer", "pointer", "usize", "u32", "u32"],
    result: "f64",
  },
  ffi_env_stat_create: {
    parameters: ["pointer"],
    result: "pointer",
  },
  ffi_env_stat_dispose: {
    parameters: ["pointer"],
    result: "void",
  },
  ffi_env_close: {
    parameters: ["pointer"],
    result: "void",
  },
  // Txn functions
  ffi_txn_begin: {
    parameters: ["pointer", "pointer", "u32"],
    result: "pointer",
  },
  ffi_txn_id: {
    parameters: ["pointer"],
    result: "f64",
  },
  ffi_txn_commit: {
    parameters: ["pointer"],
    result: "f64",
  },
  ffi_txn_abort: {
    parameters: ["pointer"],
    result: "void",
  },
  ffi_txn_reset: {
    parameters: ["pointer"],
    result: "void",
  },
  ffi_txn_renew: {
    parameters: ["pointer"],
    result: "f64",
  },
});

export const lib = dylib.symbols;

// send
const str = "I am a denosaur!";
const encoder = new TextEncoder();
let buf = encoder.encode(str);

lib.send(buf, buf.byteLength);

log.info({
  str,
  strlen: str.length,
  bytes: buf.byteLength,
  m: "after lib.send(buf)",
});

// ffi_version
const p = lib.ffi_version();
let v = new Deno.UnsafePointerView(p);
const major = v.getFloat64(V_MAJOR_OFFSET);
const minor = v.getFloat64(V_MINOR_OFFSET);
const patch = v.getFloat64(V_PATCH_OFFSET);
const version = v.getCString(V_VERSION_OFFSET);

log.info({ version, major, minor, patch });

// ffi_env_create
const env = lib.ffi_env_create();
let rc = new Deno.UnsafePointerView(env).getFloat64();
log.info({
  env: `0x${BigInt(env.value).toString(16)}`,
  rc,
  m: "after ffi_env_create()",
});

// ffi_env_open
const path = ".testdb";
buf = encoder.encode(path);
log.info({ path, m: "before ffi_env_open" });
rc = lib.ffi_env_open(env, buf, buf.byteLength, 0, 0o664);
if (rc !== MDB_SUCCESS) {
  const msg = new Deno.UnsafePointerView(lib.ffi_strerror(rc)).getCString();
  log.info({ path, rc, msg });
} else log.info("after ffi_env_open()");

// ffi_env_stat
const stat = lib.ffi_env_stat_create(env);
v = new Deno.UnsafePointerView(stat);
log.info({
  stat: {
    rc: v.getFloat64(STAT_RC * STAT_INCR),
    ms_psize: v.getFloat64(STAT_PSIZE * STAT_INCR),
    ms_depth: v.getFloat64(STAT_DEPTH * STAT_INCR),
    ms_branch_pages: v.getFloat64(STAT_BRANCH_PAGES * STAT_INCR),
    ms_leaf_pages: v.getFloat64(STAT_LEAF_PAGES * STAT_INCR),
    ms_overflow_pages: v.getFloat64(STAT_OVERFLOW_PAGES * STAT_INCR),
    ms_entries: v.getFloat64(STAT_ENTRIES * STAT_INCR),
  },
});
lib.ffi_env_stat_dispose(stat);

// ffi_txn_begin
// ffi_txn_child
// ffi_txn_id
// ffi_txn_commit
// ffi_txn_abort

// ffi_txn_reset
// ffi_txn_renew

// closeEnv
lib.ffi_env_close(env);
log.info("after ffi_env_close()");
