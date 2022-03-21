import { DbFlags, Database } from "./database.ts";
import {
  MDB_DUPSORT,
  MDB_CREATE,
  MDB_REVERSEKEY,
  MDB_INTEGERKEY,
  MDB_DUPFIXED,
  MDB_REVERSEDUP,
  MDB_INTEGERDUP,
} from "./lmdb_ffi.ts";
import { Transaction } from "./transaction.ts";

export interface DupsortFlags extends DbFlags {
  dupFixed?: boolean;
  reverseDup?: boolean;
  integerDup?: boolean;
}

export class DbDupsort extends Database {
  constructor(name: string) {
    super(name);
  }

  open(txn: Transaction, flags: DupsortFlags): void {
    this.flags = flags;
    this._open(
      txn,
      MDB_DUPSORT |
        (flags.create ? MDB_CREATE : 0) |
        (flags.reverseKey ? MDB_REVERSEKEY : 0) |
        (flags.integerKey ? MDB_INTEGERKEY : 0) |
        (flags.dupFixed ? MDB_DUPFIXED : 0) |
        (flags.reverseDup ? MDB_REVERSEDUP : 0) |
        (flags.integerDup ? MDB_INTEGERDUP : 0)
    );
  }

  getFlags(txn: Transaction): DupsortFlags {
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
}
