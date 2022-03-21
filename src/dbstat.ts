import { DbError } from "./dberror.ts";

export class DbStat {
  static LENGTH = 6;
  private static PSIZE = 0;
  private static DEPTH = 1;
  private static BRANCH_PAGES = 2;
  private static LEAF_PAGES = 3;
  private static OVERFLOW_PAGES = 4;
  private static ENTRIES = 5;

  fstat: Float64Array;

  constructor(fstat: Float64Array) {
    if (fstat.length !== DbStat.LENGTH) {
      throw new DbError(
        `new DbStat(): fstat must be a Float64Array of length ${DbStat.LENGTH}`
      );
    }
    this.fstat = fstat;
  }
  get pageSize() {
    return this.fstat[DbStat.PSIZE];
  }
  get depth() {
    return this.fstat[DbStat.DEPTH];
  }
  get branchPages() {
    return this.fstat[DbStat.BRANCH_PAGES];
  }
  get leafPages() {
    return this.fstat[DbStat.LEAF_PAGES];
  }
  get overflowPages() {
    return this.fstat[DbStat.OVERFLOW_PAGES];
  }
  get entries() {
    return this.fstat[DbStat.ENTRIES];
  }
  asRecord(): Record<string, number> {
    return {
      pageSize: this.pageSize,
      depth: this.depth,
      branchPages: this.branchPages,
      leafPages: this.leafPages,
      overflowPages: this.overflowPages,
      entries: this.entries,
    };
  }
}
