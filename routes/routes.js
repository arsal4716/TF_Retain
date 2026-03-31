const express = require("express");
const multer = require("multer");

const uploadController = require("../controllers/uploadController");
const jobController = require("../controllers/jobController");
const recordController = require("../controllers/recordController");

const router = express.Router();
const upload = multer({ dest: "uploads/" });

router.post("/upload", upload.single("file"), uploadController.uploadFile);
router.post("/job/:id/stop", jobController.stopJob);
router.get("/job/:id", jobController.getJob);
router.get("/records", recordController.getRecords);

module.exports = router;