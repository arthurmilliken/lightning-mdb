"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const worker_threads_1 = require("worker_threads");
const environment_1 = require("./environment");
const database_1 = require("./database");
const os_1 = __importDefault(require("os"));
const ITERATIONS = 100000;
const encoding = "utf8";
async function main() {
    const start = Date.now();
    const env = await environment_1.openEnv(".testdb", { mapSize: 1024 * 1024 * 1024 });
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
    const workers = [];
    const cpus = os_1.default.cpus().length;
    for (let i = 0; i < cpus; i++) {
        workers.push(new worker_threads_1.Worker(__filename, {
            workerData: {
                env: env.serialize(),
                db: db.serialize(),
                start,
                i,
            },
        }));
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
        promises.push(new Promise((resolve, reject) => {
            worker
                .on("message", (e) => {
                resolve(e);
                worker.terminate();
            })
                .on("error", reject);
        }));
    }
    const results = await Promise.all(promises);
    const duration = process.hrtime(s);
    let micros = (duration[0] * 1000000000 + duration[1]) /
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
    const start = worker_threads_1.workerData.start;
    const env = environment_1.Environment.deserialize(worker_threads_1.workerData.env);
    const db = database_1.Database.deserialize(worker_threads_1.workerData.db);
    const idx = worker_threads_1.workerData.i;
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
    worker_threads_1.parentPort?.postMessage({ idx, ITERATIONS, d, totalLength });
}
if (worker_threads_1.isMainThread) {
    main();
}
else {
    work();
}
//# sourceMappingURL=worker.js.map