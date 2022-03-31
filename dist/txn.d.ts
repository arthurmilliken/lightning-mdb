import { Database, DbFlags, ITxn } from "./types";
export declare class Txn implements ITxn {
    txnp: bigint;
    constructor(txnp: bigint);
    commit(): void;
    abort(): void;
    reset(): void;
    renew(): void;
    openDB(name: string | null, flags?: DbFlags): Database<string>;
}
