import { lmdb } from "./binding";
import { CursorOp, PutFlag } from "./constants";

function main() {
  console.log("hello from start!");

  console.log(lmdb.version());
  console.log({ err: 5, strerror: lmdb.strerror(5) });

  const envp: bigint = lmdb.env_create();
  console.log({ penv: envp.toString(16), type: typeof envp });
  lmdb.env_open(envp, ".testdb", 0, 0o664);
  console.log({ maxkeysize: lmdb.env_get_maxkeysize(envp) });
  const stat = lmdb.env_stat(envp);
  console.log({ stat });
  const envinfo = lmdb.env_info(envp);
  console.log({ envinfo });
  const flags = lmdb.env_get_flags(envp);
  console.log({ flags: flags.toString(16) });
  const path = lmdb.env_get_path(envp);
  console.log({ path });
  const txnp = lmdb.txn_begin(envp, null, 0);
  const dbi = lmdb.dbi_open(txnp, null, 0);
  lmdb.mdb_drop(txnp, dbi, false);
  console.log("after mdb_drop");
  const a = Buffer.from("a");
  const b = Buffer.from("b");
  const c = Buffer.from("c");
  const d = Buffer.from("d");
  const dval = "durian skins";
  lmdb.put({ txnp, dbi, key: a, value: Buffer.from("apple"), flags: 0 });
  console.log({ key: a.toString(), m: "after put" });
  lmdb.put({ txnp, dbi, key: b, value: Buffer.from("banana"), flags: 0 });
  console.log({ key: b.toString(), m: "after put" });
  lmdb.put({ txnp, dbi, key: c, value: Buffer.from("california"), flags: 0 });
  console.log({ key: c.toString(), m: "after put" });
  const reserve: Buffer = <Buffer>lmdb.reserve({
    txnp,
    dbi,
    key: d,
    size: dval.length,
    flags: 0,
  });
  const abuf: Buffer | null = lmdb.get({ txnp, dbi, key: a });
  console.log({ a: abuf?.toString(), m: "after get" });
  const bbuf: Buffer | null = lmdb.get({ txnp, dbi, key: b });
  console.log({ b: bbuf?.toString(), m: "after get" });
  const cbuf: Buffer | null = lmdb.get({ txnp, dbi, key: c });
  console.log({ c: cbuf?.toString(), m: "after get" });
  if (reserve) {
    reserve.write(dval);
  }
  const dbuf: Buffer | null = lmdb.get({ txnp, dbi, key: d });
  console.log({ d: dbuf?.toString(), m: "after reserve write + fetch" });
  try {
    lmdb.put({
      txnp,
      dbi,
      key: a,
      value: Buffer.from("alfalfa"),
      flags: PutFlag.NOOVERWRITE,
    });
    console.log("should have thrown");
  } catch (err) {
    console.log({ m: "expect KEYEXIST error", err });
  }
  const cursorp = lmdb.cursor_open(txnp, dbi);
  let success = lmdb.cursor_get({ cursorp, op: CursorOp.NEXT });
  while (success) {
    const item = lmdb.cursor_get({
      cursorp,
      op: CursorOp.GET_CURRENT,
      includeKey: true,
      includeValue: true,
    });
    console.log({
      m: "cursor.GET_CURRENT",
      key: item?.key?.toString(),
      value: item?.value?.toString(),
    });
    success = lmdb.cursor_get({ cursorp, op: CursorOp.NEXT });
  }

  lmdb.cursor_close(cursorp);
  lmdb.txn_commit(txnp);
  lmdb.dbi_close(envp, dbi);
  lmdb.env_close(envp);
  console.log("done");
}

main();
