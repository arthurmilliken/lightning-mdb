"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CursorOp = exports.PutFlag = exports.DbFlag = exports.EnvFlag = void 0;
var EnvFlag;
(function (EnvFlag) {
    EnvFlag[EnvFlag["FIXEDMAP"] = 1] = "FIXEDMAP";
    EnvFlag[EnvFlag["NOSUBDIR"] = 16384] = "NOSUBDIR";
    EnvFlag[EnvFlag["NOSYNC"] = 65536] = "NOSYNC";
    EnvFlag[EnvFlag["RDONLY"] = 131072] = "RDONLY";
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
    DbFlag[DbFlag["INTEGERKEY"] = 8] = "INTEGERKEY";
    DbFlag[DbFlag["DUPFIXED"] = 16] = "DUPFIXED";
    DbFlag[DbFlag["INTEGERDUP"] = 32] = "INTEGERDUP";
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
var CursorOp;
(function (CursorOp) {
    CursorOp[CursorOp["First"] = 0] = "First";
    CursorOp[CursorOp["FirstDup"] = 1] = "FirstDup"; /* dupsort */
    CursorOp[CursorOp["GetBoth"] = 2] = "GetBoth"; /* dupsort */
    CursorOp[CursorOp["GetBothRange"] = 3] = "GetBothRange"; /* dupsort */
    CursorOp[CursorOp["GetCurrent"] = 4] = "GetCurrent";
    CursorOp[CursorOp["GetMultiple"] = 5] = "GetMultiple"; /* dupfixed */
    CursorOp[CursorOp["Last"] = 6] = "Last";
    CursorOp[CursorOp["LastDup"] = 7] = "LastDup"; /* dupsort */
    CursorOp[CursorOp["Next"] = 8] = "Next";
    CursorOp[CursorOp["NextDup"] = 9] = "NextDup"; /* dupsort */
    CursorOp[CursorOp["NextMultiple"] = 10] = "NextMultiple"; /* dupfixed */
    CursorOp[CursorOp["NextNoDup"] = 11] = "NextNoDup"; /* dupsort */
    CursorOp[CursorOp["Prev"] = 12] = "Prev";
    CursorOp[CursorOp["PrevDup"] = 13] = "PrevDup"; /* dupsort */
    CursorOp[CursorOp["PrevNoDup"] = 14] = "PrevNoDup"; /* dupsort */
    CursorOp[CursorOp["Set"] = 15] = "Set";
    CursorOp[CursorOp["SetKey"] = 16] = "SetKey";
    CursorOp[CursorOp["SetRange"] = 17] = "SetRange";
    CursorOp[CursorOp["PrevMultiple"] = 18] = "PrevMultiple"; /* dupfixed */
})(CursorOp = exports.CursorOp || (exports.CursorOp = {}));
//# sourceMappingURL=types.js.map