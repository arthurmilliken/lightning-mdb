class DbError extends Error {
  code: number;
  constructor(message: string, code: number = 500) {
    super(message);
    this.code = code;
  }
}

try {
  throw new DbError("BOOM!", 99);
} catch (e) {
  const err = <DbError>e;
  console.log({
    err,
    name: err.name,
    code: err.code,
    isDbError: err instanceof DbError,
  });
}
