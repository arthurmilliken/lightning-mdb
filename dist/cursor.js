"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Cursor = exports.CursorItem = void 0;
const environment_1 = require("./environment");
class CursorItem {
    constructor(cursor) {
        this._cursor = cursor;
    }
    get cursor() {
        return this._cursor;
    }
    key() {
        throw new Error("Method not implemented.");
    }
    value() {
        throw new Error("Method not implemented.");
    }
    valueString() {
        throw new Error("Method not implemented.");
    }
    valueNumber() {
        throw new Error("Method not implemented.");
    }
    valueBoolean() {
        throw new Error("Method not implemented.");
    }
    detach() {
        throw new Error("Method not implemented.");
    }
}
exports.CursorItem = CursorItem;
class Cursor {
    constructor(txnp, dbi, options) {
        this.cursorp = 0n;
        this.txnp = txnp;
        this.dbi = dbi;
        this.options = Object.assign({ keyType: "string" }, options);
    }
    key() {
        throw new Error("Method not implemented.");
    }
    value() {
        throw new Error("Method not implemented.");
    }
    valueString() {
        throw new Error("Method not implemented.");
    }
    valueNumber() {
        throw new Error("Method not implemented.");
    }
    valueBoolean() {
        throw new Error("Method not implemented.");
    }
    detach() {
        throw new Error("Method not implemented.");
    }
    close() {
        throw new Error("Method not implemented.");
    }
    renew(txn) {
        throw new Error("Method not implemented.");
    }
    put(key, value, flags) {
        throw new Error("Method not implemented.");
    }
    del(noDupData) {
        throw new Error("Method not implemented.");
    }
    first() {
        throw new Error("Method not implemented.");
    }
    current() {
        throw new Error("Method not implemented.");
    }
    last() {
        throw new Error("Method not implemented.");
    }
    next(steps) {
        throw new Error("Method not implemented.");
    }
    prev(steps) {
        throw new Error("Method not implemented.");
    }
    find(key) {
        throw new Error("Method not implemented.");
    }
    findEntry(key) {
        throw new Error("Method not implemented.");
    }
    findNext(key) {
        throw new Error("Method not implemented.");
    }
    iterator() {
        throw new Error("Method not implemented.");
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