/// <reference no-default-lib="true" />
/// <reference lib="deno.worker" />

import * as log from "https://deno.land/std@0.130.0/log/mod.ts";
import { Cursor } from "./cursor.ts";
import { Database } from "./database.ts";
import { EnvMessage, Environment } from "./environment.ts";

if (Worker) {
  log.info({ ts: Date.now(), m: "WORKER: start" });
  self.onmessage = async (e) => {
    try {
      const message: EnvMessage = e.data;
      log.info({ ts: Date.now(), m: "WORKER: onmessage", message });
      const env = Environment.fromMessage(message);
      log.info({
        ts: Date.now(),
        m: "WORKER: after new Environment()",
        path: env.getPath(),
        stat: env.stat().asRecord(),
        info: env.info(),
      });
      const db = new Database(null, env);
      await db.putAsync("b", "basking shark");
      await db.putAsync("a", "aardvark");
      await db.putAsync("c", "(filthy) cheetah");
      const cursor = new Cursor(db);
      for (const item of cursor) {
        log.info({ key: item.keyString(), value: item.valueString() });
      }
      self.postMessage("WORKER: done!");
    } catch (err) {
      log.error(err);
    }
  };
}
