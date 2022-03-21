import * as log from "https://deno.land/std@0.130.0/log/mod.ts";
import { ensureDir } from "https://deno.land/std@0.130.0/fs/mod.ts";
import { dirname } from "https://deno.land/std@0.130.0/path/mod.ts";
import {
  FLAGS_OFF,
  FLAGS_ON,
  lmdb,
  MDB_CP_COMPACT,
  MDB_CREATE,
  MDB_KEYEXIST,
  MDB_MAPASYNC,
  MDB_NOLOCK,
  MDB_NOMEMINIT,
  MDB_NOMETASYNC,
  MDB_NOOVERWRITE,
  MDB_NORDAHEAD,
  MDB_NOSUBDIR,
  MDB_NOSYNC,
  MDB_NOTLS,
  MDB_PREVSNAPSHOT,
  MDB_PROBLEM,
  MDB_RDONLY,
  MDB_WRITEMAP,
  op,
  SYNC_DONT_FORCE,
  SYNC_FORCE,
} from "./lmdb_ffi.ts";
import { DbValue } from "./dbvalue.ts";
import { DbError, notImplemented } from "./dberror.ts";
import { Environment } from "./environment.ts";

interface TxnFlags {
  readOnly?: boolean;
  noSync?: boolean;
  noMetaSync?: boolean;
}

function fromTxnFlags(flags: TxnFlags): number {
  return (
    (flags.readOnly ? MDB_RDONLY : 0) +
    (flags.noMetaSync ? MDB_NOMETASYNC : 0) +
    (flags.noSync ? MDB_NOSYNC : 0)
  );
}

export class Transaction {
  txn = new BigUint64Array(1);
  isOpen = false;
  dbEnv: Environment;
  flags: TxnFlags;
  parent: Transaction | undefined;

  constructor(env: Environment, flags: TxnFlags = {}, parent?: Transaction) {
    this.dbEnv = env;
    this.flags = flags;
    this.parent = parent;
    const rc = lmdb.ffi_txn_begin(
      env.env,
      parent?.txn || null,
      fromTxnFlags(flags),
      this.txn
    );
    if (rc) throw DbError.fromCode(rc);
    this.isOpen = true;
  }

  beginChildTxn(flags?: TxnFlags): Transaction {
    return new Transaction(this.dbEnv, flags || this.flags, this);
  }

  get id() {
    return lmdb.ffi_txn_id(this.txn);
  }

  commit(): void {}

  abort(): void {}

  reset(): void {}

  renew(): void {}
}
