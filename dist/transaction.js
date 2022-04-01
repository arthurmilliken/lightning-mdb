"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Transaction = void 0;
const binding_1 = require("./binding");
const constants_1 = require("./constants");
class Transaction {
    constructor(envp, readOnly = false, parent = null) {
        this.txnp = binding_1.lmdb.txn_begin(envp, parent, readOnly ? constants_1.MDB_RDONLY : 0);
        this.envp = envp;
        this.isReadOnly = readOnly;
        this._isOpen = true;
        this._isReset = false;
    }
    get isOpen() {
        return this._isOpen;
    }
    get isReset() {
        return this._isReset;
    }
    assertOpen() {
        if (!this.isOpen)
            throw new Error("This transaction is already closed");
    }
    commit() {
        this.assertOpen();
        binding_1.lmdb.txn_commit(this.txnp);
        this._isOpen = false;
    }
    abort() {
        this.assertOpen();
        binding_1.lmdb.txn_abort(this.txnp);
        this._isOpen = false;
    }
    reset() {
        this.assertOpen();
        if (this.isReset)
            throw new Error("This transaction has alredy been reset.");
        binding_1.lmdb.txn_reset(this.txnp);
        this._isOpen = false;
        this._isReset = true;
    }
    renew() {
        if (!this.isReset) {
            throw new Error("A transaction can only be renewed if it has been previously reset.");
        }
        binding_1.lmdb.txn_renew(this.txnp);
        this._isOpen = true;
        this._isReset = false;
    }
    beginChildTxn() {
        return new Transaction(this.envp, this.isReadOnly, this.txnp);
    }
    openDB(name, flags) {
        throw new Error("Method not implemented.");
    }
}
exports.Transaction = Transaction;
//# sourceMappingURL=transaction.js.map