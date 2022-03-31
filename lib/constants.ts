export const MDB_CP_COMPACT = 0x01;
export const MDB_RDONLY = 0x20000;
export enum SetFlags {
  OFF = 0,
  ON = 1,
}

export enum EnvFlag {
  FIXEDMAP = 0x01,
  NOSUBDIR = 0x4000,
  NOSYNC = 0x10000,
  RDONLY = MDB_RDONLY,
  NOMETASYNC = 0x40000,
  WRITEMAP = 0x80000,
  MAPASYNC = 0x100000,
  NOTLS = 0x200000,
  NOLOCK = 0x400000,
  NORDAHEAD = 0x800000,
  NOMEMINIT = 0x1000000,
}

export enum DbFlag {
  REVERSEKEY = 0x02,
  /** use sorted duplicates */
  DUPSORT = 0x04,
  INTEGERKEY = 0x08,
  DUPFIXED = 0x10,
  INTEGERDUP = 0x20,
  REVERSEDUP = 0x40,
  CREATE = 0x40000,
}

export enum PutFlag {
  NOOVERWRITE = 0x10,
  NODUPDATA = 0x20,
  /** For mdb_cursor_put: overwrite the current key/data pair */
  CURRENT = 0x40,
  RESERVE = 0x10000,
  APPEND = 0x20000,
  APPENDDUP = 0x40000,
  MULTIPLE = 0x80000,
}

export enum CursorOp {
  FIRST = 0,
  FIRST_DUP /* dupsort only */,
  GET_BOTH /* dupsort only */,
  GET_BOTH_RANGE /* dupsort only */,
  GET_CURRENT,
  GET_MULTIPLE /* dupfixed only */,
  LAST,
  LAST_DUP /* dupsort only */,
  NEXT,
  NEXT_DUP /* dupsort only */,
  NEXT_MULTIPLE /* dupfixed only */,
  NEXT_NODUP /* dupsort only */,
  PREV,
  PREV_DUP /* dupsort only */,
  PREV_NODUP /* dupsort only */,
  SET,
  SET_KEY,
  SET_RANGE,
  PREV_MULTIPLE /* dupfixed only */,
}
