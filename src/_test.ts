import * as log from "https://deno.land/std@0.130.0/log/mod.ts";

const s = Symbol("hello");
log.info({ s });
