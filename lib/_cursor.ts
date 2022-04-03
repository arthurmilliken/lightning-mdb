import { CountQueuingStrategy } from "stream/web";

interface Txn {}
interface Key {}
interface Value {}

interface Query<K extends Key = string> {
  start?: K;
  end?: K;
  reverse?: boolean;
  limit?: boolean;
}

interface IDatabase<K extends Key = string> {
  query(q?: Query): ICursor<K>;

  keys(q?: Query): Generator<K, boolean, K>;
  values(q?: Query & { zeroCopy?: boolean }): Generator<Buffer, boolean, K>;
  items(q?: Query & { zeroCopy?: boolean }): Generator<[K, Buffer], boolean, K>;

  strings(q?: Query): Generator<string, boolean, K>;
  numbers(q?: Query): Generator<number, boolean, K>;
  booleans(q?: Query): Generator<boolean, boolean, K>;

  stringItems(q?: Query): Generator<[K, string], boolean, K>;
  numberItems(q?: Query): Generator<[K, number], boolean, K>;
  booleanItems(q?: Query): Generator<[K, boolean], boolean, K>;

  count(q?: Omit<Query, "reverse">): number;
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

interface MultimapCursor<K = string, V = string> extends ICursor<K> {
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
