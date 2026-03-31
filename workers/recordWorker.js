const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const { Worker } = require("bullmq");
const connection = require("../config/redis");
const connectDB = require("../config/db");
const Record = require("../models/Record");
const UploadJob = require("../models/UploadJob");
const runAutomation = require("../automation/tfAutomation");

(async () => {
  try {
    await connectDB();
    console.log("Worker MongoDB connected");

    const worker = new Worker(
      "records",
      async (job) => {
        const { recordId, jobId } = job.data;

        console.log("Picked job:", job.id, "recordId:", recordId);

        const uploadJob = await UploadJob.findById(jobId);
        if (!uploadJob) {
          console.log("UploadJob not found:", jobId);
          return;
        }

        if (uploadJob.status === "stopped") {
          console.log("Job stopped:", jobId);
          return;
        }

        const record = await Record.findById(recordId);
        if (!record) {
          console.log("Record not found:", recordId);
          return;
        }

        record.status = "processing";
        record.attempts = (record.attempts || 0) + 1;
        await record.save();

        try {
          const result = await runAutomation(record.trustedFormUrl);
          console.log("Automation result:", result);

          // fallback safeguard:
          // if Playwright returned success=false but message clearly says retained,
          // still mark it retained
          const msg = String(result?.message || "").toLowerCase();
          const forceRetained =
            msg.includes("retained") ||
            msg.includes("already retained") ||
            msg.includes("you've retained") ||
            msg.includes("you have retained") ||
            msg.includes("certificate retained");

          const isSuccess = Boolean(result?.success) || forceRetained;

          record.status = isSuccess ? "retained" : "error";
          record.message = result?.message || "";
          record.processedAt = new Date();
          await record.save();

          uploadJob.processedRecords += 1;
          if (isSuccess) {
            uploadJob.successCount += 1;
          } else {
            uploadJob.errorCount += 1;
          }

          if (uploadJob.processedRecords >= uploadJob.totalRecords) {
            uploadJob.status = "completed";
          }

          await uploadJob.save();

          console.log(
            `Record done: ${record._id} -> ${record.status} | ${record.message}`
          );
        } catch (err) {
          console.error("Automation error:", err);

          record.status = "error";
          record.message = err.message || "Unknown worker error";
          record.processedAt = new Date();
          await record.save();

          uploadJob.processedRecords += 1;
          uploadJob.errorCount += 1;

          if (uploadJob.processedRecords >= uploadJob.totalRecords) {
            uploadJob.status = "completed";
          }

          await uploadJob.save();
        }
      },
      {
        connection,
        concurrency: Number(process.env.CONCURRENCY || 1),
      }
    );

    worker.on("ready", () => {
      console.log("BullMQ worker ready");
    });

    worker.on("completed", (job) => {
      console.log(`BullMQ completed job ${job.id}`);
    });

    worker.on("failed", (job, err) => {
      console.error(`BullMQ failed job ${job?.id}:`, err);
    });

    worker.on("error", (err) => {
      console.error("Worker error:", err);
    });

    console.log("Worker started");
  } catch (err) {
    console.error("Worker startup error:", err);
    process.exit(1);
  }
})();