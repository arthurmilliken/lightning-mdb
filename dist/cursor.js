"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Cursor = void 0;
const binding_1 = require("./binding");
const constants_1 = require("./constants");
const database_1 = require("./database");
const environment_1 = require("./environment");
const transaction_1 = require("./transaction");
const notFound = "Item not found";
class Cursor {
    constructor(db, txn) {
        this._isOpen = true;
        this.ownsTxn = false;
        this.db = db;
        if (!txn) {
            this.txn = new transaction_1.Transaction(db.envp, true);
            this.ownsTxn = true;
        }
        else
            this.txn = txn;
        this._cursorp = binding_1.lmdb.cursor_open(this.txn.txnp, db.dbi);
    }
    get cursorp() {
        return this._cursorp;
    }
    get isOpen() {
        return this._isOpen;
    }
    /** Store `value` at `key`, and move the cursor to the position of the
     * inserted record */
    put(key, value, flags) {
        this.assertOpen();
        const _flags = (flags?.append ? constants_1.PutFlag.APPEND : 0) +
            (flags?.noOverwrite ? constants_1.PutFlag.NOOVERWRITE : 0) +
            (flags?.current ? constants_1.PutFlag.CURRENT : 0);
        binding_1.lmdb.cursor_put({
            cursorp: this.cursorp,
            key: this.db.encodeKey(key),
            value: this.db.encodeValue(value),
            flags: _flags,
        });
    }
    /** Reserve `size` bytes at `key`, move cursor to position of `key`, and
     * return an initialized Buffer which the caller can fill in before the
     * end of the transaction */
    reserve(key, size, flags) {
        this.assertOpen();
        const _flags = (flags?.append ? constants_1.PutFlag.APPEND : 0) +
            (flags?.noOverwrite ? constants_1.PutFlag.NOOVERWRITE : 0) +
            (flags?.current ? constants_1.PutFlag.CURRENT : 0);
        return binding_1.lmdb.cursor_reserve({
            cursorp: this.cursorp,
            key: this.db.encodeKey(key),
            size,
            flags: _flags,
        });
    }
    /** Remove database entry (key + value) at current cursor position */
    del() {
        this.assertOpen();
        binding_1.lmdb.cursor_del(this._cursorp);
    }
    /** @returns current key as Buffer */
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
    /** @returns current key */
    key() {
        return this.db.decodeKey(this.keyBuffer());
    }
    /** @returns current value as Buffer */
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
    /** @returns {CursorItem<K, Buffer>} at current cursor position */
    item(includeValue = true, zeroCopy = false) {
        const bufItem = this.rawItem(true, includeValue, zeroCopy);
        return {
            key: bufItem.key ? this.db.decodeKey(bufItem.key) : undefined,
            value: bufItem.value,
        };
    }
    /** @returns {DbItem<K, string>} at current cursor position */
    stringItem() {
        const item = this.item();
        return {
            key: item.key,
            value: item.value?.toString(),
        };
    }
    /** @returns {DbItem<K, number>} at current cursor position */
    numberItem() {
        const item = this.item();
        return {
            key: item.key,
            value: item.value?.readDoubleBE(),
        };
    }
    /** @returns {DbItem<K, boolean>} at current cursor position */
    booleanItem() {
        const item = this.item();
        return {
            key: item.key,
            value: item.value?.readUInt8() ? true : false,
        };
    }
    /** Move the cursor to the first key in database
     * @returns false if no key found, true otherwise */
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
    /** Move the cursor to the previous key
     * @param skip number of keys to skip
     * @returns false if no key found, true otherwise */
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
    /** Move the cursor to the next key
     * @param skip number of keys to skip
     * @returns false if no key found, true otherwise */
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
    /** Move the cursor to the last key in database
     * @returns false if no key found, true otherwise */
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
    /** Move the cursor to given key. If key does not exist, this function
     * will move the cursor to the next adjacent key and return false.
     * @returns true if key exists, false otherwise */
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
    /** Move the cursor to given key or next adjacent key
     * @returns false if no key found, true otherwise */
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
    /** Close this cursor. This must be called on all read-only cursors. */
    close() {
        if (!this.isOpen)
            return;
        binding_1.lmdb.cursor_close(this.cursorp);
        if (this.ownsTxn && this.txn.isOpen) {
            this.txn.abort();
        }
        this._isOpen = false;
    }
    /** Re-use a closed cursor with the given transaction. */
    renew(txn) {
        if (this.isOpen) {
            this.close();
        }
        binding_1.lmdb.cursor_renew(txn.txnp, this.cursorp);
        this._isOpen = true;
    }
    /** @returns an iterator over items (each item as CursorItem<K, Buffer>) */
    *getCursorItems(q, includeKey = true, includeValue = true) {
        // Set up navigation functions, based on q.reverse
        let first = q?.reverse ? this.last.bind(this) : this.first.bind(this);
        let next = q?.reverse ? this.prev.bind(this) : this.next.bind(this);
        let compare = (a, b) => {
            return this.db.compareBuffers(a, b, this.txn) * (q?.reverse ? -1 : 1);
        };
        let find = (start) => {
            if (q?.reverse) {
                if (!this.find(start))
                    return this.prev();
                else
                    return true;
            }
            else {
                return this.findNext(start);
            }
        };
        // Start iteration
        let found = 0;
        const endBuf = q?.end ? this.db.encodeKey(q.end) : undefined;
        if (q?.start) {
            if (!find(q.start)) {
                return;
            }
        }
        else {
            if (!first())
                return;
        }
        if (q?.offset) {
            if (!next(q.offset - 1))
                return;
        }
        const rawItem = this.rawItem(endBuf ? true : includeKey, includeValue, q?.zeroCopy);
        if (endBuf && compare(rawItem.key, endBuf) > 0)
            return;
        found++;
        yield {
            key: includeKey && rawItem.key ? this.db.decodeKey(rawItem.key) : undefined,
            value: rawItem.value,
        };
        // Iterate over remainder
        while (next()) {
            if (q?.limit && ++found > q.limit)
                return;
            const rawItem = this.rawItem(endBuf ? true : includeKey, includeValue, q?.zeroCopy);
            if (endBuf && compare(rawItem.key, endBuf) > 0)
                return;
            yield {
                key: includeKey && rawItem.key
                    ? this.db.decodeKey(rawItem.key)
                    : undefined,
                value: rawItem.value,
            };
        }
    }
    /** @returns an iterator over items (each item as DbItem<K, Buffer>) */
    *getItems(q) {
        for (const item of this.getCursorItems(q, true, true)) {
            if (!item.key || !item.value)
                break;
            yield item;
        }
    }
    /** @returns an iterator over keys */
    *getKeys(q) {
        for (const item of this.getCursorItems(q, true, false)) {
            if (!item.key)
                break;
            yield item.key;
        }
    }
    /** @returns an iterator over values (each value as Buffer) */
    *getValues(q) {
        for (const item of this.getCursorItems(q, false, true)) {
            if (!item.value)
                break;
            yield item.value;
        }
    }
    /** @returns an iterator over values (each value as string) */
    *getStrings(q) {
        for (const value of this.getValues(q)) {
            yield value.toString();
        }
    }
    /** @returns an iterator over values (each value as number) */
    *getNumbers(q) {
        for (const value of this.getValues(q)) {
            yield value.readDoubleBE();
        }
    }
    /** @returns an iterator over values (each value as boolean) */
    *getBooleans(q) {
        for (const value of this.getValues(q)) {
            yield database_1.bufReadBoolean(value);
        }
    }
    /** @returns an iterator over items (each item as DbItem<K, string>) */
    *getStringItems(q) {
        for (const item of this.getItems(q)) {
            yield {
                key: item.key,
                value: item.value?.toString(),
            };
        }
    }
    /** @returns an iterator over items (each item as DbItem<K, number>) */
    *getNumberItems(q) {
        for (const item of this.getItems(q)) {
            yield {
                key: item.key,
                value: item.value?.readDoubleBE(),
            };
        }
    }
    /** @returns an iterator over items (each item as DbItem<K, boolean>) */
    *getBooleanItems(q) {
        for (const item of this.getItems(q)) {
            yield {
                key: item.key,
                value: item.value ? database_1.bufReadBoolean(item.value) : false,
            };
        }
    }
    /** @returns a count of items matching the given query, or all items if
     * no query given */
    getCount(q) {
        let count = 0;
        for (const item of this.getCursorItems(q, false, false)) {
            count++;
        }
        return count;
    }
}
exports.Cursor = Cursor;
async function main() {
    console.log("hello from cursor.ts!");
    const env = await environment_1.openEnv(".testdb");
    const db = env.openDB(null);
    const txn = env.beginTxn();
    db.clear(txn);
    db.put("a", "alpha", txn);
    db.put("b", "beta", txn);
    db.put("c", "charlie", txn);
    db.put("d", "delta", txn);
    db.put("e", "echo", txn);
    db.put("f", "foxtrot", txn);
    const cursor = db.openCursor(txn);
    for (const item of cursor.getStringItems()) {
        const value = `${item.value} foo`;
        const buf = cursor.reserve(item.key, value.length);
        buf.write(value);
    }
    for (const item of cursor.getStringItems()) {
        console.log(item);
    }
    console.log({ count: cursor.getCount() });
    for (const _item of cursor.getCursorItems({ start: "c", limit: 3 })) {
        cursor.del();
    }
    for (const item of cursor.getStringItems()) {
        console.log(item);
    }
    console.log({ count: cursor.getCount() });
    cursor.close();
    txn.commit();
    db.close();
    env.close();
}
if (require.main === module)
    main();
//# sourceMappingURL=cursor.js.map