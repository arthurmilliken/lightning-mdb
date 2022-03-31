"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const binding_1 = require("./binding");
const constants_1 = require("./constants");
function main() {
    console.log("hello from start!");
    // "real" methods
    console.log(binding_1.lmdb.version());
    console.log({ err: 5, strerror: binding_1.lmdb.strerror(5) });
    const envp = binding_1.lmdb.env_create();
    console.log({ penv: envp.toString(16), type: typeof envp });
    binding_1.lmdb.env_open(envp, ".testdb", 0, 0o664);
    console.log({ maxkeysize: binding_1.lmdb.env_get_maxkeysize(envp) });
    const stat = binding_1.lmdb.env_stat(envp);
    console.log({ stat });
    const envinfo = binding_1.lmdb.env_info(envp);
    console.log({ envinfo });
    const flags = binding_1.lmdb.env_get_flags(envp);
    console.log({ flags: flags.toString(16) });
    const path = binding_1.lmdb.env_get_path(envp);
    console.log({ path });
    const txnp = binding_1.lmdb.txn_begin(envp, null, 0);
    const dbi = binding_1.lmdb.dbi_open(txnp, null, 0);
    const a = Buffer.from("a");
    const b = Buffer.from("b");
    const c = Buffer.from("c");
    binding_1.lmdb.put(txnp, dbi, a, Buffer.from("apple"), 0);
    binding_1.lmdb.put(txnp, dbi, b, Buffer.from("banana"), 0);
    binding_1.lmdb.put(txnp, dbi, c, Buffer.from("cherry"), 0);
    const abuf = binding_1.lmdb.get(txnp, dbi, a);
    console.log({ a: abuf === null || abuf === void 0 ? void 0 : abuf.toString() });
    const bbuf = binding_1.lmdb.get(txnp, dbi, b);
    console.log({ b: bbuf === null || bbuf === void 0 ? void 0 : bbuf.toString() });
    const cbuf = binding_1.lmdb.get(txnp, dbi, c);
    console.log({ c: cbuf === null || cbuf === void 0 ? void 0 : cbuf.toString() });
    const existing = binding_1.lmdb.put(txnp, dbi, a, Buffer.from("alfalfa"), 0x10);
    console.log({ a: a.toString(), existing: existing === null || existing === void 0 ? void 0 : existing.toString() });
    const cursorp = binding_1.lmdb.cursor_open(txnp, dbi);
    for (let entry = binding_1.lmdb.cursor_get(cursorp, constants_1.CursorOp.Next); entry; entry = binding_1.lmdb.cursor_get(cursorp, constants_1.CursorOp.Next)) {
        const [key, data] = entry;
        let dataStr = data === null || data === void 0 ? void 0 : data.toString();
        console.log({
            m: "cursor.next()",
            key: key === null || key === void 0 ? void 0 : key.toString(),
            data: dataStr,
        });
        binding_1.lmdb.cursor_put(cursorp, key, Buffer.from(dataStr + " foo"));
    }
    for (let entry = binding_1.lmdb.cursor_get(cursorp, constants_1.CursorOp.Last); entry; entry = binding_1.lmdb.cursor_get(cursorp, constants_1.CursorOp.Prev)) {
        const [key, data] = entry;
        let dataStr = data === null || data === void 0 ? void 0 : data.toString();
        console.log({
            m: "cursor.prev()",
            key: key === null || key === void 0 ? void 0 : key.toString(),
            data: dataStr,
        });
        binding_1.lmdb.cursor_del(cursorp);
    }
    binding_1.lmdb.txn_commit(txnp);
    binding_1.lmdb.dbi_close(envp, dbi);
    binding_1.lmdb.env_close(envp);
    console.log("done");
}
main();
//# sourceMappingURL=start.js.map