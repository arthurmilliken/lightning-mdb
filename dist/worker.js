"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const worker_threads_1 = require("worker_threads");
const promises_1 = require("timers/promises");
const environment_1 = require("./environment");
const database_1 = require("./database");
const ITERATIONS = 100000;
async function main() {
    const start = Date.now();
    const env = await environment_1.openEnv(".testdb", { mapSize: 1024 * 1024 * 1024 });
    const db = env.openDB(null);
    // const workers: Worker[] = [];
    // const cpus = os.cpus().length;
    // for (let i = 0; i < cpus; i++) {
    //   workers.push(
    //     new Worker(__filename, {
    //       workerData: {
    //         env: env.serialize(),
    //         db: db.serialize(),
    //         start,
    //         i,
    //       },
    //     })
    //   );
    // }
    const txn = env.beginTxn();
    db.clear(txn);
    const buf = Buffer.alloc(1024 * Math.pow(2, 3), "-", "utf16le"); // 8KiB
    buf.write("apple ", "utf16le");
    db.put("a", buf, txn);
    buf.write("banana ", "utf16le");
    db.put("b", buf, txn);
    buf.write("cherry ", "utf16le");
    db.put("c", buf, txn);
    txn.commit();
    await promises_1.setTimeout(1000 - (Date.now() - start));
    console.log({ ts: Date.now(), m: "main: after sleep." });
    let totalBytes = 0;
    const s = process.hrtime();
    for (let i = 0; i < ITERATIONS; i++) {
        const txn = env.beginTxn(true);
        const a = db.getString("a", txn);
        const b = db.getString("b", txn);
        const c = db.getString("c", txn);
        totalBytes += (a?.length || 0) + (b?.length || 0) + (c?.length || 0);
        if (i < 1) {
            console.log({
                m: "main",
                a: a?.slice(0, 32),
                alen: a?.length,
                b: b?.slice(0, 32),
                blen: b?.length,
                c: c?.slice(0, 32),
                clen: c?.length,
            });
        }
        // a ? detachBuffer(a) : {};
        // b ? detachBuffer(b) : {};
        // c ? detachBuffer(c) : {};
        txn.abort();
    }
    const d = process.hrtime(s);
    const micros = (d[0] * 1000000000 + d[1]) / (ITERATIONS * 1000);
    console.log({
        ts: Date.now(),
        d,
        i: ITERATIONS,
        micros,
        buf: buf.byteLength,
        totalBytes,
        m: "main: done.",
    });
    await promises_1.setTimeout(500);
    // for (const worker of workers) worker.terminate();
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
    const iterations = 100000;
    const encoding = "utf16le";
    const buf = Buffer.alloc(1024 * Math.pow(2, 7), "-", encoding); // 64KiB
    buf.write("Hello, everybody, this is my BOOM stick!", encoding);
    const str = buf.toString(encoding);
    let start = process.hrtime();
    let encoded = 0;
    for (let i = 0; i < iterations; i++) {
        encoded += Buffer.from(str, encoding).byteLength;
    }
    let duration = process.hrtime(start);
    let micros = (duration[0] * 1000000000 + duration[1]) / iterations / 1000;
    console.log({
        encoding,
        iterations,
        encoded,
        duration,
        micros,
        bufSize: buf.byteLength,
    });
    start = process.hrtime();
    let decoded = 0;
    for (let i = 0; i < iterations; i++) {
        decoded += buf.toString(encoding).length;
    }
    duration = process.hrtime(start);
    micros = (duration[0] * 1000000000 + duration[1]) / iterations / 1000;
    console.log({
        encoding,
        iterations,
        decoded,
        duration,
        micros,
        bufSize: buf.byteLength,
    });
    // main();
}
else {
    // work();
}
//# sourceMappingURL=worker.js.map