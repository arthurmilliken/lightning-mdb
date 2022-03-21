import {
  lmdb,
  MDB_NOMETASYNC,
  MDB_NOSYNC,
  MDB_RDONLY,
  SYNC_FORCE,
} from "./lmdb_ffi.ts";
import { DbError } from "./dberror.ts";
import { Environment } from "./environment.ts";

const notOpen = () => new Error("Transaction is already closed.");

export class Transaction {
  ftxn = new BigUint64Array(1);
  isOpen = false;
  env: Environment;
  readonly: boolean;
  parent: Transaction | undefined;

  constructor(env: Environment, readonly = false, parent?: Transaction) {
    this.env = env;
    this.readonly = readonly;
    this.parent = parent;
    const flags = (readonly ? MDB_RDONLY : 0) | MDB_NOMETASYNC | MDB_NOSYNC;
    const rc = lmdb.ffi_txn_begin(
      env.fenv,
      parent?.ftxn || null,
      flags,
      this.ftxn
    );
    if (rc) throw DbError.from(rc);
    this.isOpen = true;
  }

  beginChildTxn(readonly?: boolean): Transaction {
    return new Transaction(
      this.env,
      readonly === undefined ? this.readonly : readonly,
      this
    );
  }

  get id() {
    return lmdb.ffi_txn_id(this.ftxn);
  }

  async commit(): Promise<void> {
    if (!this.isOpen) throw notOpen();
    let rc = lmdb.ffi_txn_commit(this.ftxn);
    if (rc) throw DbError.from(rc);
    this.isOpen = false;
    rc = await lmdb.ffi_env_sync_force(this.env.fenv);
    if (rc) throw DbError.from(rc);
  }

  commitSync(): void {
    if (!this.isOpen) throw notOpen();
    let rc = lmdb.ffi_txn_commit(this.ftxn);
    if (rc) throw DbError.from(rc);
    this.isOpen = false;
    rc = lmdb.ffi_env_sync(this.env.fenv, SYNC_FORCE);
    if (rc) throw DbError.from(rc);
  }

  abort(): void {
    if (!this.isOpen) throw notOpen();
    lmdb.ffi_txn_abort(this.ftxn);
    this.isOpen = false;
  }

  reset(): void {
    if (!this.isOpen) throw notOpen();
    lmdb.ffi_txn_reset(this.ftxn);
    this.isOpen = false;
  }

  renew(): void {
    if (this.isOpen) throw new DbError("Transaction is already open");
    const rc = lmdb.ffi_txn_renew(this.ftxn);
    if (rc) throw DbError.from(rc);
    this.isOpen = true;
  }
}
