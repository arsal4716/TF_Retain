const axios = require("axios");

function normalizePhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");

  if (!digits) return "";

  // US/CA common normalization
  if (digits.length === 10) return `1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return digits;

  return digits;
}

function buildCertUrl(trustedIdOrUrl) {
  const value = String(trustedIdOrUrl || "").trim();
  if (!value) throw new Error("trusted_id is required");

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  return `https://cert.trustedform.com/${value}`;
}

async function retainTrustedFormCertificate({ trustedId, phoneNumber }) {
  const apiKey = process.env.TRUSTEDFORM_API_KEY;
  if (!apiKey) {
    throw new Error("TRUSTEDFORM_API_KEY is missing in .env");
  }

  const certUrl = buildCertUrl(trustedId);
  const normalizedPhone = normalizePhone(phoneNumber);

  const payload = {
    retain: {},
    match_lead: normalizedPhone ? { phone: normalizedPhone } : {},
  };

  const response = await axios.post(certUrl, payload, {
    headers: {
      "api-version": "4.0",
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    auth: {
      username: "API",
      password: apiKey,
    },
    timeout: 15000,
    validateStatus: () => true,
  });

  return {
    ok: response.status === 200 && response.data?.outcome === "success",
    statusCode: response.status,
    certUrl,
    normalizedPhone,
    outcome: response.data?.outcome || "",
    reason: response.data?.reason || "",
    data: response.data || null,
  };
}

module.exports = {
  retainTrustedFormCertificate,
  normalizePhone,
  buildCertUrl,
};