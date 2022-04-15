"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bufReadBoolean = exports.bufWriteBoolean = exports.assertUSafe = exports.detachBuffer = exports.calcDbFlags = exports.Database = void 0;
const binding_1 = require("./binding");
const constants_1 = require("./constants");
const transaction_1 = require("./transaction");
const buffer_1 = require("buffer");
const worker_threads_1 = require("worker_threads");
const environment_1 = require("./environment");
const cursor_1 = require("./cursor");
class Database {
    constructor(arg0, name, txn, options) {
        this._isOpen = false;
        if (typeof arg0 === "bigint") {
            if (!worker_threads_1.isMainThread) {
                throw new Error("Cannot use this constructor from Worker Thread. Use Database.deserialize() instead.");
            }
            const envp = arg0;
            name = name || null;
            const flags = options ? calcDbFlags(options) : 0;
            if (!txn)
                throw new Error("Transaction is required");
            this._dbi = binding_1.lmdb.dbi_open(txn.txnp, name, flags);
            this._envp = envp;
            this._keyType = options?.keyType || "string";
        }
        else {
            const serialized = arg0;
            this._envp = serialized.envp;
            this._dbi = serialized.dbi;
            this._keyType = serialized.keyType;
        }
        this._isOpen = true;
    }
    /** Create a Database from a serialized representation
     * @param serialized created by Database.serialize()
     * @returns Database<K> */
    static deserialize(serialized) {
        return new Database(serialized);
    }
    get isOpen() {
        return this._isOpen;
    }
    /** Data type for stored keys */
    get keyType() {
        return this._keyType;
    }
    get envp() {
        return this._envp;
    }
    get dbi() {
        return this._dbi;
    }
    /** Create serialization token for use with Worker Thread */
    serialize() {
        this.assertOpen();
        return { envp: this.envp, dbi: this._dbi, keyType: this.keyType };
    }
    stat(txn) {
        this.assertOpen();
        return this.useTransaction((useTxn) => {
            return binding_1.lmdb.stat(useTxn.txnp, this._dbi);
        }, txn);
    }
    getOptions(txn) {
        this.assertOpen();
        return this.useTransaction((useTxn) => {
            const flags = binding_1.lmdb.dbi_flags(useTxn.txnp, this._dbi);
            return {
                keyType: this.keyType,
                create: flags & constants_1.DbFlag.CREATE ? true : false,
                reverseKey: flags & constants_1.DbFlag.REVERSEKEY ? true : false,
            };
        }, txn);
    }
    close() {
        this.assertOpen();
        binding_1.lmdb.dbi_close(this.envp, this._dbi);
        this._isOpen = false;
    }
    drop(txn, del) {
        this.assertOpen();
        txn.assertOpen();
        binding_1.lmdb.mdb_drop(txn.txnp, this._dbi, del || false);
    }
    clear(txn) {
        this.drop(txn, false);
    }
    dropAsync(del) {
        throw new Error("Method not implemented.");
    }
    /**
     * Get item from database.
     * @param key the key under which the item is stored
     * @param txn an open Transaction (optional)
     * @param zeroCopy if true, returned Buffer is created using zero-copy
     *        semantics. This buffer must be detached by calling detachBuffer()
     *        before the end of the transaction, and before attempting any other
     *        operation involving the same key, even if that operation is being
     *        run in a separate thread. Use with caution.
     * @returns Buffer of data item
     */
    get(key, txn, zeroCopy = false) {
        this.assertOpen();
        return this.useTransaction((useTxn) => {
            return binding_1.lmdb.get({
                txnp: useTxn.txnp,
                dbi: this._dbi,
                key: this.encodeKey(key),
                zeroCopy,
            });
        }, txn);
    }
    /** Retrieve item as string */
    getString(key, txn) {
        return this.useTransaction((useTxn) => {
            return this.get(key, useTxn).toString();
        }, txn);
    }
    /**
     * Retrieve item as number
     * @param key
     * @param txn
     * @returns null if not found
     */
    getNumber(key, txn) {
        return this.useTransaction((useTxn) => {
            return this.get(key, useTxn).readDoubleBE();
        }, txn);
    }
    /**
     * Retrieve value as boolean
     * @param key
     * @param txn
     * @returns null if not found
     */
    getBoolean(key, txn) {
        return this.useTransaction((useTxn) => {
            return this.get(key, useTxn).readUInt8() ? true : false;
        }, txn);
    }
    /**
     * Store item into database
     * @param key the key to store
     * @param value the value to store
     * @param txn an open writable transaction
     * @param {PutFlags} flags */
    put(key, value, txn, flags) {
        this.assertOpen();
        txn.assertOpen();
        const keyBuf = this.encodeKey(key);
        const valueBuf = this.encodeValue(value);
        const _flags = (flags?.append ? constants_1.PutFlag.APPEND : 0) +
            (flags?.noOverwrite ? constants_1.PutFlag.NOOVERWRITE : 0);
        binding_1.lmdb.put({
            txnp: txn.txnp,
            dbi: this._dbi,
            key: keyBuf,
            value: valueBuf,
            flags: _flags,
        });
    }
    putAsync(key, value, flags) {
        throw new Error("Method not implemented.");
    }
    /**
     * Reserve space inside the database at the current key, and return a Buffer
     * which the caller can fill in before the transaction ends.
     * @param key the key to store
     * @param size the size in Bytes to allocate for the Buffer
     * @param txn an open writable transaction
     * @param flags
     * @returns an empty buffer of `size` bytes, to be filled in before the
     *          transaction ends.
     */
    reserve(key, size, txn, flags) {
        this.assertOpen();
        txn.assertOpen();
        const keyBuf = this.encodeKey(key);
        const _flags = (flags?.append ? constants_1.PutFlag.APPEND : 0) +
            (flags?.noOverwrite ? constants_1.PutFlag.NOOVERWRITE : 0);
        return binding_1.lmdb.reserve({
            txnp: txn.txnp,
            dbi: this._dbi,
            key: keyBuf,
            size,
            flags: _flags,
        });
    }
    /**
     * Removes key/data pair from the database.
     * @param key the key to delete
     * @param txn an open writeable transaction
     */
    del(key, txn) {
        this.assertOpen();
        const keyBuf = this.encodeKey(key);
        binding_1.lmdb.del({ txnp: txn.txnp, dbi: this._dbi, key: keyBuf });
    }
    delAsync(key) {
        throw new Error("Method not implemented.");
    }
    /** Return a comparison as if the two items were keys in this database.
     * @param a the first item to compare
     * @param b the second item to compare
     * @param txn an optional transaction context
     * @returns < 0 if a < b, 0 if a == b, > 0 if a > b
     */
    compareKeys(a, b, txn) {
        return this.compareBuffers(this.encodeKey(a), this.encodeKey(b), txn);
    }
    compareBuffers(a, b, txn) {
        this.assertOpen();
        let useTxn = txn;
        if (!useTxn)
            useTxn = new transaction_1.Transaction(this.envp, true);
        const cmp = binding_1.lmdb.cmp(useTxn.txnp, this._dbi, a, b);
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
            assertUSafe(key);
            const buf = buffer_1.Buffer.allocUnsafe(8);
            buf.writeBigUInt64BE(BigInt(key));
            return buf;
        }
        throw new TypeError(`Invalid key: ${key}`);
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
    /** @returns a cursor for this database, which the caller can use to navigate keys */
    openCursor(txn) {
        return new cursor_1.Cursor(this, txn);
    }
    /** Helper function for handling optional transaction argument */
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
}
exports.Database = Database;
function calcDbFlags(flags) {
    return ((flags.create ? constants_1.DbFlag.CREATE : 0) +
        (flags.reverseKey ? constants_1.DbFlag.REVERSEKEY : 0));
}
exports.calcDbFlags = calcDbFlags;
function detachBuffer(buf) {
    binding_1.lmdb.detach_buffer(buf);
}
exports.detachBuffer = detachBuffer;
function assertUSafe(num) {
    if (typeof num !== "number" ||
        num < 0 ||
        num > Number.MAX_SAFE_INTEGER ||
        Math.floor(num) !== num) {
        throw new TypeError(`${num} must be an unsigned integer below ${Number.MAX_SAFE_INTEGER}`);
    }
}
exports.assertUSafe = assertUSafe;
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
    const db = env.openDB(null);
    const txn = env.beginTxn();
    db.clear(txn);
    db.put("a", "alpha", txn);
    db.put("b", "bravo", txn);
    db.put("c", "charlie", txn);
    const start = process.hrtime();
    const c = db.getString("c", txn);
    const diff = process.hrtime(start);
    console.log({ c, diff });
    txn.commit();
    db.close();
    env.close();
}
if (require.main === module)
    main();
//# sourceMappingURL=database.js.map