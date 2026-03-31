const { Queue } = require("bullmq");
const connection = require("../config/redis");

const trustedFormRetainQueue = new Queue("trustedform-retain", {
  connection,
});

module.exports = trustedFormRetainQueue;