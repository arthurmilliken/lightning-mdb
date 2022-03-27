const uuid = require("uuid");

const ids = [];
for (let i = 0; i < 50; i++) {
  ids.push(uuid.v1());
}
console.log(ids);
