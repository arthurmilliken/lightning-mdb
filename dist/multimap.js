"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Multimap = void 0;
const binding_1 = require("./binding");
const constants_1 = require("./constants");
const database_1 = require("./database");
const environment_1 = require("./environment");
function calcMultimapFlags(flags) {
    return (constants_1.DbFlag.DUPSORT +
        ((flags.create ? constants_1.DbFlag.CREATE : 0) +
            (flags.reverseKey ? constants_1.DbFlag.REVERSEKEY : 0) +
            (flags.reverseDup ? constants_1.DbFlag.REVERSEDUP : 0) +
            (flags.dupFixed ? constants_1.DbFlag.DUPFIXED : 0)));
}
/**
 * Multimap represents a "duplicate key, sorted value" database, which allows
 * multiple values to be stored under the same key.
 * (Also known as a "dupsort" database) */
class Multimap extends database_1.Database {
    constructor(arg0, name, txn, options) {
        if (typeof arg0 === "bigint") {
            super({
                envp: arg0,
                dbi: 0,
                keyType: options?.keyType || "string",
            });
            const flags = calcMultimapFlags(options || {});
            if (!txn)
                throw new Error("Transaction is required");
            if (!name)
                throw new Error("Name is required");
            this._dbi = binding_1.lmdb.dbi_open(txn.txnp, name, flags);
            this._valueType = options?.valueType || "string";
        }
        else {
            const serialized = arg0;
            super(serialized);
            this._valueType = serialized.valueType;
        }
    }
    /** Create a Multimap from a serialized representation
     * @param serialized created by Multimap.serialize()
     * @returns Multimap<K, V> */
    static deserialize(serialized) {
        return new Multimap(serialized);
    }
    /** Data type for stored values */
    get valueType() {
        return this._valueType;
    }
    getOptions(txn) {
        this.assertOpen();
        return this.useTransaction((useTxn) => {
            const flags = binding_1.lmdb.dbi_flags(useTxn.txnp, this._dbi);
            if (!(flags & constants_1.DbFlag.DUPSORT))
                throw new Error("This is not a Multimap database");
            return {
                keyType: this.keyType,
                create: flags & constants_1.DbFlag.CREATE ? true : false,
                reverseKey: flags & constants_1.DbFlag.REVERSEKEY ? true : false,
                reverseDup: flags & constants_1.DbFlag.REVERSEDUP ? true : false,
                dupFixed: flags & constants_1.DbFlag.DUPFIXED ? true : false,
            };
        }, txn);
    }
    /**
     * Get item from multimap
     * @param key the key under which the data is stored. If multiple items are
     *        stored under this key, only the FIRST data item will be returned.
     * @param txn an open Transaction
     * @param zeroCopy if true, returned Buffer is created using zero-copy
     *        semantics. This buffer must be detached by calling detachBuffer()
     *        before the end of the transaction, and before attempting any other
     *        operation involving the same key, even if that operation is being
     *        run in a separate thread. Use with caution.
     * @returns Buffer of data item
     */
    get(key, txn, zeroCopy = false) {
        return super.get(key, txn, zeroCopy);
    }
    /**
     * Store key/value pair into multimap. This record will be added as a duplicate
     * if the key already exists unless `flags.noOverwrite === true`. However, each
     * key/value pair is still unique.
     * @param key the key to store
     * @param value the value to store
     * @param txn an open writable transaction
     * @param {MultimapPutFlags} flags */
    put(key, value, txn, flags) {
        this.assertOpen();
        txn.assertOpen();
        const keyBuf = this.encodeKey(key);
        const valueBuf = this.encodeValue(value);
        const _flags = (flags?.append ? constants_1.PutFlag.APPEND : 0) +
            (flags?.appendDup ? constants_1.PutFlag.APPENDDUP : 0) +
            (flags?.noOverwrite ? constants_1.PutFlag.NOOVERWRITE : 0) +
            (flags?.noDupData ? constants_1.PutFlag.NODUPDATA : 0);
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
    putMultiple(key, values, numValues, bytesPerValue, flags) {
        if (numValues * bytesPerValue !== values.length) {
            throw new RangeError("numValues times bytesPerValue must equal values.length");
        }
        throw new Error("Method not implemented.");
    }
    /**
     * Removes all key/value entries for the given key.
     * @param key the key to delete
     * @param txn an open writeable transaction
     */
    del(key, txn) {
        super.del(key, txn);
    }
    /**
     * Removes a single key/value entry from the database.
     * @param key the key to delete
     * @param value the value to delete
     * @param txn an open writeable transaction
     */
    delEntry(key, value, txn) {
        this.assertOpen();
        const keyBuf = this.encodeKey(key);
        const valueBuf = this.encodeValue(value);
        binding_1.lmdb.del({ txnp: txn.txnp, dbi: this._dbi, key: keyBuf, value: valueBuf });
    }
    delEntryAsync(key, value) {
        throw new Error("Method not implemented.");
    }
}
exports.Multimap = Multimap;
async function main() {
    const env = await environment_1.openEnv(".testdb", { maxDBs: 2 });
    const db = env.openMultimap("multimap", { create: true });
    const txn = env.beginTxn();
    db.clear(txn);
    db.put("a", "alpha1", txn);
    db.put("a", "alpha2", txn);
    db.put("a", "alpha3", txn);
    db.put("b", "bravo1", txn);
    db.put("b", "bravo2", txn);
    db.put("b", "bravo3", txn);
    db.put("c", "charlie1", txn);
    db.put("c", "charlie2", txn);
    db.put("c", "charlie3", txn);
    const cursor = db.openCursor(txn);
    while (cursor.next()) {
        const item = cursor.stringItem();
        console.log({ key: item.key, value: item.value });
    }
    txn.commit();
    db.close();
    env.close();
}
if (require.main === module)
    main();
//# sourceMappingURL=multimap.js.map