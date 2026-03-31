const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const { Worker } = require("bullmq");
const connection = require("../config/redis");
const connectDB = require("../config/db");
const TrustedFormRetainEvent = require("../models/TrustedFormRetainEvent");
const runAutomation = require("../automation/tfAutomation");

(async () => {
  try {
    await connectDB();
    console.log("TrustedForm retain worker MongoDB connected");

    const worker = new Worker(
      "trustedform-retain",
      async (job) => {
        const { eventId } = job.data;

        const event = await TrustedFormRetainEvent.findById(eventId);
        if (!event) {
          console.log("Retain event not found:", eventId);
          return;
        }

        event.status = "processing";
        event.attempts += 1;
        event.message = "Processing retain request";
        await event.save();

        try {
          const result = await runAutomation(event.certUrl);
          console.log("Ringba TF automation result:", result);

          const msg = String(result?.message || "").toLowerCase();
          const forceRetained =
            msg.includes("retained") ||
            msg.includes("already retained") ||
            msg.includes("you've retained") ||
            msg.includes("you have retained") ||
            msg.includes("certificate retained");

          const isSuccess = Boolean(result?.success) || forceRetained;

          event.status = isSuccess ? "retained" : "error";
          event.message = result?.message || "";
          event.processedAt = new Date();
          await event.save();

          console.log("TrustedForm retain result:", {
            eventId: String(event._id),
            isSuccess,
            message: event.message,
          });
        } catch (error) {
          console.error("TrustedForm retain worker error:", error);

          event.status = "error";
          event.message = error.message || "TrustedForm retain failed";
          event.processedAt = new Date();
          await event.save();

          throw error;
        }
      },
      {
        connection,
        concurrency: Number(process.env.CONCURRENCY || 1),
      }
    );

    worker.on("ready", () => {
      console.log("TrustedForm retain worker ready");
    });

    worker.on("completed", (job) => {
      console.log(`TrustedForm retain job completed: ${job.id}`);
    });

    worker.on("failed", (job, err) => {
      console.error(`TrustedForm retain job failed: ${job?.id}`, err);
    });

    worker.on("error", (err) => {
      console.error("TrustedForm retain worker error:", err);
    });

    console.log("TrustedForm retain worker started");
  } catch (err) {
    console.error("TrustedForm retain worker startup error:", err);
    process.exit(1);
  }
})();