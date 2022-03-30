import { DbStat } from "./types";
const {
  Worker,
  isMainThread,
  parentPort,
  workerData,
} = require("worker_threads");
const { lmdb } = require("./binding");

class Env {
  readonly penv: bigint;
  constructor(penv?: bigint) {
    if (penv) this.penv = penv;
    else this.penv = lmdb.env_create();
  }
  open(path: string, flags: number, mode: number) {
    lmdb.env_open(this.penv, path, flags, mode);
  }
  close() {
    if (!isMainThread)
      throw Error("Env can only be closed from the main thread");
    lmdb.env_close(this.penv);
  }
  stat(): DbStat {
    return lmdb.env_stat(this.penv);
  }
  serialize(): bigint {
    return this.penv;
  }
  static deserialize(penv: bigint): Env {
    return new Env(penv);
  }
}

interface WorkerConfig {
  penv: bigint;
}

if (isMainThread) {
  async function main() {
    const env = new Env();
    env.open(".testdb", 0, 0o0664);
    const stat = env.stat();
    console.log({ m: "main", stat });
    const config: WorkerConfig = { penv: env.serialize() };
    const worker = new Worker(__filename, { workerData: config });
    const wstat: DbStat = await new Promise((resolve, reject) => {
      worker.on("message", (message: DbStat) => {
        resolve(message);
        worker.terminate();
      });
      worker.on("error", (err: Error) => {
        reject(err);
        worker.terminate();
      });
      worker.on("exit", (code: number) => {
        if (code !== 0) {
          reject(new Error(`Worker exited with code: ${code}`));
        }
      });
    });
    console.log({ m: "main", wstat });
    env.close();
    console.log({ m: "main:env.close()" });
  }
  main();
} else {
  const config: WorkerConfig = workerData;
  console.log({ m: "worker", config });
  const env = Env.deserialize(config.penv);
  const stat: DbStat = env.stat();
  parentPort.postMessage(stat);
}
