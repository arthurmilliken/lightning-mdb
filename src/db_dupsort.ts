import { copy } from "https://deno.land/std@0.130.0/bytes/mod.ts";
import { DbFlags, Database, PutFlags } from "./database.ts";
import { KeyExistsError } from "./dberror.ts";
import {
  MDB_DUPSORT,
  MDB_CREATE,
  MDB_REVERSEKEY,
  MDB_INTEGERKEY,
  MDB_DUPFIXED,
  MDB_REVERSEDUP,
  MDB_INTEGERDUP,
  MDB_APPEND,
  MDB_NOOVERWRITE,
  MDB_NODUPDATA,
} from "./lmdb_ffi.ts";
import { Transaction } from "./transaction.ts";

export interface DupFlags extends DbFlags {
  dupFixed?: boolean;
  reverseDup?: boolean;
  integerDup?: boolean;
}

export interface PutDupFlags extends PutFlags {
  noDupData?: boolean;
}

/**
 * A "Duplicate Key, Sorted Value" store, where each key
 * can have duplicate entries, sorted by value.
 */
export class DbDupsort extends Database {
  constructor(name: string, txn: Transaction, flags: DupFlags | number) {
    super(
      name,
      txn,
      typeof flags === "number"
        ? flags
        : MDB_DUPSORT |
            (flags.create ? MDB_CREATE : 0) |
            (flags.reverseKey ? MDB_REVERSEKEY : 0) |
            (flags.integerKey ? MDB_INTEGERKEY : 0) |
            (flags.dupFixed ? MDB_DUPFIXED : 0) |
            (flags.reverseDup ? MDB_REVERSEDUP : 0) |
            (flags.integerDup ? MDB_INTEGERDUP : 0)
    );
  }

  getFlags(txn: Transaction): DupFlags {
    const flags = this._getFlags(txn);
    return {
      create: !!(flags & MDB_CREATE),
      reverseKey: !!(flags & MDB_REVERSEKEY),
      integerKey: !!(flags & MDB_INTEGERKEY),
      dupFixed: !!(flags & MDB_DUPFIXED),
      reverseDup: !!(flags & MDB_REVERSEDUP),
      integerDup: !!(flags & MDB_INTEGERDUP),
    };
  }

  putUnsafe(
    key: ArrayBuffer,
    value: ArrayBuffer,
    txn: Transaction,
    flags: PutDupFlags
  ): void {
    return this._put(
      key,
      value,
      txn,
      (flags.append ? MDB_APPEND : 0) |
        (flags.noOverwrite ? MDB_NOOVERWRITE : 0) |
        (flags.noDupData ? MDB_NODUPDATA : 0)
    );
  }

  put(
    key: ArrayBuffer,
    value: ArrayBuffer,
    txn: Transaction,
    flags: PutDupFlags
  ): void {
    try {
      this.putUnsafe(key, value, txn, flags);
    } catch (err) {
      if (err instanceof KeyExistsError) {
        const keyU8 = new Uint8Array(this.dbKey.data);
        const keyCopy = new Uint8Array(this.dbKey.size);
        copy(keyU8, keyCopy);
        const valueU8 = new Uint8Array(this.dbValue.data);
        const valueCopy = new Uint8Array(this.dbValue.size);
        copy(valueU8, valueCopy);
        throw new KeyExistsError(keyCopy, valueCopy);
      } else throw err;
    }
  }
}
