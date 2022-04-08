/// <reference types="node" />
import { Database } from "./database";
import { Transaction } from "./transaction";
import { DbItem, Key, Value } from "./types";
export declare class Cursor<K extends Key = string> implements Cursor<K> {
    private _cursorp;
    get cursorp(): bigint;
    private txn;
    private db;
    protected _isOpen: boolean;
    get isOpen(): boolean;
    constructor(txn: Transaction, db: Database<K>);
    put(key: K, value: Value): void;
    del(): void;
    key(): K;
    keyBuffer(): Buffer;
    value(zeroCopy?: boolean): Buffer;
    /** @returns current value as string */
    asString(): string;
    /** @returns current value as number */
    asNumber(): number;
    /** @returns current value as boolean */
    asBoolean(): boolean;
    /** @returns current key (as Buffer) and value (as Buffer) */
    rawItem(includeKey?: boolean, includeValue?: boolean, zeroCopy?: boolean): DbItem<Buffer, Buffer>;
    item(includeValue?: boolean, zeroCopy?: boolean): {
        key: K | undefined;
        value: Buffer | undefined;
    };
    stringItem(): DbItem<K, string>;
    numberItem(): DbItem<K, number>;
    booleanItem(): DbItem<K, boolean>;
    first(): boolean;
    prev(skip?: number): boolean;
    next(skip?: number): boolean;
    last(): boolean;
    find(key: K): boolean;
    findNext(key: K): boolean;
    protected assertOpen(): void;
    close(): void;
    renew(txn: Transaction): void;
}
