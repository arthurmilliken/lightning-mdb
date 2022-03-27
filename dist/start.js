"use strict";
const { lmdb } = require("./binding");
function main() {
    console.log("hello from start!");
    console.log({ add: lmdb.add(10, 12) });
    lmdb.run_callback(console.log);
    console.log({ obj: lmdb.create("an object named 'Fred'") });
    console.log({ funkd: lmdb.thunk()() });
    let held = new lmdb.HeldValue(8);
    console.log({ v: held.value(), expect: 8 });
    console.log({ v: held.incr(), expect: 9 });
    console.log({ v: held.incr(), expect: 10 });
    console.log({ v: held.mult(10), expect: 100 });
    held = lmdb.create_heldvalue(99);
    console.log({ v: held.value(), expect: 99 });
    const buf = Buffer.from("Hello, Buffer!", "utf8");
    lmdb.print_buffer(buf);
    const abuf = new Uint8Array(buf.buffer, buf.byteOffset, buf.length);
    console.log({
        m: "buf",
        length: buf.length,
        byteLength: buf.byteLength,
        abLength: buf.buffer.byteLength,
        abOffset: buf.byteOffset,
    });
    // "real" methods
    console.log(lmdb.version());
    console.log({ err: 5, strerror: lmdb.strerror(5) });
}
main();
//# sourceMappingURL=start.js.map