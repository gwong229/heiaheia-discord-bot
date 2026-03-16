// encode.js
const fs = require("fs");

const json = fs.readFileSync("heia_session.json");
const b64 = Buffer.from(json).toString("base64");

console.log(b64);
