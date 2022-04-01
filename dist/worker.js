"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const worker_threads_1 = require("worker_threads");
const promises_1 = require("timers/promises");
const environment_1 = require("./environment");
const database_1 = require("./database");
const os_1 = __importDefault(require("os"));
const ITERATIONS = 100000;
async function main() {
    const start = Date.now();
    const env = await environment_1.openEnv(".testdb");
    const db = env.openDB(null);
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
    await promises_1.setTimeout(1000 - (Date.now() - start));
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
    await promises_1.setTimeout(500);
    for (const worker of workers)
        worker.terminate();
}
async function work() {
    const start = worker_threads_1.workerData.start;
    const env = environment_1.Environment.deserialize(worker_threads_1.workerData.env);
    const db = database_1.Database.deserialize(worker_threads_1.workerData.db);
    const idx = worker_threads_1.workerData.i;
    await promises_1.setTimeout(1000 - (Date.now() - start));
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
if (worker_threads_1.isMainThread) {
    main();
}
else {
    work();
}
//# sourceMappingURL=worker.js.map