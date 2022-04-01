export const MDB_CP_COMPACT = 0x01;
export const MDB_RDONLY = 0x20000;
export enum SetFlags {
  OFF = 0,
  ON = 1,
}

export enum EnvFlag {
  FIXEDMAP = 0x01,
  NOSUBDIR = 0x4000,
  NOSYNC = 0x10000,
  RDONLY = MDB_RDONLY,
  NOMETASYNC = 0x40000,
  WRITEMAP = 0x80000,
  MAPASYNC = 0x100000,
  NOTLS = 0x200000,
  NOLOCK = 0x400000,
  NORDAHEAD = 0x800000,
  NOMEMINIT = 0x1000000,
}

export enum DbFlag {
  REVERSEKEY = 0x02,
  /** use sorted duplicates */
  DUPSORT = 0x04,
  // INTEGERKEY = 0x08,
  DUPFIXED = 0x10,
  // INTEGERDUP = 0x20,
  REVERSEDUP = 0x40,
  CREATE = 0x40000,
}

export enum PutFlag {
  NOOVERWRITE = 0x10,
  NODUPDATA = 0x20,
  /** For mdb_cursor_put: overwrite the current key/data pair */
  CURRENT = 0x40,
  RESERVE = 0x10000,
  APPEND = 0x20000,
  APPENDDUP = 0x40000,
  MULTIPLE = 0x80000,
}

export enum RC {
  SUCCESS = 0,
  /** key/data pair already exists */
  KEYEXIST = -30799,
  /** key/data pair not found (EOF) */
  NOTFOUND = -30798,
  /** Requested page not found - this usually indicates corruption */
  PAGE_NOTFOUND = -30797,
  /** Located page was wrong type */
  CORRUPTED = -30796,
  /** Update of meta page failed or environment had fatal error */
  PANIC = -30795,
  /** Environment version mismatch */
  VERSION_MISMATCH = -30794,
  /** File is not a valid LMDB file */
  INVALID = -30793,
  /** Environment mapsize reached */
  MAP_FULL = -30792,
  /** Environment maxdbs reached */
  DBS_FULL = -30791,
  /** Environment maxreaders reached */
  READERS_FULL = -30790,
  /** Too many TLS keys in use - Windows only */
  TLS_FULL = -30789,
  /** Txn has too many dirty pages */
  TXN_FULL = -30788,
  /** Cursor stack too deep - internal error */
  CURSOR_FULL = -30787,
  /** Page has not enough space - internal error */
  PAGE_FULL = -30786,
  /** Database contents grew beyond environment mapsize */
  MAP_RESIZED = -30785,
  /** Operation and DB incompatible, or DB type changed. This can mean:
   *	- The operation expects a DUPSORT / DUPFIXED database.
   *	- Opening a named DB when the unnamed DB has DUPSORT / INTEGERKEY.
   *	- Accessing a data record as a database, or vice versa.
   *	- The database was dropped and recreated with different flags.
   */
  INCOMPATIBLE = -30784,
  /** Invalid reuse of reader locktable slot */
  BAD_RSLOT = -30783,
  /** Transaction must abort, has a child, or is invalid */
  BAD_TXN = -30782,
  /** Unsupported size of key/DB name/data, or wrong DUPFIXED size */
  BAD_VALSIZE = -30781,
  /** The specified DBI was changed unexpectedly */
  BAD_DBI = -30780,
  /** The last defined error code */
  LAST_ERRCODE = BAD_DBI,
}

export enum CursorOp {
  FIRST = 0,
  FIRST_DUP /* dupsort only */,
  GET_BOTH /* dupsort only */,
  GET_BOTH_RANGE /* dupsort only */,
  GET_CURRENT,
  GET_MULTIPLE /* dupfixed only */,
  LAST,
  LAST_DUP /* dupsort only */,
  NEXT,
  NEXT_DUP /* dupsort only */,
  NEXT_MULTIPLE /* dupfixed only */,
  NEXT_NODUP /* dupsort only */,
  PREV,
  PREV_DUP /* dupsort only */,
  PREV_NODUP /* dupsort only */,
  SET,
  SET_KEY,
  SET_RANGE,
  PREV_MULTIPLE /* dupfixed only */,
}
