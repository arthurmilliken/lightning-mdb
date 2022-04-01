import { Database, DbOptions } from "./database";
export declare class Transaction {
    readonly txnp: bigint;
    readonly envp: bigint;
    readonly isReadOnly: boolean;
    _isOpen: boolean;
    _isReset: boolean;
    constructor(envp: bigint, readOnly?: boolean, parent?: bigint | null);
    get isOpen(): boolean;
    get isReset(): boolean;
    private assertOpen;
    commit(): void;
    abort(): void;
    reset(): void;
    renew(): void;
    beginChildTxn(): Transaction;
    openDB(name: string | null, flags?: DbOptions): Database<string>;
}
