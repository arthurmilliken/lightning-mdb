/// <reference types="node" />
import { Transaction } from "./transaction";
import { CursorOptions, CursorPutFlags, ICursor, ICursorItem, Key } from "./types";
export declare class CursorItem<K extends Key = string> implements ICursorItem<K> {
    _cursor: Cursor<K>;
    get cursor(): Cursor<K>;
    constructor(cursor: Cursor<K>);
    key(): K | null;
    value(): Buffer | null;
    valueString(): string | null;
    valueNumber(): number | null;
    valueBoolean(): boolean | null;
    detach(): void;
}
export declare class Cursor<K extends Key = string> implements ICursor<K> {
    cursorp: bigint;
    txnp: bigint;
    options: CursorOptions<K>;
    dbi: number;
    constructor(txnp: bigint, dbi: number, options: CursorOptions<K>);
    key(): K | null;
    value(): Buffer | null;
    valueString(): string | null;
    valueNumber(): number | null;
    valueBoolean(): boolean | null;
    detach(): void;
    close(): void;
    renew(txn: Transaction): void;
    put(key: Buffer, value: Buffer, flags: CursorPutFlags): void;
    del(noDupData?: boolean): void;
    first(): ICursorItem<K> | null;
    current(): ICursorItem<K> | null;
    last(): ICursorItem<K> | null;
    next(steps?: number): ICursorItem<K> | null;
    prev(steps?: number): ICursorItem<K> | null;
    find(key: K): ICursorItem<K> | null;
    findEntry(key: K): ICursorItem<K> | null;
    findNext(key: K): ICursorItem<K> | null;
    iterator(): Generator<ICursorItem<K>, void, K>;
}
