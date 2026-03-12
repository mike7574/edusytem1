const bcrypt = require("bcryptjs");

async function hashPassword(raw) {
  return bcrypt.hash(raw, 10);
}

async function verifyPassword(rawPassword, storedHash) {
  if (!storedHash) return false;
  if (storedHash === rawPassword) return true;

  try {
    return await bcrypt.compare(rawPassword, storedHash);
  } catch (error) {
    return false;
  }
}

function splitName(fullName) {
  const normalized = String(fullName || "").trim().replace(/\s+/g, " ");
  if (!normalized) return { firstName: "", lastName: "" };
  const parts = normalized.split(" ");
  const firstName = parts.shift();
  const lastName = parts.join(" ") || "-";
  return { firstName, lastName };
}

module.exports = { hashPassword, verifyPassword, splitName };
