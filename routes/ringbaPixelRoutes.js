const express = require("express");
const {
  handleFinalizedPixel,
  getRetainEvents,
} = require("../controllers/ringbaPixelController");

const router = express.Router();

// Ringba can hit GET or POST depending on your pixel setup.
router.get("/ringba/finalized", handleFinalizedPixel);
router.post("/ringba/finalized", handleFinalizedPixel);

// Optional admin/debug endpoint
router.get("/ringba/finalized/events", getRetainEvents);

module.exports = router;