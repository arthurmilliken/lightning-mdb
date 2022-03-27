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

/**
 * Represents a single consistent view of the database, based on the
 * moment the transaction was created.
 */
export class Transaction {
  ftxn = new BigUint64Array(1);
  isOpen = false;
  env: Environment;
  readOnly: boolean;
  parent: Transaction | undefined;

  private id = ++curId;

  constructor(env: Environment, readOnly = false, parent?: Transaction) {
    this.env = env;
    this.readOnly = readOnly;
    this.parent = parent;
    const flags = (readOnly ? MDB_RDONLY : 0) | MDB_NOMETASYNC | MDB_NOSYNC;
    const rc = lmdb.ffi_txn_begin(
      env.fenv,
      parent?.ftxn || null,
      flags,
      this.ftxn
    );
    if (rc) throw DbError.from(rc);
    this.isOpen = true;
    records[this.id] = {
      addr: this.ftxn[0],
      isOpen: true,
    };
    registry.register(this, this.id);
  }

  beginChildTxn(readOnly?: boolean): Transaction {
    return new Transaction(
      this.env,
      readOnly === undefined ? this.readOnly : readOnly,
      this
    );
  }

  get txnid() {
    return lmdb.ffi_txn_id(this.ftxn);
  }

  async commit(): Promise<void> {
    if (!this.isOpen) throw notOpen();
    let rc = lmdb.ffi_txn_commit(this.ftxn);
    if (rc) throw DbError.from(rc);
    this.isOpen = false;
    records[this.id].isOpen = true;
    rc = await lmdb.ffi_env_sync_force(this.env.fenv);
    if (rc) throw DbError.from(rc);
  }

  commitSync(): void {
    if (!this.isOpen) throw notOpen();
    let rc = lmdb.ffi_txn_commit(this.ftxn);
    if (rc) throw DbError.from(rc);
    this.isOpen = false;
    records[this.id].isOpen = false;
    rc = lmdb.ffi_env_sync(this.env.fenv, SYNC_FORCE);
    if (rc) throw DbError.from(rc);
  }

  abort(): void {
    if (!this.isOpen) return;
    lmdb.ffi_txn_abort(this.ftxn);
    this.isOpen = false;
    records[this.id].isOpen = false;
  }

  reset(): void {
    if (!this.isOpen) throw notOpen();
    lmdb.ffi_txn_reset(this.ftxn);
    this.isOpen = false;
    records[this.id].isOpen = false;
  }

  renew(): void {
    if (this.isOpen) throw new DbError("Transaction is already open");
    const rc = lmdb.ffi_txn_renew(this.ftxn);
    if (rc) throw DbError.from(rc);
    this.isOpen = true;
    records[this.id].isOpen = true;
  }
}

/////////////////////////////////
// Finalization management begin
let curId = 0;
interface Finalizer {
  addr: bigint;
  isOpen: boolean;
}
const records: Record<number, Finalizer> = {};
const registry = new FinalizationRegistry((id: number) => {
  const record = records[id];
  if (!record) return;
  if (record.isOpen) {
    const ftxn = new BigUint64Array([BigInt(record.addr)]);
    lmdb.ffi_txn_abort(ftxn);
  }
  delete records[id];
});
// Finalization management end
/////////////////////////////////
