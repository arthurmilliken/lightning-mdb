/// <reference types="node" />
interface Txn {
}
interface Key {
}
interface Value {
}
export interface ICursor<K extends Key = string> {
    readonly cursorp: bigint;
    close(): void;
    renew(txn: Txn): void;
    put(key: K, value: Value): void;
    del(): void;
    key(): K;
    value(zeroCopy?: boolean): Buffer;
    asString(): string;
    asNumber(): number;
    asBoolean(): boolean;
    item(zeroCopy?: boolean): [K, Buffer];
    stringItem(): [K, string];
    numberItem(): [K, number];
    booleanItem(): [K, boolean];
    first(): boolean;
    prev(skip?: number): boolean;
    next(skip?: number): boolean;
    last(): boolean;
    find(key: Buffer): boolean;
    findNext(key: Buffer): boolean;
}
export {};
