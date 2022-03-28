import { EnvOptions } from "./types";

const { lmdb } = require("./binding");

function main() {
  console.log("hello from start!");

  // "real" methods
  console.log(lmdb.version());
  console.log({ err: 5, strerror: lmdb.strerror(5) });

  const penv = lmdb.env_create();
  console.log({ penv: penv.toString(16), type: typeof penv });
  lmdb.env_open(penv, ".testdb", 0, 0o664);
  const stat = lmdb.env_stat(penv);
  console.log({ stat });
  const envinfo = lmdb.env_info(penv);
  console.log({ envinfo });
  const path = lmdb.env_get_path(penv);
  console.log({ path });
}

main();
