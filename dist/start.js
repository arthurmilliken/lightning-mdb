"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const binding_1 = require("./binding");
const constants_1 = require("./constants");
function main() {
    console.log("hello from start!");
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
    binding_1.lmdb.mdb_drop(txnp, dbi, false);
    console.log("after mdb_drop");
    const a = Buffer.from("a");
    const b = Buffer.from("b");
    const c = Buffer.from("c");
    const d = Buffer.from("d");
    const dval = "durian skins";
    binding_1.lmdb.put({ txnp, dbi, key: a, value: Buffer.from("apple"), flags: 0 });
    console.log({ key: a.toString(), m: "after put" });
    binding_1.lmdb.put({ txnp, dbi, key: b, value: Buffer.from("banana"), flags: 0 });
    console.log({ key: b.toString(), m: "after put" });
    binding_1.lmdb.put({ txnp, dbi, key: c, value: Buffer.from("california"), flags: 0 });
    console.log({ key: c.toString(), m: "after put" });
    const reserve = binding_1.lmdb.reserve({
        txnp,
        dbi,
        key: d,
        size: dval.length,
        flags: 0,
    });
    const abuf = binding_1.lmdb.get({ txnp, dbi, key: a });
    console.log({ a: abuf?.toString(), m: "after get" });
    const bbuf = binding_1.lmdb.get({ txnp, dbi, key: b });
    console.log({ b: bbuf?.toString(), m: "after get" });
    const cbuf = binding_1.lmdb.get({ txnp, dbi, key: c });
    console.log({ c: cbuf?.toString(), m: "after get" });
    if (reserve) {
        reserve.write(dval);
    }
    const dbuf = binding_1.lmdb.get({ txnp, dbi, key: d });
    console.log({ d: dbuf?.toString(), m: "after reserve write + fetch" });
    try {
        binding_1.lmdb.put({
            txnp,
            dbi,
            key: a,
            value: Buffer.from("alfalfa"),
            flags: constants_1.PutFlag.NOOVERWRITE,
        });
        console.log("should have thrown");
    }
    catch (err) {
        console.log({ m: "expect KEYEXIST error", err });
    }
    const cursorp = binding_1.lmdb.cursor_open(txnp, dbi);
    let success = binding_1.lmdb.cursor_get({ cursorp, op: constants_1.CursorOp.NEXT });
    while (success) {
        const item = binding_1.lmdb.cursor_get({
            cursorp,
            op: constants_1.CursorOp.GET_CURRENT,
            includeKey: true,
            includeValue: true,
        });
        console.log({
            m: "cursor.GET_CURRENT",
            key: item?.key?.toString(),
            value: item?.value?.toString(),
        });
        success = binding_1.lmdb.cursor_get({ cursorp, op: constants_1.CursorOp.NEXT });
    }
    binding_1.lmdb.cursor_close(cursorp);
    binding_1.lmdb.txn_commit(txnp);
    binding_1.lmdb.dbi_close(envp, dbi);
    binding_1.lmdb.env_close(envp);
    console.log("done");
}
main();
//# sourceMappingURL=start.js.map