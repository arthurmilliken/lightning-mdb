import {
  lmdb,
  MDB_CREATE,
  MDB_INTEGERKEY,
  MDB_REVERSEKEY,
} from "./lmdb_ffi.ts";
import { DbError } from "./dberror.ts";
import { Transaction } from "./transaction.ts";
import { DbValue } from "./dbvalue.ts";
import { DbStat } from "./dbstat.ts";

export interface DbFlags {
  create?: boolean;
  reverseKey?: boolean;
  integerKey?: boolean;
}

export const notOpen = () => new DbError("Database is not open.");
const DROP_EMPTY = 0;
const DROP_DELETE = 1;

export class Database {
  name: string;
  flags?: DbFlags;
  dbi = 0;

  constructor(name: string) {
    this.name = name;
  }

  protected _open(txn: Transaction, flags: number): void {
    const nameVal = new DbValue();
    nameVal.data = new TextEncoder().encode(this.name);
    const fdbi = new Uint32Array(1);
    const rc = lmdb.ffi_dbi_open(txn.ftxn, nameVal.byteArray, flags, fdbi);
    if (rc) throw DbError.from(rc);
    this.dbi = fdbi[0];
  }

  open(txn: Transaction, flags: DbFlags): void {
    this.flags = flags;
    this._open(
      txn,
      (flags.create ? MDB_CREATE : 0) |
        (flags.reverseKey ? MDB_REVERSEKEY : 0) |
        (flags.integerKey ? MDB_INTEGERKEY : 0)
    );
  }

  stat(txn: Transaction): DbStat {
    if (!this.dbi) throw notOpen();
    const fstat = new Float64Array(DbStat.LENGTH);
    const rc = lmdb.ffi_stat(txn.ftxn, this.dbi, fstat);
    if (rc) throw DbError.from(rc);
    return new DbStat(fstat);
  }

  drop(txn: Transaction, del = DROP_DELETE): void {
    if (!this.dbi) throw notOpen();
    const rc = lmdb.ffi_drop(txn.ftxn, this.dbi, del);
    if (rc) throw DbError.from(rc);
    if (del === DROP_DELETE) this.dbi = 0;
  }

  clear(txn: Transaction) {
    return this.drop(txn, DROP_EMPTY);
  }

  private fflags = new Uint32Array(1);
  protected _getFlags(txn: Transaction): number {
    if (!this.dbi) throw notOpen();
    const rc = lmdb.ffi_dbi_flags(txn.ftxn, this.dbi, this.fflags);
    if (rc) throw DbError.from(rc);
    return this.fflags[0];
  }

  getFlags(txn: Transaction): DbFlags {
    const flags = this._getFlags(txn);
    return {
      create: !!(flags & MDB_CREATE),
      reverseKey: !!(flags & MDB_REVERSEKEY),
      integerKey: !!(flags & MDB_INTEGERKEY),
    };
  }
}
