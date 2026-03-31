const fs = require("fs");
const csv = require("csv-parser");
const XLSX = require("xlsx");
const UploadJob = require("../models/UploadJob");
const Record = require("../models/Record");
const queue = require("../queue/queue");

exports.uploadFile = async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: "No file uploaded" });

    const job = await UploadJob.create({
      fileName: file.originalname,
      totalRecords: 0,
      processedRecords: 0,
      successCount: 0,
      errorCount: 0,
      status: "processing",
    });

    let count = 0;

    const processRow = async (row) => {
      const trustedFormUrl = row.trusted_form_url || row.trustedFormUrl;
      if (!trustedFormUrl) return;

      const record = await Record.create({
        uploadJobId: job._id,
        cid: row.cid || "",
        trustedFormUrl,
        status: "pending",
      });

      await queue.add(
        "record",
        {
          recordId: record._id.toString(),
          jobId: job._id.toString(),
        },
        {
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 3000,
          },
          removeOnComplete: false,
          removeOnFail: false,
        }
      );

      count++;
    };

    if (
      file.mimetype.includes("csv") ||
      file.originalname.toLowerCase().endsWith(".csv")
    ) {
      const rows = [];

      await new Promise((resolve, reject) => {
        fs.createReadStream(file.path)
          .pipe(csv())
          .on("data", (row) => rows.push(row))
          .on("end", resolve)
          .on("error", reject);
      });

      for (const row of rows) {
        await processRow(row);
      }
    } else {
      const workbook = XLSX.readFile(file.path);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet);

      for (const row of rows) {
        await processRow(row);
      }
    }

    job.totalRecords = count;
    await job.save();

    res.json({
      success: true,
      jobId: job._id,
      totalRecords: count,
    });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: err.message || "Upload failed" });
  }
};