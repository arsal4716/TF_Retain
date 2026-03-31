const TrustedFormRetainEvent = require("../models/TrustedFormRetainEvent");
const trustedFormRetainQueue = require("../queue/trustedFormRetainQueue");
const {
  normalizePhone,
  buildCertUrl,
} = require("../services/trustedFormApiService");

function firstNonEmpty(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  return "";
}

exports.handleFinalizedPixel = async (req, res) => {
  try {
    const payload = { ...req.query, ...req.body };

    const phoneNumber = firstNonEmpty(
      payload.phoneNumber,
      payload.phone,
      payload.caller,
      payload.callerid,
      payload.from,
      payload.number
    );

    const trustedId = firstNonEmpty(
      payload.trusted_id,
      payload.trustedId,
      payload.trusted_form_url,
      payload.trustedFormUrl,
      payload.tf,
      payload.tf_id
    );

    const ringbaCallId = firstNonEmpty(
      payload.ringba_call_id,
      payload.call_id,
      payload.callId,
      payload.inbound_call_id,
      payload.inboundCallId
    );

    if (!trustedId) {
      return res.status(400).json({
        success: false,
        message: "trusted_id (or trustedFormUrl) is required",
      });
    }

    const event = await TrustedFormRetainEvent.create({
      ringbaCallId,
      phoneNumberRaw: phoneNumber,
      phoneNumberNormalized: normalizePhone(phoneNumber),
      trustedId,
      certUrl: buildCertUrl(trustedId),
      status: "queued",
      message: "Queued from Ringba finalized pixel",
    });

    await trustedFormRetainQueue.add(
      "retain-cert",
      { eventId: String(event._id) },
      {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: 1000,
        removeOnFail: 1000,
      }
    );

    return res.status(202).json({
      success: true,
      queued: true,
      eventId: event._id,
    });
  } catch (error) {
    console.error("Ringba pixel handler error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to queue TrustedForm retain",
    });
  }
};

exports.getRetainEvents = async (req, res) => {
  try {
    const { page = 1, limit = 20, status = "", search = "" } = req.query;

    const query = {};
    if (status) query.status = status;

    if (search) {
      query.$or = [
        { ringbaCallId: new RegExp(search, "i") },
        { phoneNumberRaw: new RegExp(search, "i") },
        { trustedId: new RegExp(search, "i") },
        { certUrl: new RegExp(search, "i") },
      ];
    }

    const docs = await TrustedFormRetainEvent.find(query)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    const total = await TrustedFormRetainEvent.countDocuments(query);

    return res.json({
      success: true,
      page: Number(page),
      limit: Number(limit),
      total,
      data: docs,
    });
  } catch (error) {
    console.error("Get retain events error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch retain events",
    });
  }
};