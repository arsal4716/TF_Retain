const mongoose = require("mongoose");

const TrustedFormRetainEventSchema = new mongoose.Schema(
  {
    source: { type: String, default: "ringba_finalized_pixel" },
    ringbaCallId: { type: String, index: true, default: "" },
    phoneNumberRaw: { type: String, default: "" },
    phoneNumberNormalized: { type: String, default: "", index: true },
    trustedId: { type: String, required: true, index: true },
    certUrl: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ["queued", "processing", "retained", "error"],
      default: "queued",
      index: true,
    },
    attempts: { type: Number, default: 0 },
    message: { type: String, default: "" },
    processedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

TrustedFormRetainEventSchema.index({ createdAt: -1 });
TrustedFormRetainEventSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model(
  "TrustedFormRetainEvent",
  TrustedFormRetainEventSchema
);