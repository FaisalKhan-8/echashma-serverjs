"use strict";

var _require = require("@prisma/client"),
  PrismaClient = _require.PrismaClient;
var db = new PrismaClient({
  log: ["query", "error"]
});
module.exports = db;