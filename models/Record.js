const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    uploadJobId: { type: mongoose.Schema.Types.ObjectId, ref: "UploadJob" },
    cid: String,
    trustedFormUrl: String,
    status: { type: String, default: "pending" },
    message: String,
    attempts: { type: Number, default: 0 },
    processedAt: Date,
  },
  { timestamps: true }
);

schema.index({ trustedFormUrl: 1 });
schema.index({ cid: 1 });
schema.index({ status: 1 });
schema.index({ uploadJobId: 1 });
schema.index({ createdAt: -1 });
schema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("Record", schema);