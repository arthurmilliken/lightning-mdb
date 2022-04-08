/// <reference types="node" />
import { Transaction } from "./transaction";
import { DbItem, Key, Value } from "./types";
export interface ICursor<K extends Key = string> {
    readonly cursorp: bigint;
    close(): void;
    renew(txn: Transaction): void;
    put(key: K, value: Value): void;
    del(): void;
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
}
