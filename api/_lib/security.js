const crypto = require("crypto");

const COOKIE_NAME = "adn_session";
const SESSION_TTL = 60 * 60 * 8;

function sign(value) {
  return crypto.createHmac("sha256", process.env.SESSION_SECRET || "").update(value).digest("base64url");
}

function makeSession() {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + SESSION_TTL * 1000, nonce: crypto.randomBytes(16).toString("hex") })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function verifySession(token) {
  if (!token || !process.env.SESSION_SECRET) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;
  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return Number(data.exp) > Date.now();
  } catch (_) { return false; }
}

function parseCookies(req) {
  const header = req.headers.cookie || "";
  return Object.fromEntries(header.split(";").map(part => {
    const index = part.indexOf("=");
    return index < 0 ? ["", ""] : [part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1).trim())];
  }).filter(([key]) => key));
}

function setCookie(res, value, maxAge) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader("Set-Cookie", `${COOKIE_NAME}=${encodeURIComponent(value)}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAge}`);
}

function clearCookie(res) {
  res.setHeader("Set-Cookie", `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`);
}

function isAuthenticated(req) {
  return verifySession(parseCookies(req)[COOKIE_NAME]);
}

function requireMethod(req, res, method) {
  if (req.method !== method) {
    res.setHeader("Allow", method);
    res.status(405).json({ error: "Method not allowed" });
    return false;
  }
  return true;
}

function requireSameOrigin(req, res) {
  const allowed = process.env.APP_ORIGIN;
  const origin = req.headers.origin;
  if (!allowed || !origin || origin !== allowed) {
    res.status(403).json({ error: "Request origin is not allowed. Check APP_ORIGIN." });
    return false;
  }
  return true;
}

module.exports = { makeSession, setCookie, clearCookie, isAuthenticated, requireMethod, requireSameOrigin };
