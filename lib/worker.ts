import { Worker, isMainThread, parentPort, workerData } from "worker_threads";
import { Environment, openEnv } from "./environment";
import { Database } from "./database";
import os from "os";

const ITERATIONS = 100000;

const encoding = "utf8";

async function main() {
  const start = Date.now();
  const env = await openEnv(".testdb", { mapSize: 1024 * 1024 * 1024 });
  const db = env.openDB(null);
  const txn = env.beginTxn();
  db.clear(txn);
  const buf = Buffer.alloc(1024 * Math.pow(2, 3), "-", encoding); // 8KiB
  buf.write("apple ", encoding);
  db.put("a", buf, txn);
  buf.write("banana ", encoding);
  db.put("b", buf, txn);
  buf.write("cherry ", encoding);
  db.put("c", buf, txn);
  txn.commit();

  const s = process.hrtime();
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

  let totalLength = 0;
  for (let i = 0; i < ITERATIONS; i++) {
    const cursor = db.openCursor();
    for (const value of cursor.getStrings()) {
      totalLength += value.length;
    }
    cursor.close();
  }
  const promises = [];
  for (const worker of workers) {
    promises.push(
      new Promise((resolve, reject) => {
        worker
          .on("message", (e) => {
            resolve(e);
            worker.terminate();
          })
          .on("error", reject);
      })
    );
  }
  const results = await Promise.all(promises);
  const duration = process.hrtime(s);
  let micros =
    (duration[0] * 1000000000 + duration[1]) /
    (ITERATIONS * (workers.length + 1) * 1000 * 3);
  micros = Math.round(micros * 1000) / 1000;
  console.log({
    ts: new Date().toISOString(),
    duration: duration,
    operations: ITERATIONS * (workers.length + 1) * 3,
    micros_per_op: micros,
    buf_size: buf.byteLength,
    total_chars: totalLength * (workers.length + 1),
    m: "main: done.",
  });
}

async function work() {
  const start = workerData.start;
  const env = Environment.deserialize(workerData.env);
  const db = Database.deserialize(workerData.db);
  const idx = workerData.i;
  const s = process.hrtime();
  let totalLength = 0;
  for (let i = 0; i < ITERATIONS; i++) {
    const cursor = db.openCursor();
    for (const value of cursor.getStrings()) {
      totalLength += value.length;
    }
    cursor.close();
  }
  const d = process.hrtime(s);
  parentPort?.postMessage({ idx, ITERATIONS, d, totalLength });
}

if (isMainThread) {
  main();
} else {
  work();
}
