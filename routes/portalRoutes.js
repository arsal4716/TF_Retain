const express = require("express");
const { getPortalRecords } = require("../controllers/portalController");

const router = express.Router();

router.get("/portal/records", getPortalRecords);

module.exports = router;