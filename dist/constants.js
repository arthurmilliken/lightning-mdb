"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CursorOp = exports.RC = exports.PutFlag = exports.DbFlag = exports.EnvFlag = exports.MDB_RDONLY = exports.MDB_CP_COMPACT = void 0;
exports.MDB_CP_COMPACT = 0x01;
exports.MDB_RDONLY = 0x20000;
var EnvFlag;
(function (EnvFlag) {
    EnvFlag[EnvFlag["FIXEDMAP"] = 1] = "FIXEDMAP";
    EnvFlag[EnvFlag["NOSUBDIR"] = 16384] = "NOSUBDIR";
    EnvFlag[EnvFlag["NOSYNC"] = 65536] = "NOSYNC";
    EnvFlag[EnvFlag["RDONLY"] = exports.MDB_RDONLY] = "RDONLY";
    EnvFlag[EnvFlag["NOMETASYNC"] = 262144] = "NOMETASYNC";
    EnvFlag[EnvFlag["WRITEMAP"] = 524288] = "WRITEMAP";
    EnvFlag[EnvFlag["MAPASYNC"] = 1048576] = "MAPASYNC";
    EnvFlag[EnvFlag["NOTLS"] = 2097152] = "NOTLS";
    EnvFlag[EnvFlag["NOLOCK"] = 4194304] = "NOLOCK";
    EnvFlag[EnvFlag["NORDAHEAD"] = 8388608] = "NORDAHEAD";
    EnvFlag[EnvFlag["NOMEMINIT"] = 16777216] = "NOMEMINIT";
})(EnvFlag = exports.EnvFlag || (exports.EnvFlag = {}));
var DbFlag;
(function (DbFlag) {
    DbFlag[DbFlag["REVERSEKEY"] = 2] = "REVERSEKEY";
    /** use sorted duplicates */
    DbFlag[DbFlag["DUPSORT"] = 4] = "DUPSORT";
    // INTEGERKEY = 0x08,
    DbFlag[DbFlag["DUPFIXED"] = 16] = "DUPFIXED";
    // INTEGERDUP = 0x20,
    DbFlag[DbFlag["REVERSEDUP"] = 64] = "REVERSEDUP";
    DbFlag[DbFlag["CREATE"] = 262144] = "CREATE";
})(DbFlag = exports.DbFlag || (exports.DbFlag = {}));
var PutFlag;
(function (PutFlag) {
    PutFlag[PutFlag["NOOVERWRITE"] = 16] = "NOOVERWRITE";
    PutFlag[PutFlag["NODUPDATA"] = 32] = "NODUPDATA";
    /** For mdb_cursor_put: overwrite the current key/data pair */
    PutFlag[PutFlag["CURRENT"] = 64] = "CURRENT";
    PutFlag[PutFlag["RESERVE"] = 65536] = "RESERVE";
    PutFlag[PutFlag["APPEND"] = 131072] = "APPEND";
    PutFlag[PutFlag["APPENDDUP"] = 262144] = "APPENDDUP";
    PutFlag[PutFlag["MULTIPLE"] = 524288] = "MULTIPLE";
})(PutFlag = exports.PutFlag || (exports.PutFlag = {}));
var RC;
(function (RC) {
    RC[RC["SUCCESS"] = 0] = "SUCCESS";
    /** key/data pair already exists */
    RC[RC["KEYEXIST"] = -30799] = "KEYEXIST";
    /** key/data pair not found (EOF) */
    RC[RC["NOTFOUND"] = -30798] = "NOTFOUND";
    /** Requested page not found - this usually indicates corruption */
    RC[RC["PAGE_NOTFOUND"] = -30797] = "PAGE_NOTFOUND";
    /** Located page was wrong type */
    RC[RC["CORRUPTED"] = -30796] = "CORRUPTED";
    /** Update of meta page failed or environment had fatal error */
    RC[RC["PANIC"] = -30795] = "PANIC";
    /** Environment version mismatch */
    RC[RC["VERSION_MISMATCH"] = -30794] = "VERSION_MISMATCH";
    /** File is not a valid LMDB file */
    RC[RC["INVALID"] = -30793] = "INVALID";
    /** Environment mapsize reached */
    RC[RC["MAP_FULL"] = -30792] = "MAP_FULL";
    /** Environment maxdbs reached */
    RC[RC["DBS_FULL"] = -30791] = "DBS_FULL";
    /** Environment maxreaders reached */
    RC[RC["READERS_FULL"] = -30790] = "READERS_FULL";
    /** Too many TLS keys in use - Windows only */
    RC[RC["TLS_FULL"] = -30789] = "TLS_FULL";
    /** Txn has too many dirty pages */
    RC[RC["TXN_FULL"] = -30788] = "TXN_FULL";
    /** Cursor stack too deep - internal error */
    RC[RC["CURSOR_FULL"] = -30787] = "CURSOR_FULL";
    /** Page has not enough space - internal error */
    RC[RC["PAGE_FULL"] = -30786] = "PAGE_FULL";
    /** Database contents grew beyond environment mapsize */
    RC[RC["MAP_RESIZED"] = -30785] = "MAP_RESIZED";
    /** Operation and DB incompatible, or DB type changed. This can mean:
     *	- The operation expects a DUPSORT / DUPFIXED database.
     *	- Opening a named DB when the unnamed DB has DUPSORT / INTEGERKEY.
     *	- Accessing a data record as a database, or vice versa.
     *	- The database was dropped and recreated with different flags.
     */
    RC[RC["INCOMPATIBLE"] = -30784] = "INCOMPATIBLE";
    /** Invalid reuse of reader locktable slot */
    RC[RC["BAD_RSLOT"] = -30783] = "BAD_RSLOT";
    /** Transaction must abort, has a child, or is invalid */
    RC[RC["BAD_TXN"] = -30782] = "BAD_TXN";
    /** Unsupported size of key/DB name/data, or wrong DUPFIXED size */
    RC[RC["BAD_VALSIZE"] = -30781] = "BAD_VALSIZE";
    /** The specified DBI was changed unexpectedly */
    RC[RC["BAD_DBI"] = -30780] = "BAD_DBI";
    /** The last defined error code */
    RC[RC["LAST_ERRCODE"] = -30780] = "LAST_ERRCODE";
})(RC = exports.RC || (exports.RC = {}));
var CursorOp;
(function (CursorOp) {
    CursorOp[CursorOp["FIRST"] = 0] = "FIRST";
    CursorOp[CursorOp["FIRST_DUP"] = 1] = "FIRST_DUP"; /* dupsort only */
    CursorOp[CursorOp["GET_BOTH"] = 2] = "GET_BOTH"; /* dupsort only */
    CursorOp[CursorOp["GET_BOTH_RANGE"] = 3] = "GET_BOTH_RANGE"; /* dupsort only */
    CursorOp[CursorOp["GET_CURRENT"] = 4] = "GET_CURRENT";
    CursorOp[CursorOp["GET_MULTIPLE"] = 5] = "GET_MULTIPLE"; /* dupfixed only */
    CursorOp[CursorOp["LAST"] = 6] = "LAST";
    CursorOp[CursorOp["LAST_DUP"] = 7] = "LAST_DUP"; /* dupsort only */
    CursorOp[CursorOp["NEXT"] = 8] = "NEXT";
    CursorOp[CursorOp["NEXT_DUP"] = 9] = "NEXT_DUP"; /* dupsort only */
    CursorOp[CursorOp["NEXT_MULTIPLE"] = 10] = "NEXT_MULTIPLE"; /* dupfixed only */
    CursorOp[CursorOp["NEXT_NODUP"] = 11] = "NEXT_NODUP"; /* dupsort only */
    CursorOp[CursorOp["PREV"] = 12] = "PREV";
    CursorOp[CursorOp["PREV_DUP"] = 13] = "PREV_DUP"; /* dupsort only */
    CursorOp[CursorOp["PREV_NODUP"] = 14] = "PREV_NODUP"; /* dupsort only */
    CursorOp[CursorOp["SET"] = 15] = "SET";
    CursorOp[CursorOp["SET_KEY"] = 16] = "SET_KEY";
    CursorOp[CursorOp["SET_RANGE"] = 17] = "SET_RANGE";
    CursorOp[CursorOp["PREV_MULTIPLE"] = 18] = "PREV_MULTIPLE"; /* dupfixed only */
})(CursorOp = exports.CursorOp || (exports.CursorOp = {}));
//# sourceMappingURL=constants.js.map