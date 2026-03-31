const Record = require("../models/Record");
const TrustedFormRetainEvent = require("../models/TrustedFormRetainEvent");

function escapeRegex(value = "") {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

exports.getPortalRecords = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status = "",
      search = "",
      source = "", // all | upload | pixel
    } = req.query;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const skip = (pageNum - 1) * limitNum;

    const safeSearch = String(search || "").trim();
    const regex = safeSearch ? new RegExp(escapeRegex(safeSearch), "i") : null;

    const uploadMatch = {};
    const pixelMatch = {};

    if (status) {
      uploadMatch.status = status;
      pixelMatch.status = status;
    }

    if (regex) {
      uploadMatch.$or = [
        { cid: regex },
        { trustedFormUrl: regex },
        { message: regex },
      ];

      pixelMatch.$or = [
        { ringbaCallId: regex },
        { phoneNumberRaw: regex },
        { trustedId: regex },
        { certUrl: regex },
        { message: regex },
      ];
    }

    const includeUpload = !source || source === "all" || source === "upload";
    const includePixel = !source || source === "all" || source === "pixel";

    let pipeline = [];

    if (includeUpload) {
      pipeline.push(
        { $match: uploadMatch },
        {
          $project: {
            _id: 1,
            source: { $literal: "upload" },
            sourceLabel: { $literal: "File Upload" },
            cid: { $ifNull: ["$cid", ""] },
            phoneNumber: { $literal: "" },
            ringbaCallId: { $literal: "" },
            trustedId: { $literal: "" },
            trustedFormUrl: { $ifNull: ["$trustedFormUrl", ""] },
            status: 1,
            message: { $ifNull: ["$message", ""] },
            attempts: { $ifNull: ["$attempts", 0] },
            createdAt: 1,
            updatedAt: 1,
            processedAt: 1,
          },
        }
      );
    }

    if (includePixel) {
      const pixelPipeline = [
        { $match: pixelMatch },
        {
          $project: {
            _id: 1,
            source: { $literal: "pixel" },
            sourceLabel: { $literal: "Ringba Pixel" },
            cid: { $literal: "" },
            phoneNumber: { $ifNull: ["$phoneNumberRaw", ""] },
            ringbaCallId: { $ifNull: ["$ringbaCallId", ""] },
            trustedId: { $ifNull: ["$trustedId", ""] },
            trustedFormUrl: { $ifNull: ["$certUrl", ""] },
            status: 1,
            message: { $ifNull: ["$message", ""] },
            attempts: { $ifNull: ["$attempts", 0] },
            createdAt: 1,
            updatedAt: 1,
            processedAt: 1,
          },
        },
      ];

      if (includeUpload) {
        pipeline.push({
          $unionWith: {
            coll: "trustedformretainevents",
            pipeline: pixelPipeline,
          },
        });
      } else {
        pipeline = pixelPipeline;
      }
    }

    if (!pipeline.length) {
      return res.json({
        success: true,
        data: [],
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false,
        },
      });
    }

    pipeline.push(
      { $sort: { createdAt: -1, _id: -1 } },
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: limitNum }],
          meta: [{ $count: "total" }],
        },
      }
    );

    const result = await Record.aggregate(pipeline);
    const first = result[0] || { data: [], meta: [] };
    const total = first.meta?.[0]?.total || 0;
    const totalPages = Math.ceil(total / limitNum);

    return res.json({
      success: true,
      data: first.data,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      },
    });
  } catch (error) {
    console.error("Portal records error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch portal records",
    });
  }
};