"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const { Worker, isMainThread, parentPort, workerData, } = require("worker_threads");
const { lmdb } = require("./binding");
class Env {
    constructor(penv) {
        if (penv)
            this.penv = penv;
        else
            this.penv = lmdb.env_create();
    }
    open(path, flags, mode) {
        lmdb.env_open(this.penv, path, flags, mode);
    }
    close() {
        if (!isMainThread)
            throw Error("Env can only be closed from the main thread");
        lmdb.env_close(this.penv);
    }
    stat() {
        return lmdb.env_stat(this.penv);
    }
    serialize() {
        return this.penv;
    }
    static deserialize(penv) {
        return new Env(penv);
    }
}
if (isMainThread) {
    function main() {
        return __awaiter(this, void 0, void 0, function* () {
            const env = new Env();
            env.open(".testdb", 0, 0o0664);
            const stat = env.stat();
            console.log({ m: "main", stat });
            const config = { penv: env.serialize() };
            const worker = new Worker(__filename, { workerData: config });
            const wstat = yield new Promise((resolve, reject) => {
                worker.on("message", (message) => {
                    resolve(message);
                    worker.terminate();
                });
                worker.on("error", (err) => {
                    reject(err);
                    worker.terminate();
                });
                worker.on("exit", (code) => {
                    if (code !== 0) {
                        reject(new Error(`Worker exited with code: ${code}`));
                    }
                });
            });
            console.log({ m: "main", wstat });
            env.close();
            console.log({ m: "main:env.close()" });
        });
    }
    main();
}
else {
    const config = workerData;
    console.log({ m: "worker", config });
    const env = Env.deserialize(config.penv);
    const stat = env.stat();
    parentPort.postMessage(stat);
}
//# sourceMappingURL=worker.js.map