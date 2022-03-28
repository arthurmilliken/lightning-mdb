const fs = require("fs");

fs.open("./quotes.txt", "r", (err, fd) => {
  if (err) return console.log(err);
  console.log({ fd });
});
