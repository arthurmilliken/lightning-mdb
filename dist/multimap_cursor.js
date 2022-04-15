"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultimapCursor = void 0;
const cursor_1 = require("./cursor");
class MultimapCursor extends cursor_1.Cursor {
    firstDup() {
        throw new Error("Method not implemented.");
    }
    findDup(key, value) {
        throw new Error("Method not implemented.");
    }
    findNextDup(key, value) {
        throw new Error("Method not implemented.");
    }
    currentPage() {
        throw new Error("Method not implemented.");
    }
    lastDup() {
        throw new Error("Method not implemented.");
    }
    nextDup(skip = 0) {
        throw new Error("Method not implemented.");
    }
    nextPage(skip = 0) {
        throw new Error("Method not implemented.");
    }
    nextKey(skip = 0) {
        throw new Error("Method not implemented.");
    }
    prevDup(skip = 0) {
        throw new Error("Method not implemented.");
    }
    prevKey(skip = 0) {
        throw new Error("Method not implemented.");
    }
    prevPage(skip = 0) {
        throw new Error("Method not implemented.");
    }
}
exports.MultimapCursor = MultimapCursor;
//# sourceMappingURL=multimap_cursor.js.map