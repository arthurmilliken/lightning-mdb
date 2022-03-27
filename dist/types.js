"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asBoolean = exports.asNumber = exports.asString = exports.value = exports.key = void 0;
function key(k) {
    throw new Error();
}
exports.key = key;
function value(v) {
    throw new Error();
}
exports.value = value;
function asString(buf) {
    throw new Error();
}
exports.asString = asString;
function asNumber(buf) {
    throw new Error();
}
exports.asNumber = asNumber;
function asBoolean(buf) {
    throw new Error();
}
exports.asBoolean = asBoolean;
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
})(CursorOp || (CursorOp = {}));
//# sourceMappingURL=types.js.map