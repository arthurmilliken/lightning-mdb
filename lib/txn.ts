import { Database, DbFlags, ITxn } from "./types";

export class Txn implements ITxn {
  txnp: bigint;
  constructor(txnp: bigint) {
    this.txnp = txnp;
  }
  commit(): void {
    throw new Error("Method not implemented.");
  }
  abort(): void {
    throw new Error("Method not implemented.");
  }
  reset(): void {
    throw new Error("Method not implemented.");
  }
  renew(): void {
    throw new Error("Method not implemented.");
  }
  openDB(name: string | null, flags?: DbFlags): Database<string> {
    throw new Error("Method not implemented.");
  }
}
