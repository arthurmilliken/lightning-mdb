"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bufReadBoolean = exports.bufWriteBoolean = exports.assertU64 = exports.detachBuffer = exports.calcPutFlags = exports.calcDbFlags = exports.Database = void 0;
const binding_1 = require("./binding");
const constants_1 = require("./constants");
const transaction_1 = require("./transaction");
const buffer_1 = require("buffer");
const worker_threads_1 = require("worker_threads");
const environment_1 = require("./environment");
class Database {
    constructor(arg0, name, txn, options) {
        this._isOpen = false;
        if (typeof arg0 === "bigint") {
            if (!worker_threads_1.isMainThread) {
                throw new Error("Cannot use this constructor from Worker Thread. Use Database.deserialize() instead.");
            }
            const envp = arg0;
            name = name || null; // coalesce undefined
            const _flags = options ? calcDbFlags(options) : 0;
            if (!txn)
                throw new Error("Transaction is required");
            this.dbi = binding_1.lmdb.dbi_open(txn?.txnp, name, _flags);
            this.envp = envp;
            this._keyType = options?.keyType || "string";
        }
        else {
            const serialized = arg0;
            this.envp = serialized.envp;
            this.dbi = serialized.dbi;
            this._keyType = serialized.keyType;
        }
        this._isOpen = true;
    }
    /**
     * Use this method to create a Database for use in a Worker Thread
     * @param serialized created by Database.serialize()
     * @returns Database
     */
    static deserialize(serialized) {
        return new Database(serialized);
    }
    serialize() {
        return { envp: this.envp, dbi: this.dbi, keyType: this.keyType };
    }
    get isOpen() {
        return this._isOpen;
    }
    get keyType() {
        return this._keyType;
    }
    useTransaction(callback, txn) {
        let useTxn;
        if (txn)
            useTxn = txn;
        else
            useTxn = new transaction_1.Transaction(this.envp, true);
        try {
            return callback(useTxn);
        }
        finally {
            if (!txn && useTxn.isOpen)
                useTxn.abort();
        }
    }
    assertOpen() {
        if (!this.isOpen)
            throw new Error("Database is already closed.");
    }
    stat(txn) {
        this.assertOpen();
        return this.useTransaction((useTxn) => {
            return binding_1.lmdb.stat(useTxn.txnp, this.dbi);
        }, txn);
    }
    flags(txn) {
        this.assertOpen();
        return this.useTransaction((useTxn) => {
            const _flags = binding_1.lmdb.dbi_flags(useTxn.txnp, this.dbi);
            return {
                create: _flags & constants_1.DbFlag.CREATE ? true : false,
                reverseKey: _flags & constants_1.DbFlag.REVERSEKEY ? true : false,
            };
        }, txn);
    }
    close() {
        this.assertOpen();
        binding_1.lmdb.dbi_close(this.envp, this.dbi);
        this._isOpen = false;
    }
    drop(txn, del) {
        this.assertOpen();
        binding_1.lmdb.mdb_drop(txn.txnp, this.dbi, del || false);
    }
    clear(txn) {
        this.drop(txn, false);
    }
    dropAsync(del) {
        throw new Error("Method not implemented.");
    }
    /**
     * Get item from database.
     * @param key
     * @param txn
     * @param zeroCopy if true, returned Buffer is created using zero-copy
     *        semantics. This buffer must be detached by calling detachBuffer()
     *        before the end of the transaction, and before attempting any other
     *        operation involving the same key.
     * @returns Buffer of data item, or null if key not found
     */
    get(key, txn, zeroCopy) {
        this.assertOpen();
        return this.useTransaction((useTxn) => {
            return binding_1.lmdb.get(useTxn.txnp, this.dbi, this.encodeKey(key), zeroCopy);
        }, txn);
    }
    getString(key, txn) {
        return this.useTransaction((useTxn) => {
            const buf = this.get(key, useTxn, true);
            if (!buf)
                return null;
            const str = buf.toString();
            if (buf)
                detachBuffer(buf);
            return str;
        }, txn);
    }
    getNumber(key, txn) {
        return this.useTransaction((useTxn) => {
            const buf = this.get(key, useTxn, true);
            if (!buf)
                return null;
            const num = buf.readDoubleBE();
            detachBuffer(buf);
            return num;
        }, txn);
    }
    getBoolean(key, txn) {
        return this.useTransaction((useTxn) => {
            const buf = this.get(key, useTxn, true);
            if (!buf)
                return null;
            const bool = buf.readUInt8() ? true : false;
            detachBuffer(buf);
            return bool;
        }, txn);
    }
    /**
     * Store item into database.
     *
     * This function stores key/data pairs in the database. The default behavior
     * is to enter the new key/data pair, replacing any previously existing key.
     * @param key the key to store in the database
     * @param value the value to store. If flags.reserve == true, this should be the
     *              number of bytes to reserve.
     * @param txn an open writable transaction
     * @param flags see @type {PutFlags} for details.
     * @returns null if successful
     *          a buffer containing the existing value if flags.noOverwrite == true
     *            and the key already exists
     *          an allocated buffer of length `value` if flags.reserve == true
     */
    put(key, value, txn, flags) {
        this.assertOpen();
        const keyBuf = this.encodeKey(key);
        const valueBuf = this.encodeValue(value);
        const _flags = flags ? calcPutFlags(flags) : 0;
        const zeroCopy = flags?.zeroCopy ? true : false;
        return binding_1.lmdb.put(txn.txnp, this.dbi, keyBuf, valueBuf, _flags, zeroCopy);
    }
    putAsync(key, value, flags) {
        throw new Error("Method not implemented.");
    }
    del(key, txn) {
        this.assertOpen();
        const keyBuf = this.encodeKey(key);
        binding_1.lmdb.del(txn.txnp, this.dbi, keyBuf);
    }
    delAsync(key) {
        throw new Error("Method not implemented.");
    }
    cursor(options, txn) {
        this.assertOpen();
        throw new Error("Method not implemented.");
    }
    /**
     * Compare two data items according to a particular database.
     *
     * This returns a comparison as if the two data items were keys in the
     * specified database.
     * @param a the first item to compare
     * @param b the second item to compare
     * @param txn
     * @returns < 0 if a < b, 0 if a == b, > 0 if a > b
     */
    compare(a, b, txn) {
        this.assertOpen();
        const aBuf = this.encodeKey(a);
        const bBuf = this.encodeKey(b);
        let useTxn = txn;
        if (!useTxn)
            useTxn = new transaction_1.Transaction(this.envp, true);
        const cmp = binding_1.lmdb.cmp(useTxn.txnp, this.dbi, aBuf, bBuf);
        if (!txn)
            useTxn.abort();
        return cmp;
    }
    encodeKey(key) {
        if (typeof key !== this.keyType) {
            throw new TypeError(`Key must be of type ${this.keyType}, found ${typeof key} instead`);
        }
        if (key instanceof buffer_1.Buffer)
            return key;
        if (typeof key === "string")
            return buffer_1.Buffer.from(key);
        if (typeof key === "number") {
            assertU64(key);
            const buf = buffer_1.Buffer.allocUnsafe(8);
            buf.writeBigInt64BE(BigInt(key));
            return buf;
        }
        throw new TypeError(`Invalid key: ${key}`);
    }
    encodeValue(value) {
        if (value instanceof buffer_1.Buffer)
            return value;
        if (typeof value === "string")
            return buffer_1.Buffer.from(value);
        if (typeof value === "number") {
            const buf = buffer_1.Buffer.allocUnsafe(8);
            buf.writeDoubleBE(value);
            return buf;
        }
        if (typeof value === "boolean") {
            const buf = buffer_1.Buffer.allocUnsafe(1);
            buf.writeUInt8(value ? 1 : 0);
            return buf;
        }
        throw new TypeError(`Invalid value: ${value}`);
    }
}
exports.Database = Database;
function calcDbFlags(flags) {
    return ((flags.create ? constants_1.DbFlag.CREATE : 0) +
        (flags.reverseKey ? constants_1.DbFlag.REVERSEKEY : 0));
}
exports.calcDbFlags = calcDbFlags;
function calcPutFlags(flags) {
    return ((flags.noOverwrite ? constants_1.PutFlag.NOOVERWRITE : 0) +
        (flags.reserve ? constants_1.PutFlag.RESERVE : 0) +
        (flags.append ? constants_1.PutFlag.APPEND : 0));
}
exports.calcPutFlags = calcPutFlags;
function detachBuffer(buf) {
    binding_1.lmdb.detach_buffer(buf);
}
exports.detachBuffer = detachBuffer;
function assertU64(num) {
    if (typeof num !== "number" ||
        num < 0 ||
        num > Number.MAX_SAFE_INTEGER ||
        Math.floor(num) !== num) {
        throw new TypeError(`${num} is not zero or a positive integer below Number.MAX_SAFE_INTEGER`);
    }
}
exports.assertU64 = assertU64;
function bufWriteBoolean(buf, val, offset = 0) {
    buf.writeUInt8(val ? 1 : 0, offset);
}
exports.bufWriteBoolean = bufWriteBoolean;
function bufReadBoolean(buf, offset = 0) {
    return buf.readUInt8(offset) ? true : false;
}
exports.bufReadBoolean = bufReadBoolean;
async function main() {
    const env = await environment_1.openEnv(".testdb");
    console.log("after openEnv()");
    const db = env.openDB(null);
    console.log("after env.openDB()");
    const txn = env.beginTxn();
    db.clear(txn);
    console.log("after env.beginTxn()");
    db.put("a", "apple seeds", txn);
    db.put("b", "banana peels", txn);
    db.put("c", "cherry pits", txn);
    console.log({
        a: db.getString("a", txn),
        b: db.getString("b", txn),
        c: db.getString("c", txn),
    });
    txn.commit();
    db.close();
    env.close();
}
if (require.main === module)
    main();
//# sourceMappingURL=database.js.map