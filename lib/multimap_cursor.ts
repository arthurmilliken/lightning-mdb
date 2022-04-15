import { lmdb } from "./binding";
import { CursorOp } from "./constants";
import { Cursor } from "./cursor";
import { Multimap } from "./multimap";
import { Transaction } from "./transaction";
import { Key } from "./types";

export class MultimapCursor<
  K extends Key = string,
  V extends Key = string
> extends Cursor<K> {
  protected db: Multimap<K, V>;
  constructor(db: Multimap<K, V>, txn?: Transaction) {
    super(db, txn);
    this.db = db;
  }

  /**
   * Move cursor to the first key/value entry (of possibly many) corresponding
   * to the current key
   * @returns true if entry exists, false otherwise
   */
  firstDup(): boolean {
    this.assertOpen();
    const result = lmdb.cursor_get({
      cursorp: this.cursorp,
      op: CursorOp.FIRST_DUP,
    });
    if (!result) return false;
    else return true;
  }

  /**
   * Move cursor to the last key/value entry (of possibly many) corresponding
   * to the current key
   * @returns true if entry exists, false otherwise */
  lastDup(): boolean {
    this.assertOpen();
    const result = lmdb.cursor_get({
      cursorp: this.cursorp,
      op: CursorOp.LAST_DUP,
    });
    if (!result) return false;
    else return true;
  }

  /**
   * Move cursor to the next key/value entry corresponding to the current key
   * @param skip the number of entries to skip
   * @returns false if no such entry exists, true otherwise
   */
  nextDup(skip = 0): boolean {
    this.assertOpen();
    while (skip-- >= 0) {
      const result = lmdb.cursor_get({
        cursorp: this.cursorp,
        op: CursorOp.NEXT_DUP,
      });
      if (!result) return false;
    }
    return true;
  }

  /**
   * Move cursor to the previous key/value entry corresponding to the current key
   * @param skip the number of entries to skip
   * @returns false if no such entry exists, true otherwise
   */
  prevDup(skip = 0): boolean {
    this.assertOpen();
    while (skip-- >= 0) {
      const result = lmdb.cursor_get({
        cursorp: this.cursorp,
        op: CursorOp.PREV_DUP,
      });
      if (!result) return false;
    }
    return true;
  }

  /** Move cursor to the given key/value entry. If entry does not exist, this
   * function will move the cursor the next adjacent entry and return false.
   * @returns true if entry exists, false otherwise */
  findDup(key: K, value: V): boolean {
    this.assertOpen();
    const result = lmdb.cursor_get({
      cursorp: this.cursorp,
      op: CursorOp.GET_BOTH,
      key: this.db.encodeKey(key),
      value: this.db.encodeValue(value),
    });
    if (!result) return false;
    else return true;
  }

  /** Move the cursor to given key/value entry or next adjacent entry
   * @returns false if no entry found, true otherwise */
  findNextDup(key: K, value: V): boolean {
    this.assertOpen();
    const result = lmdb.cursor_get({
      cursorp: this.cursorp,
      op: CursorOp.GET_BOTH_RANGE,
      key: this.db.encodeKey(key),
      value: this.db.encodeValue(value),
    });
    if (!result) return false;
    else return true;
  }

  /**
   * Move the cursor to the first entry under the next key
   * @param skip the number of keys to skip
   * @returns false if no entry found, true otherwise
   */
  nextKey(skip = 0): boolean {
    this.assertOpen();
    while (skip-- >= 0) {
      const result = lmdb.cursor_get({
        cursorp: this.cursorp,
        op: CursorOp.NEXT_NODUP,
      });
      if (!result) return false;
    }
    return true;
  }

  /**
   * Move the cursor to the last entry under the previous key
   * @param skip the number of keys to skip
   * @returns false if no entry found, true otherwise
   */
  prevKey(skip = 0): boolean {
    this.assertOpen();
    while (skip-- >= 0) {
      const result = lmdb.cursor_get({
        cursorp: this.cursorp,
        op: CursorOp.PREV_NODUP,
      });
      if (!result) return false;
    }
    return true;
  }

  currentPage(): boolean {
    this.assertDupFixed();
    throw new Error("Method not implemented.");
  }
  nextPage(skip = 0): boolean {
    this.assertDupFixed();
    throw new Error("Method not implemented.");
  }
  prevPage(skip = 0): boolean {
    this.assertDupFixed();
    throw new Error("Method not implemented.");
  }

  protected assertDupFixed(): void {
    this.assertOpen();
    if (!this.db.isDupFixed) {
      throw new Error(
        "This is only supported for Multimaps where isDupFixed === true"
      );
    }
  }
}
