export declare const MDB_CP_COMPACT = 1;
export declare const MDB_RDONLY = 131072;
export declare enum SetFlags {
    OFF = 0,
    ON = 1
}
export declare enum EnvFlag {
    FIXEDMAP = 1,
    NOSUBDIR = 16384,
    NOSYNC = 65536,
    RDONLY = 131072,
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
    INTEGERKEY = 8,
    DUPFIXED = 16,
    INTEGERDUP = 32,
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
export declare enum CursorOp {
    First = 0,
    FirstDup = 1,
    GetBoth = 2,
    GetBothRange = 3,
    GetCurrent = 4,
    GetMultiple = 5,
    Last = 6,
    LastDup = 7,
    Next = 8,
    NextDup = 9,
    NextMultiple = 10,
    NextNoDup = 11,
    Prev = 12,
    PrevDup = 13,
    PrevNoDup = 14,
    Set = 15,
    SetKey = 16,
    SetRange = 17,
    PrevMultiple = 18
}
