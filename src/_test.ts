import * as log from "https://deno.land/std@0.130.0/log/mod.ts";

const buf = new Uint8Array(8);
log.info(buf.buffer instanceof ArrayBuffer);
