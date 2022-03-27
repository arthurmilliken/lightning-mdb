const { hello, lmdb } = require("../dist/binding");
const assert = require("assert");

assert(hello, "The expected function is undefined");
assert(lmdb, "The expected module is undefined");

function testHello() {
  const result = hello();
  assert.strictEqual(result, "world", "Unexpected value returned");
}
assert.doesNotThrow(testHello, "testHello threw an expection");

function testLmdb() {
  let result = lmdb.env_create();
  assert.strictEqual(result, "lmdb_env_create(): created!");
  result = lmdb.env_close();
  assert.strictEqual(result, "lmdb_env_create(): closed!");
}
assert.doesNotThrow(testLmdb, "testLmdb threw an expection");

console.log("Tests passed- everything looks OK!");
