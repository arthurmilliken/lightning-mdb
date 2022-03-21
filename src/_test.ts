import * as log from "https://deno.land/std@0.130.0/log/mod.ts";

class DbError extends Error {
  code: number;
  constructor(message: string, code: number = 500) {
    super(message);
    this.code = code;
  }
}

try {
  throw new DbError("BOOM!", 99);
  // throw new Error("boom");
} catch (e) {
  const err = <DbError>e;
  log.error(err);
}
