"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Cursor = void 0;
const binding_1 = require("./binding");
const constants_1 = require("./constants");
const environment_1 = require("./environment");
const notFound = "Item not found";
class Cursor {
    constructor(txnp, dbi, keyType) {
        this._cursorp = binding_1.lmdb.cursor_open(txnp, dbi);
        this._txnp = txnp;
        this._dbi = dbi;
        this._keyType = keyType;
        this._isOpen = true;
    }
    get cursorp() {
        return this._cursorp;
    }
    get txnp() {
        return this._txnp;
    }
    get dbi() {
        return this._dbi;
    }
    get isOpen() {
        return this._isOpen;
    }
    get keyType() {
        return this._keyType;
    }
    put(key, value) {
        throw new Error("Method not implemented.");
    }
    del() {
        throw new Error("Method not implemented.");
    }
    decodeKey(keyBuf) {
        if (this.keyType === "Buffer")
            return keyBuf;
        if (this.keyType === "string")
            return keyBuf.toString();
        if (this.keyType === "number")
            return Number(keyBuf.readBigUInt64BE());
        throw new Error(`Unknown keyType: ${this.keyType}`);
    }
    key() {
        this.assertOpen();
        const result = binding_1.lmdb.cursor_get({
            cursorp: this._cursorp,
            op: constants_1.CursorOp.GET_CURRENT,
            returnKey: true,
        });
        if (!result || !result.key)
            throw new Error(notFound);
        return this.decodeKey(result.key);
    }
    value(zeroCopy = false) {
        this.assertOpen();
        const result = binding_1.lmdb.cursor_get({
            cursorp: this.cursorp,
            op: constants_1.CursorOp.GET_CURRENT,
            returnValue: true,
            zeroCopy,
        });
        if (!result?.value)
            throw new Error(notFound);
        return result.value;
    }
    asString() {
        return this.value().toString();
    }
    asNumber() {
        return this.value().readDoubleBE();
    }
    asBoolean() {
        return this.value().readUInt8() ? true : false;
    }
    item(zeroCopy = false) {
        this.assertOpen();
        const result = binding_1.lmdb.cursor_get({
            cursorp: this.cursorp,
            op: constants_1.CursorOp.GET_CURRENT,
            returnKey: true,
            returnValue: true,
            zeroCopy,
        });
        if (!result)
            throw new Error(notFound);
        return {
            key: result.key ? this.decodeKey(result.key) : undefined,
            value: result.value || undefined,
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
            key,
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
            key,
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
        this.assertOpen();
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
    const txn2 = env.beginTxn(false);
    console.log({ a: db.getString("a", txn2), txn2: txn2.txnp });
    const txn3 = env.beginTxn(false);
    console.log({ b: db.getString("b", txn3), txn3: txn3.txnp });
    const txn4 = env.beginTxn(false);
    console.log({ c: db.getString("c", txn4), txn4: txn4.txnp });
    console.log(env.readerList().join());
    txn.commit();
    txn2.abort();
    txn3.abort();
    txn4.abort();
    db.close();
    env.close();
}
if (require.main === module)
    main();
//# sourceMappingURL=cursor.js.map