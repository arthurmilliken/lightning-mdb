const hello = require("../build/Release/hello-napi-native");
const lmdb = require("../build/Release/hello-lmdb-native");

export = {
  hello: hello.Hello,
  lmdb,
};
