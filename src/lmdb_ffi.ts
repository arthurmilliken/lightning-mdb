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

export const FLAGS_OFF = 0;
export const FLAGS_ON = 1;
export const SYNC_FORCE = 1;
export const SYNC_DONT_FORCE = 0;

export enum op {
  FIRST = 0 /** Position at first key/data item */,
  FIRST_DUP /** Position at first data item of current key. Only for #MDB_DUPSORT */,
  GET_BOTH /** Position at key/data pair. Only for #MDB_DUPSORT */,
  GET_BOTH_RANGE /** position at key, nearest data. Only for #DUPSORT */,
  GET_CURRENT /** Return key/data at current cursor position */,
  GET_MULTIPLE /** Return up to a page of duplicate data items from current cursor position.
                   Move cursor to prepare for #MDB_NEXT_MULTIPLE. Only for #MDB_DUPFIXED */,
  LAST /** Position at last key/data item */,
  LAST_DUP /** Position at last data item of current key. Only for #MDB_DUPSORT */,
  NEXT /** Position at next data item */,
  NEXT_DUP /** Position at next data item of current key. Only for #MDB_DUPSORT */,
  NEXT_MULTIPLE /** Return up to a page of duplicate data items from next cursor position.
                    Move cursor to prepare for #MDB_NEXT_MULTIPLE. Only for #MDB_DUPFIXED */,
  NEXT_NODUP /** Position at first data item of next key */,
  PREV /** Position at previous data item */,
  PREV_DUP /** Position at previous data item of current key. Only for #MDB_DUPSORT */,
  PREV_NODUP /** Position at last data item of previous key */,
  SET /** Position at specified key */,
  SET_KEY /** Position at specified key, return key + data */,
  SET_RANGE /** Position at first key greater than or equal to specified key. */,
  PREV_MULTIPLE /** Position at previous page and return up to a page of duplicate data items.
                    Only for #MDB_DUPFIXED */,
}

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

const libName = `./build/lib/liblmdb_ffi.${libSuffix}`;
// Open library and define exported symbols
const dylib = Deno.dlopen(libName, {
  ffi_version: {
    parameters: ["pointer", "pointer", "pointer"],
    result: "pointer",
  },
  ffi_strerror: {
    parameters: ["i32"],
    result: "pointer",
  },
  ffi_env_create: {
    parameters: ["pointer"],
    result: "i32",
  },
  ffi_env_open: {
    parameters: ["pointer", "pointer", "u32", "u32"],
    result: "i32",
  },
  ffi_env_copy: {
    parameters: ["pointer", "pointer"],
    result: "i32",
    nonblocking: true,
  },
  ffi_env_copyfd: {
    parameters: ["pointer", "i32"],
    result: "i32",
    nonblocking: true,
  },
  ffi_env_copy2: {
    parameters: ["pointer", "pointer", "u32"],
    result: "i32",
    nonblocking: true,
  },
  ffi_env_copyfd2: {
    parameters: ["pointer", "i32", "u32"],
    result: "i32",
    nonblocking: true,
  },
  ffi_env_stat: {
    parameters: ["pointer", "pointer"],
    result: "i32",
  },
  ffi_env_info: {
    parameters: ["pointer", "pointer"],
    result: "i32",
  },
  ffi_env_sync: {
    parameters: ["pointer", "i32"],
    result: "i32",
  },
  ffi_env_close: {
    parameters: ["pointer"],
    result: "void",
  },
  ffi_env_set_flags: {
    parameters: ["pointer", "u32", "i32"],
    result: "i32",
  },
  ffi_env_get_flags: {
    parameters: ["pointer", "pointer"],
    result: "i32",
  },
  ffi_env_get_path: {
    parameters: ["pointer", "pointer"],
    result: "i32",
  },
  ffi_env_get_fd: {
    parameters: ["pointer", "pointer"],
    result: "i32",
  },
  ffi_env_set_mapsize: {
    parameters: ["pointer", "usize"],
    result: "i32",
  },
  ffi_env_set_maxreaders: {
    parameters: ["pointer", "u32"],
    result: "i32",
  },
  ffi_env_get_maxreaders: {
    parameters: ["pointer", "pointer"],
    result: "i32",
  },
  ffi_env_set_maxdbs: {
    parameters: ["pointer", "u32"],
    result: "i32",
  },
  ffi_env_get_maxkeysize: {
    parameters: ["pointer"],
    result: "i32",
  },
  ffi_env_set_userctx: {
    parameters: ["pointer", "pointer"],
    result: "i32",
  },
  ffi_env_get_userctx: {
    parameters: ["pointer"],
    result: "pointer",
  },
  ffi_txn_begin: {
    parameters: ["pointer", "pointer", "u32", "pointer"],
    result: "i32",
  },
  ffi_txn_env: {
    parameters: ["pointer"],
    result: "u64",
  },
  ffi_txn_id: {
    parameters: ["pointer"],
    result: "usize",
  },
  ffi_txn_commit: {
    parameters: ["pointer"],
    result: "i32",
  },
  ffi_txn_abort: {
    parameters: ["pointer"],
    result: "void",
  },
  ffi_dbi_open: {
    parameters: ["pointer", "pointer", "u32", "pointer"],
    result: "i32",
  },
  ffi_stat: {
    parameters: ["pointer", "u32", "pointer"],
    result: "i32",
  },
  ffi_dbi_flags: {
    parameters: ["pointer", "u32", "pointer"],
    result: "i32",
  },
  ffi_dbi_close: {
    parameters: ["pointer", "u32"],
    result: "void",
  },
  ffi_drop: {
    parameters: ["pointer", "u32", "u32"],
    result: "i32",
  },
  ffi_get: {
    parameters: ["pointer", "u32", "pointer", "pointer"],
    result: "i32",
  },
  ffi_put: {
    parameters: ["pointer", "u32", "pointer", "pointer", "u32"],
    result: "i32",
  },
  ffi_del: {
    parameters: ["pointer", "u32", "pointer", "pointer"],
    result: "i32",
  },
  ffi_cursor_open: {
    parameters: ["pointer", "u32", "pointer"],
    result: "i32",
  },
  ffi_cursor_close: {
    parameters: ["pointer"],
    result: "void",
  },
  ffi_cursor_renew: {
    parameters: ["pointer", "pointer"],
    result: "i32",
  },
  ffi_cursor_txn: {
    parameters: ["pointer"],
    result: "u64",
  },
  ffi_cursor_dbi: {
    parameters: ["pointer"],
    result: "i32",
  },
  ffi_cursor_get: {
    parameters: ["pointer", "pointer", "pointer", "u32"],
    result: "i32",
  },
  ffi_cursor_put: {
    parameters: ["pointer", "pointer", "pointer", "u32"],
    result: "i32",
  },
  ffi_cursor_del: {
    parameters: ["pointer", "u32"],
    result: "i32",
  },
  ffi_cursor_count: {
    parameters: ["pointer", "pointer"],
    result: "i32",
  },
  ffi_cmp: {
    parameters: ["pointer", "u32", "pointer", "pointer"],
    result: "i32",
  },
  ffi_dcmp: {
    parameters: ["pointer", "u32", "pointer", "pointer"],
    result: "i32",
  },
  ffi_reader_check: {
    parameters: ["pointer", "pointer"],
    result: "i32",
  },
});

export const lmdb = dylib.symbols;
