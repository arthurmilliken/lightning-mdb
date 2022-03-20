import * as log from "https://deno.land/std@0.129.0/log/mod.ts";
import { ensureDir } from "https://deno.land/std@0.130.0/fs/mod.ts";
import {
  lmdb,
  MDB_CREATE,
  MDB_KEYEXIST,
  MDB_NOMETASYNC,
  MDB_NOOVERWRITE,
  MDB_RDONLY,
  op,
} from "./lmdb_ffi.ts";

// deno-lint-ignore no-explicit-any
function logDebug(arg: any) {
  if (arg.err) log.warning(arg);
  else log.info(arg);
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function wrapValue(buf: Uint8Array): BigUint64Array {
  return new BigUint64Array([
    BigInt(buf.byteLength),
    Deno.UnsafePointer.of(buf).value,
  ]);
}

function unwrapValue(wrapper: BigUint64Array): ArrayBuffer {
  const length = Number(wrapper[0]);
  return new Deno.UnsafePointerView(
    new Deno.UnsafePointer(wrapper[1])
  ).getArrayBuffer(length);
}

// ffi_version()
const major = new Int32Array(1);
const minor = new Int32Array(1);
const patch = new Int32Array(1);
const version = lmdb.ffi_version(major, minor, patch);
logDebug({
  version: new Deno.UnsafePointerView(version).getCString(),
  major: major[0],
  minor: minor[0],
  patch: patch[0],
});

// ffi_strerror()
const strerror = lmdb.ffi_strerror(MDB_KEYEXIST);
logDebug({
  m: "after ffi_strerror",
  MDB_KEYEXIST,
  strerror: new Deno.UnsafePointerView(strerror).getCString(),
});
const geterror = (rc: number): string => {
  return new Deno.UnsafePointerView(lmdb.ffi_strerror(rc)).getCString();
};
const iferror = (rc: number): string | undefined =>
  rc ? geterror(rc) : undefined;

// ffi_env_create()
const fenv = new BigUint64Array(1);
let rc = lmdb.ffi_env_create(fenv);

logDebug({
  m: "after ffi_env_create()",
  rc,
  err: iferror(rc),
  env: `0x${fenv[0].toString(16)}`,
});

const DEFAULT_READERS = 126;

// ffi_env_set_maxreaders()
rc = lmdb.ffi_env_set_maxreaders(fenv, DEFAULT_READERS * 2);
logDebug({
  m: "after ffi_env_set_maxreaders()",
  rc,
  err: iferror(rc),
});

// ffi_env_set_maxdbs()
rc = lmdb.ffi_env_set_maxdbs(fenv, 8);
logDebug({
  m: "after ffi_set_env_maxdbs()",
  rc,
  err: iferror(rc),
  dbs: 8,
});

// ffi_env_open()
let path = ".testdb";
await ensureDir(path);
let fpath = wrapValue(encoder.encode(path));

rc = lmdb.ffi_env_open(fenv, fpath, 0, 0o664);
logDebug({
  m: "after ffi_env_open()",
  rc,
  err: iferror(rc),
  path,
});

// ffi_env_copy()
path = ".testdb2";
await ensureDir(path);
fpath = wrapValue(encoder.encode(path));
rc = await lmdb.ffi_env_copy(fenv, fpath);
logDebug({
  m: "after ffi_env_copy()",
  rc,
  err: iferror(rc),
  path,
});

// ffi_env_stat();
const STAT_LEN = 6;
const STAT_PSIZE = 0;
const STAT_DEPTH = 1;
const STAT_BRANCH_PAGES = 2;
const STAT_LEAF_PAGES = 3;
const STAT_OVERFLOW_PAGES = 4;
const STAT_ENTRIES = 5;
let fstat = new Float64Array(STAT_LEN);
rc = lmdb.ffi_env_stat(fenv, fstat);
logDebug({
  m: "after ffi_env_stat()",
  rc,
  err: iferror(rc),
  psize: fstat[STAT_PSIZE],
  depth: fstat[STAT_DEPTH],
  branchPages: fstat[STAT_BRANCH_PAGES],
  leafPages: fstat[STAT_LEAF_PAGES],
  overflowPages: fstat[STAT_OVERFLOW_PAGES],
  entries: fstat[STAT_ENTRIES],
});

// ffi_env_info()
const INFO_LEN = 5;
const INFO_MAPSIZE = 0;
const INFO_LAST_PGNO = 1;
const INFO_LAST_TXNID = 2;
const INFO_MAXREADERS = 3;
const INFO_NUMREADERS = 4;
let finfo = new Float64Array(INFO_LEN);
rc = lmdb.ffi_env_info(fenv, finfo);
logDebug({
  m: "after ffi_env_info()",
  rc,
  err: iferror(rc),
  mapsize: finfo[INFO_MAPSIZE],
  lastPage: finfo[INFO_LAST_PGNO],
  lastTxn: finfo[INFO_LAST_TXNID],
  maxReaders: finfo[INFO_MAXREADERS],
  numReaders: finfo[INFO_NUMREADERS],
});

// ffi_env_sync()
export const FORCE = 1;
export const DONT_FORCE = 0;
rc = lmdb.ffi_env_sync(fenv, DONT_FORCE);
logDebug({
  m: "after ffi_env_sync()",
  rc,
  err: iferror(rc),
});

// ffi_env_set_flags()
export const FLAGS_ON = 1;
export const FLAGS_OFF = 0;
rc = lmdb.ffi_env_set_flags(fenv, MDB_NOMETASYNC, FLAGS_ON);
logDebug({
  m: "after ffi_env_set_flags()",
  rc,
  err: iferror(rc),
});

// ffi_env_get_flags()
const flags = new Uint32Array(1);
rc = lmdb.ffi_env_get_flags(fenv, flags);
logDebug({
  m: "after ffi_env_get_flags",
  rc,
  err: iferror(rc),
  flags: `0x${flags[0].toString(16)}`,
});
rc = lmdb.ffi_env_set_flags(fenv, MDB_NOMETASYNC, FLAGS_OFF);
logDebug({
  m: "after restoring flags",
  rc,
  err: iferror(rc),
});

// ffi_env_get_path()
fpath = new BigUint64Array(2);
rc = lmdb.ffi_env_get_path(fenv, fpath);
path = decoder.decode(unwrapValue(fpath));
logDebug({
  m: "after ffi_env_get_path()",
  rc,
  err: iferror(rc),
  path,
});

// ffi_env_get_fd()
const fd = new Int32Array(1);
rc = lmdb.ffi_env_get_fd(fenv, fd);
logDebug({
  m: "after ffi_env_get_fd()",
  rc,
  err: iferror(rc),
  fd: fd[0],
});

// ffi_env_set_mapsize()
const DEFAULT_MAPSIZE = 1048576;
rc = lmdb.ffi_env_set_mapsize(fenv, DEFAULT_MAPSIZE * 2);
logDebug({
  m: "after ffi_env_set_mapsize()",
  rc,
  err: iferror(rc),
});

finfo = new Float64Array(INFO_LEN);
rc = lmdb.ffi_env_info(fenv, finfo);
logDebug({
  m: "after ffi_env_info()",
  rc,
  err: iferror(rc),
  mapsize: finfo[INFO_MAPSIZE],
  lastPage: finfo[INFO_LAST_PGNO],
  lastTxn: finfo[INFO_LAST_TXNID],
  maxReaders: finfo[INFO_MAXREADERS],
  numReaders: finfo[INFO_NUMREADERS],
});

// ffi_env_get_maxreaders()
const readers = new Uint32Array(1);
rc = lmdb.ffi_env_get_maxreaders(fenv, readers);
logDebug({
  m: "after ffi_env_get_maxreaders()",
  rc,
  err: iferror(rc),
  readers: readers[0],
});

// ffi_env_get_maxkeysize()
const keysize = lmdb.ffi_env_get_maxkeysize(fenv);
logDebug({
  m: "after ffi_env_get_maxkeysize()",
  keysize,
});

// ffi_env_set_userctx()
const ctx = new Float64Array([111, 222, 333, 444, 555]);
rc = lmdb.ffi_env_set_userctx(fenv, ctx);
logDebug({
  m: "after ffi_env_set_userctx()",
  rc,
  err: iferror(rc),
  ctx,
});

// ffi_env_get_userctx()
const ctxPtr = lmdb.ffi_env_get_userctx(fenv);
const buf = new Deno.UnsafePointerView(ctxPtr).getArrayBuffer(8 * 5);
const ctx2 = new Float64Array(buf);

logDebug({
  m: "after ffi_env_get_userctx()",
  ctx2,
});

// ffi_txn_begin()
const ftxn = new BigUint64Array(1);
rc = lmdb.ffi_txn_begin(fenv, null, 0, ftxn);
logDebug({
  m: "after ffi_txn_begin()",
  rc,
  err: iferror(rc),
  env: `0x${fenv[0].toString(16)}`,
  txn: `0x${ftxn[0].toString(16)}`,
});

// child transaction
const fchild = new BigUint64Array(1);
rc = lmdb.ffi_txn_begin(fenv, ftxn, 0, fchild);
logDebug({
  m: "after ffi_txn_begin(): child",
  rc,
  err: iferror(rc),
  env: `0x${fenv[0].toString(16)}`,
  txn: `0x${ftxn[0].toString(16)}`,
  child: `0x${fchild[0].toString(16)}`,
});

// ffi_txn_env()
const fenv2 = new BigUint64Array([BigInt(lmdb.ffi_txn_env(ftxn))]);
logDebug({
  m: "after ffi_txn_env(ftxn)",
  env2: `0x${fenv2[0].toString(16)}`,
});

// ffi_env_get_maxreaders()
rc = lmdb.ffi_env_get_maxreaders(fenv2, readers);
logDebug({
  m: "after ffi_env_get_maxreaders(fenv2)",
  rc,
  err: iferror(rc),
  readers: readers[0],
});

// ffi_txn_id()
const txnid = lmdb.ffi_txn_id(fchild);
logDebug({
  m: "after ffi_txn_id(fchild)",
  txnid,
});

// ffi_txn_abort()
lmdb.ffi_txn_abort(fchild);
logDebug({ m: "after ffi_txn_abort(fchild)" });

// ffi_dbi_open()
const fdbi = new Uint32Array(1);
rc = lmdb.ffi_dbi_open(ftxn, null, 0, fdbi);
const dbi = fdbi[0];
logDebug({
  m: "after ffi_dbi_open(null)",
  rc,
  err: iferror(rc),
  dbi,
});
// open a sub-database
const fdbi2 = new Uint32Array(1);
const name = "test";
const dbname = encoder.encode(name);
const fname = wrapValue(dbname);
rc = lmdb.ffi_dbi_open(ftxn, fname, MDB_CREATE, fdbi2);
const dbi2 = fdbi2[0];
logDebug({
  m: `after ffi_dbi_open()`,
  rc,
  err: iferror(rc),
  name,
  dbi2,
});

// ffi_dbi_drop()
export const DROP_EMPTY = 0;
export const DROP_DELETE = 1;
rc = lmdb.ffi_drop(ftxn, dbi2, DROP_DELETE);
logDebug({
  m: "after ffi_dbi_drop()",
  rc,
  err: iferror(rc),
  dbi2,
  DROP_DELETE,
});

// ffi_dbi_close()
lmdb.ffi_dbi_close(fenv, dbi2);
logDebug({
  m: "after ffi_dbi_close()",
  dbi2,
});

// ffi_dbi_stat()
fstat = new Float64Array(STAT_LEN);
rc = lmdb.ffi_stat(ftxn, dbi, fstat);
logDebug({
  m: "after ffi_stat()",
  rc,
  err: iferror(rc),
  dbi,
  psize: fstat[STAT_PSIZE],
  depth: fstat[STAT_DEPTH],
  branchPages: fstat[STAT_BRANCH_PAGES],
  leafPages: fstat[STAT_LEAF_PAGES],
  overflowPages: fstat[STAT_OVERFLOW_PAGES],
  entries: fstat[STAT_ENTRIES],
});

// ffi_dbi_flags()
rc = lmdb.ffi_dbi_flags(ftxn, dbi, flags);
logDebug({
  m: "after ffi_dbi_flags()",
  rc,
  err: iferror(rc),
  dbi,
  flags: `0x${flags[0].toString(16)}`,
});

// ffi_get() - unsafe "zero-copy" semantics
let key = "hello";
const keyEncoded = encoder.encode(key);
let fkey = wrapValue(keyEncoded);
let fdata = new BigUint64Array(2);
rc = lmdb.ffi_get(ftxn, dbi, fkey, fdata);
let dataBuf = unwrapValue(fdata);
logDebug({
  m: "after ffi_get()",
  rc,
  err: iferror(rc),
  key,
  data: decoder.decode(dataBuf),
});

// ffi_put()
let data = "earth";
fkey = wrapValue(keyEncoded);
fdata = wrapValue(encoder.encode(data));
rc = lmdb.ffi_put(ftxn, dbi, fkey, fdata, 0);
dataBuf = unwrapValue(fdata);
logDebug({
  m: "after ffi_put()",
  rc,
  err: iferror(rc),
  key,
  data: decoder.decode(dataBuf),
});

// ffi_put() - NO OVERWRITE
data = "alpha proxima";
fkey = wrapValue(keyEncoded);
fdata = wrapValue(encoder.encode(data));
rc = lmdb.ffi_put(ftxn, dbi, fkey, fdata, MDB_NOOVERWRITE);
dataBuf = unwrapValue(fdata);
logDebug({
  m: "after ffi_put(MDB_NOOVERWRITE)",
  rc,
  err: iferror(rc),
  key,
  data: decoder.decode(dataBuf),
});

// ffi_del()
rc = lmdb.ffi_del(ftxn, dbi, fkey, null, 0);
logDebug({
  m: "after ffi_del()",
  rc,
  err: iferror(rc),
  key,
});

// ffi_cursor_open
const readTxn = new BigUint64Array(1);
rc = lmdb.ffi_txn_begin(fenv, null, MDB_RDONLY, readTxn);
logDebug({ m: "ffi_txn_begin", rc, err: iferror(rc) });
const readCursor = new BigUint64Array(1);
rc = lmdb.ffi_cursor_open(readTxn, dbi, readCursor);
logDebug({
  m: "after ffi_cursor_open",
  dbi,
  readCursor: `0x${readCursor[0].toString(16)}`,
});

// ffi_cursor_close
lmdb.ffi_cursor_close(readCursor);
logDebug({ m: "after ffi_cursor_close" });

// ffi_cursor_renew
rc = lmdb.ffi_cursor_renew(readTxn, readCursor);
logDebug({
  m: "after ffi_cursor_renew",
  rc,
  err: iferror(rc),
});

// ffi_cursor_txn
const txnAddr = lmdb.ffi_cursor_txn(readCursor);
logDebug({
  m: "after ffi_cursor_txn(readCursor)",
  txnAddr: `0x${txnAddr.toString(16)}`,
});
lmdb.ffi_cursor_close(readCursor);
lmdb.ffi_txn_abort(readTxn);

// ffi_cursor_dbi
logDebug({
  m: "ffi_cursor_dbi()",
  dbi: lmdb.ffi_cursor_dbi(readCursor),
});

// populate
key = "a";
fkey = wrapValue(encoder.encode(key));
data = "apple";
fdata = wrapValue(encoder.encode(data));
rc = lmdb.ffi_put(ftxn, dbi, fkey, fdata, 0);
logDebug({ m: "ffi_put()", rc, err: iferror(rc), key, data });

key = "c";
fkey = wrapValue(encoder.encode(key));
data = "cherry";
fdata = wrapValue(encoder.encode(data));
rc = lmdb.ffi_put(ftxn, dbi, fkey, fdata, 0);
logDebug({ m: "ffi_put()", rc, err: iferror(rc), key, data });

key = "b";
fkey = wrapValue(encoder.encode(key));
data = "banana";
fdata = wrapValue(encoder.encode(data));
rc = lmdb.ffi_put(ftxn, dbi, fkey, fdata, 0);
logDebug({ m: "ffi_put()", rc, err: iferror(rc), key, data });

// Loop cursor
const cursor = new BigUint64Array(1);
rc = lmdb.ffi_cursor_open(ftxn, dbi, cursor);
logDebug({ m: "ffi_cursor_open()", rc, err: iferror(rc), dbi });

while (!rc) {
  // ffi_cursor_get
  rc = lmdb.ffi_cursor_get(cursor, fkey, fdata, op.NEXT);
  key = decoder.decode(unwrapValue(fkey));
  data = decoder.decode(unwrapValue(fdata));
  logDebug({ m: "ffi_cursor_get()", rc, err: iferror(rc), key, data });

  if (rc) break;

  // ffi_cursor_put
  data += " foo";
  fkey = wrapValue(encoder.encode(key));
  fdata = wrapValue(encoder.encode(data));
  rc = lmdb.ffi_cursor_put(cursor, fkey, fdata, 0);
  key = decoder.decode(unwrapValue(fkey));
  data = decoder.decode(unwrapValue(fdata));
  logDebug({ m: "ffi_cursor_put()", rc, err: iferror(rc), key, data });
}
log.info({
  m: "after cursor NEXT loop",
});
rc = lmdb.ffi_cursor_get(cursor, fkey, fdata, op.LAST);
while (!rc) {
  key = decoder.decode(unwrapValue(fkey));
  data = decoder.decode(unwrapValue(fdata));
  logDebug({ m: "ffi_cursor_get()", rc, err: iferror(rc), key, data });
  rc = lmdb.ffi_cursor_get(cursor, fkey, fdata, op.PREV);
}
log.info({
  m: "after cursor PREV loop",
});

lmdb.ffi_cursor_close(cursor);

// ffi_txn_commit()
rc = lmdb.ffi_txn_commit(ftxn);
logDebug({
  m: "after ffi_txn_commit()",
  rc,
  err: iferror(rc),
});

const droptxn = new BigUint64Array(1);
rc = lmdb.ffi_txn_begin(fenv, null, 0, droptxn);
logDebug({ m: "ffi_txn_begin", rc, err: iferror(rc) });
rc = lmdb.ffi_drop(droptxn, dbi, DROP_EMPTY);
logDebug({ m: "ffi_drop", rc, err: iferror(rc) });
rc = lmdb.ffi_txn_commit(droptxn);
logDebug({ m: "ffi_txn_commit", rc, err: iferror(rc) });

// ffi_env_close()
lmdb.ffi_env_close(fenv);
logDebug("after ffi_env_close()");
