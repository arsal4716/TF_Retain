const UploadJob = require("../models/UploadJob");

exports.stopJob = async (req, res) => {
  const job = await UploadJob.findById(req.params.id);
  job.status = "stopped";
  await job.save();
  res.json({ success: true });
};

exports.getJob = async (req, res) => {
  const job = await UploadJob.findById(req.params.id);
  res.json(job);
};