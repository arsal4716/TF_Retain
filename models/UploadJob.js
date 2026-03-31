const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  fileName: String,
  totalRecords: Number,
  processedRecords: { type: Number, default: 0 },
  successCount: { type: Number, default: 0 },
  errorCount: { type: Number, default: 0 },
  status: { type: String, default: "processing" }
}, { timestamps: true });

module.exports = mongoose.model("UploadJob", schema);