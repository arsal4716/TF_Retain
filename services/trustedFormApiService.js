function normalizePhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");

  if (!digits) return "";
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

module.exports = {
  normalizePhone,
  buildCertUrl,
};