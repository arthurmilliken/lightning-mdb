import { readLines } from "https://deno.land/std@0.129.0/io/buffer.ts";
const f = await Deno.open("./data/quotes.txt");
const lines: string[] = [];
for await (const line of readLines(f)) {
  if (line.trim()) lines.push(line);
}
const numLines = lines.length;
const LIMIT = 1000000;

console.log({ LIMIT, m: "encoding strings into utf8 with TextEncoder" });
const encoder = new TextEncoder();
let chars = 0;
let start = Date.now();
for (let i = 0; i < LIMIT; i++) {
  const encoded = encoder.encode(lines[i % numLines]);
  chars += encoded.byteLength;
}
let end = Date.now();
console.log(
  { numLines: LIMIT, chars, ms: end - start },
  "after encoding with TextEncoder"
);

function str2ab(str: string): ArrayBuffer {
  const buf = new ArrayBuffer(str.length * 2);
  const bufView = new Uint16Array(buf);
  for (let i = 0, strlen = str.length; i < strlen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}
console.log({ LIMIT, m: "encoding strings into utf16 with str2ab" });
chars = 0;
start = Date.now();
for (let i = 0; i < LIMIT; i++) {
  const encoded = str2ab(lines[i % numLines]);
  chars += encoded.byteLength;
}
end = Date.now();
console.log(
  { numLines: LIMIT, chars, ms: end - start },
  "after encoding with str2ab"
);
