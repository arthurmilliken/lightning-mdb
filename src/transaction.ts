import { lmdb, MDB_NOMETASYNC, MDB_NOSYNC, MDB_RDONLY } from "./lmdb_ffi.ts";
import { DbError } from "./dberror.ts";
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
