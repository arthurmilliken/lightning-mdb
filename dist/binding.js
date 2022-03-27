"use strict";
const hello = require("../build/Release/hello-napi-native");
const lmdb = require("../build/Release/hello-lmdb-native");
module.exports = {
    hello: hello.Hello,
    lmdb,
};
//# sourceMappingURL=binding.js.map