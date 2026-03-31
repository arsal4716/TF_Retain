const { Queue } = require("bullmq");
const connection = require("../config/redis");

const queue = new Queue("records", { connection });

module.exports = queue;