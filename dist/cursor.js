"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Cursor = void 0;
const binding_1 = require("./binding");
const constants_1 = require("./constants");
const environment_1 = require("./environment");
const notFound = "Item not found";
class Cursor {
    constructor(txn, db) {
        this._isOpen = true;
        this._cursorp = binding_1.lmdb.cursor_open(txn.txnp, db.dbi);
        this.txn = txn;
        this.db = db;
    }
    get cursorp() {
        return this._cursorp;
    }
    get isOpen() {
        return this._isOpen;
    }
    put(key, value) {
        throw new Error("Method not implemented.");
    }
    del() {
        throw new Error("Method not implemented.");
    }
    key() {
        this.assertOpen();
        const result = binding_1.lmdb.cursor_get({
            cursorp: this._cursorp,
            op: constants_1.CursorOp.GET_CURRENT,
            includeKey: true,
        });
        if (!result || !result.key)
            throw new Error(notFound);
        return this.db.decodeKey(result.key);
    }
    keyBuffer() {
        this.assertOpen();
        const result = binding_1.lmdb.cursor_get({
            cursorp: this._cursorp,
            op: constants_1.CursorOp.GET_CURRENT,
            includeKey: true,
        });
        if (!result || !result.key)
            throw new Error(notFound);
        return result.key;
    }
    value(zeroCopy = false) {
        this.assertOpen();
        const result = binding_1.lmdb.cursor_get({
            cursorp: this.cursorp,
            op: constants_1.CursorOp.GET_CURRENT,
            includeValue: true,
            zeroCopy,
        });
        if (!result?.value)
            throw new Error(notFound);
        return result.value;
    }
    /** @returns current value as string */
    asString() {
        return this.value().toString();
    }
    /** @returns current value as number */
    asNumber() {
        return this.value().readDoubleBE();
    }
    /** @returns current value as boolean */
    asBoolean() {
        return this.value().readUInt8() ? true : false;
    }
    /** @returns current key (as Buffer) and value (as Buffer) */
    rawItem(includeKey = true, includeValue = true, zeroCopy = false) {
        this.assertOpen();
        const result = binding_1.lmdb.cursor_get({
            cursorp: this.cursorp,
            op: constants_1.CursorOp.GET_CURRENT,
            includeKey,
            includeValue,
            zeroCopy,
        });
        if (!result)
            throw new Error(notFound);
        return {
            key: result.key,
            value: result.value,
        };
    }
    item(includeValue = true, zeroCopy = false) {
        const bufItem = this.rawItem(includeValue, zeroCopy);
        return {
            key: bufItem.key ? this.db.decodeKey(bufItem.key) : undefined,
            value: bufItem.value,
        };
    }
    stringItem() {
        const item = this.item();
        return {
            key: item.key,
            value: item.value?.toString(),
        };
    }
    numberItem() {
        const item = this.item();
        return {
            key: item.key,
            value: item.value?.readDoubleBE(),
        };
    }
    booleanItem() {
        const item = this.item();
        return {
            key: item.key,
            value: item.value?.readUInt8() ? true : false,
        };
    }
    first() {
        this.assertOpen();
        const result = binding_1.lmdb.cursor_get({
            cursorp: this.cursorp,
            op: constants_1.CursorOp.FIRST,
        });
        if (!result)
            return false;
        else
            return true;
    }
    prev(skip = 0) {
        this.assertOpen();
        while (skip-- >= 0) {
            const result = binding_1.lmdb.cursor_get({
                cursorp: this.cursorp,
                op: constants_1.CursorOp.PREV,
            });
            if (!result)
                return false;
        }
        return true;
    }
    next(skip = 0) {
        this.assertOpen();
        while (skip-- >= 0) {
            const result = binding_1.lmdb.cursor_get({
                cursorp: this.cursorp,
                op: constants_1.CursorOp.NEXT,
            });
            if (!result)
                return false;
        }
        return true;
    }
    last() {
        this.assertOpen();
        const result = binding_1.lmdb.cursor_get({
            cursorp: this.cursorp,
            op: constants_1.CursorOp.LAST,
        });
        if (!result)
            return false;
        else
            return true;
    }
    find(key) {
        this.assertOpen();
        const result = binding_1.lmdb.cursor_get({
            cursorp: this.cursorp,
            op: constants_1.CursorOp.SET_KEY,
            key: this.db.encodeKey(key),
        });
        if (!result)
            return false;
        else
            return true;
    }
    findNext(key) {
        this.assertOpen();
        const result = binding_1.lmdb.cursor_get({
            cursorp: this.cursorp,
            op: constants_1.CursorOp.SET_RANGE,
            key: this.db.encodeKey(key),
        });
        if (!result)
            return false;
        else
            return true;
    }
    assertOpen() {
        if (!this.isOpen)
            throw new Error("Cursor is already closed");
    }
    close() {
        if (!this.isOpen)
            return;
        binding_1.lmdb.cursor_close(this.cursorp);
        this._isOpen = false;
    }
    renew(txn) {
        if (this.isOpen) {
            this.close();
        }
        binding_1.lmdb.cursor_renew(txn.txnp, this.cursorp);
        this._isOpen = true;
    }
}
exports.Cursor = Cursor;
async function main() {
    console.log("hello from cursor.ts!");
    const env = await environment_1.openEnv(".testdb");
    const db = env.openDB(null);
    const txn = env.beginTxn();
    db.clear(txn);
    db.put("a", "apple sunday", txn);
    db.put("b", "banana sunday", txn);
    db.put("c", "cherry sunday", txn);
    db.put("d", "durian sunday", txn);
    db.put("e", "enchilada sunday", txn);
    db.put("f", "faux gras sunday", txn);
    const cursor = db.cursor(txn);
    while (cursor.next()) {
        const item = cursor.stringItem();
        console.log({
            m: "cursor.next()",
            key: item.key,
            value: item.value,
        });
    }
    txn.commit();
    db.close();
    env.close();
}
if (require.main === module)
    main();
//# sourceMappingURL=cursor.js.map