/// <reference types="node" />
import { Transaction } from "./transaction";
import { CursorItem, Key, Value } from "./types";
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
    item(zeroCopy?: boolean): CursorItem<K, Buffer>;
    stringItem(): CursorItem<K, string>;
    numberItem(): CursorItem<K, number>;
    booleanItem(): CursorItem<K, boolean>;
    first(): boolean;
    prev(skip?: number): boolean;
    next(skip?: number): boolean;
    last(): boolean;
    find(key: Buffer): boolean;
    findNext(key: Buffer): boolean;
}
