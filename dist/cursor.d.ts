/// <reference types="node" />
import { Transaction } from "./transaction";
import { DbItem, Key, KeyType, Value } from "./types";
export declare class Cursor<K extends Key = string> implements Cursor<K> {
    private _cursorp;
    get cursorp(): bigint;
    private _txnp;
    get txnp(): bigint;
    private _dbi;
    get dbi(): number;
    private _isOpen;
    get isOpen(): boolean;
    private _keyType;
    get keyType(): KeyType;
    constructor(txnp: bigint, dbi: number, keyType: KeyType);
    put(key: K, value: Value): void;
    del(): void;
    protected decodeKey(keyBuf: Buffer): K;
    key(): K;
    value(zeroCopy?: boolean): Buffer;
    asString(): string;
    asNumber(): number;
    asBoolean(): boolean;
    item(zeroCopy?: boolean): DbItem<K, Buffer>;
    stringItem(): DbItem<K, string>;
    numberItem(): DbItem<K, number>;
    booleanItem(): DbItem<K, boolean>;
    first(): boolean;
    prev(skip?: number): boolean;
    next(skip?: number): boolean;
    last(): boolean;
    find(key: Buffer): boolean;
    findNext(key: Buffer): boolean;
    protected assertOpen(): void;
    close(): void;
    renew(txn: Transaction): void;
}
