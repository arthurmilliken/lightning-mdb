import { lmdb } from "./binding";
import { MDB_RDONLY } from "./constants";
import { IDatabase, DbFlags } from "./types";

export class Txn {
  readonly txnp: bigint;
  readonly envp: bigint;
  readonly isReadOnly: boolean;
  _isOpen: boolean;
  _isReset: boolean;
  constructor(envp: bigint, readOnly = false, parent: bigint | null = null) {
    this.txnp = lmdb.txn_begin(envp, parent, readOnly ? MDB_RDONLY : 0);
    this.envp = envp;
    this.isReadOnly = readOnly;
    this._isOpen = true;
    this._isReset = false;
  }
  get isOpen(): boolean {
    return this._isOpen;
  }
  get isReset(): boolean {
    return this._isReset;
  }
  private assertOpen(): void {
    if (!this.isOpen) throw new Error("This transaction is already closed");
  }
  commit(): void {
    this.assertOpen();
    lmdb.txn_commit(this.txnp);
    this._isOpen = false;
  }
  abort(): void {
    this.assertOpen();
    lmdb.txn_abort(this.txnp);
    this._isOpen = false;
  }
  reset(): void {
    this.assertOpen();
    if (this.isReset)
      throw new Error("This transaction has alredy been reset.");
    lmdb.txn_reset(this.txnp);
    this._isOpen = false;
    this._isReset = true;
  }
  renew(): void {
    if (!this.isReset) {
      throw new Error(
        "A transaction can only be renewed if it has been previously reset."
      );
    }
    lmdb.txn_renew(this.txnp);
    this._isOpen = true;
    this._isReset = false;
  }
  beginChildTxn(): Txn {
    return new Txn(this.envp, this.isReadOnly, this.txnp);
  }
  openDB(name: string | null, flags?: DbFlags): IDatabase<string> {
    throw new Error("Method not implemented.");
  }
}
