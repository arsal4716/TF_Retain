const express = require("express");
const {
  handleFinalizedPixel,
  getRetainEvents,
} = require("../controllers/ringbaPixelController");

const router = express.Router();

router.get("/ringba/finalized", handleFinalizedPixel);
router.post("/ringba/finalized", handleFinalizedPixel);
router.get("/ringba/finalized/events", getRetainEvents);

module.exports = router;