import * as log from "https://deno.land/std@0.130.0/log/mod.ts";

type RequireOnlyOne<T, Keys extends keyof T = keyof T> = Pick<
  T,
  Exclude<keyof T, Keys>
> &
  {
    [K in Keys]-?: Required<Pick<T, K>> &
      Partial<Record<Exclude<Keys, K>, undefined>>;
  }[Keys];

interface Row {
  key: string;
  data: string;
}

interface CursorPosition {
  key: ArrayBuffer;
  exact?: boolean;
}

class Cursor implements Iterable<Row> {
  rows: Row[];
  constructor(rows: Row[]) {
    this.rows = rows;
  }

  [Symbol.iterator] = this.iterator;

  *iterator(): Generator<Row, void, ArrayBuffer | CursorPosition | undefined> {
    for (const row of this.rows) {
      const pos = yield row;
      if (pos) {
        // Set key to pos
      }
    }
    this.close();
  }

  close() {
    log.info("Cursor: closed.");
  }
}

try {
  const cur = new Cursor([
    { key: "a", data: "apple" },
    { key: "b", data: "banana" },
    { key: "c", data: "cherry" },
  ]);
  for (const row of cur) {
    log.info({ row });
  }
} catch (e) {
  log.error(e);
}
