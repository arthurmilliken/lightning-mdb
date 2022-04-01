import { Worker, isMainThread, parentPort, workerData } from "worker_threads";
import { setTimeout } from "timers/promises";
import { Environment, openEnv } from "./environment";
import { Database } from "./database";
import os from "os";

const ITERATIONS = 100000;

async function main() {
  const start = Date.now();
  const env = await openEnv(".testdb");
  const db = env.openDB(null);
  const workers: Worker[] = [];
  const cpus = os.cpus().length;
  for (let i = 0; i < cpus; i++) {
    workers.push(
      new Worker(__filename, {
        workerData: {
          env: env.serialize(),
          db: db.serialize(),
          start,
          i,
        },
      })
    );
  }
  await setTimeout(1000 - (Date.now() - start));
  console.log({ ts: Date.now(), m: "main: after sleep." });
  const s = process.hrtime();
  for (let i = 0; i < ITERATIONS; i++) {
    const txn = env.beginTxn(true);
    const a = db.getString("a", txn);
    const b = db.getString("b", txn);
    const c = db.getString("c", txn);
    if (i < 1) {
      console.log({
        m: "main",
        a: a?.toString(),
        b: b?.toString(),
        c: c?.toString(),
      });
    }
    txn.abort();
  }
  const d = process.hrtime(s);
  console.log({ ts: Date.now(), d, i: ITERATIONS, m: "main: done." });
  await setTimeout(500);
  for (const worker of workers) worker.terminate();
}

async function work() {
  const start = workerData.start;
  const env = Environment.deserialize(workerData.env);
  const db = Database.deserialize(workerData.db);
  const idx = workerData.i;
  await setTimeout(1000 - (Date.now() - start));
  console.log({ ts: Date.now(), m: `(w${idx}): after sleep.` });
  const s = process.hrtime();
  for (let i = 0; i < ITERATIONS; i++) {
    const txn = env.beginTxn(true);
    const a = db.getString("a", txn);
    const b = db.getString("b", txn);
    const c = db.getString("c", txn);
    if (i < 1) {
      console.log({
        m: "work",
        a: a?.toString(),
        b: b?.toString(),
        c: c?.toString(),
      });
    }
    txn.abort();
  }
  const d = process.hrtime(s);
  console.log({ ts: Date.now(), d, i: ITERATIONS, m: `(w${idx}): done.` });
}

if (isMainThread) {
  main();
} else {
  work();
}
