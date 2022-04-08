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

interface MultimapCursor<K extends Key = string, V extends Key = string>
  extends ICursor<K> {
  firstDup(): boolean;
  findDup(key: K, value: V): boolean;
  findNextDup(key: K, value: V): boolean;
  prevKey(): boolean;
  prevDup(): boolean;
  nextDup(): boolean;
  nextKey(): boolean;
  lastDup(): boolean;

  currentPage(): V[];
  nextPage(): V[];
  prevPage(): V[];
}
