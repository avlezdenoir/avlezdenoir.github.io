const { makeSession, setCookie, requireMethod, requireSameOrigin } = require("../_lib/security");

module.exports = async function handler(req, res) {
  if (!requireMethod(req, res, "POST")) return;
  if (!requireSameOrigin(req, res)) return;
  const expected = process.env.ADMIN_PASSWORD;
  const supplied = req.body && req.body.password;
  if (!expected || !process.env.SESSION_SECRET) {
    return res.status(500).json({ error: "Authentication is not configured on the server." });
  }
  if (typeof supplied !== "string" || supplied.length > 300) {
    return res.status(400).json({ error: "Invalid password." });
  }
  const crypto = require("crypto");
  const a = Buffer.from(supplied);
  const b = Buffer.from(expected);
  const valid = a.length === b.length && crypto.timingSafeEqual(a, b);
  if (!valid) return res.status(401).json({ error: "Incorrect password." });
  setCookie(res, makeSession(), 60 * 60 * 8);
  return res.status(200).json({ ok: true });
};
