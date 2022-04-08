export declare const MDB_CP_COMPACT = 1;
export declare const MDB_RDONLY = 131072;
export declare enum EnvFlag {
    FIXEDMAP = 1,
    NOSUBDIR = 16384,
    NOSYNC = 65536,
    RDONLY,
    NOMETASYNC = 262144,
    WRITEMAP = 524288,
    MAPASYNC = 1048576,
    NOTLS = 2097152,
    NOLOCK = 4194304,
    NORDAHEAD = 8388608,
    NOMEMINIT = 16777216
}
export declare enum DbFlag {
    REVERSEKEY = 2,
    /** use sorted duplicates */
    DUPSORT = 4,
    DUPFIXED = 16,
    REVERSEDUP = 64,
    CREATE = 262144
}
export declare enum PutFlag {
    NOOVERWRITE = 16,
    NODUPDATA = 32,
    /** For mdb_cursor_put: overwrite the current key/data pair */
    CURRENT = 64,
    RESERVE = 65536,
    APPEND = 131072,
    APPENDDUP = 262144,
    MULTIPLE = 524288
}
export declare enum RC {
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
    LAST_ERRCODE = -30780
}
export declare enum CursorOp {
    FIRST = 0,
    FIRST_DUP = 1,
    GET_BOTH = 2,
    GET_BOTH_RANGE = 3,
    GET_CURRENT = 4,
    GET_MULTIPLE = 5,
    LAST = 6,
    LAST_DUP = 7,
    NEXT = 8,
    NEXT_DUP = 9,
    NEXT_MULTIPLE = 10,
    NEXT_NODUP = 11,
    PREV = 12,
    PREV_DUP = 13,
    PREV_NODUP = 14,
    SET = 15,
    SET_KEY = 16,
    SET_RANGE = 17,
    PREV_MULTIPLE = 18
}
