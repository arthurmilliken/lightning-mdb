"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Txn = void 0;
class Txn {
    constructor(txnp) {
        this.txnp = txnp;
    }
    commit() {
        throw new Error("Method not implemented.");
    }
    abort() {
        throw new Error("Method not implemented.");
    }
    reset() {
        throw new Error("Method not implemented.");
    }
    renew() {
        throw new Error("Method not implemented.");
    }
    openDB(name, flags) {
        throw new Error("Method not implemented.");
    }
}
exports.Txn = Txn;
//# sourceMappingURL=txn.js.map