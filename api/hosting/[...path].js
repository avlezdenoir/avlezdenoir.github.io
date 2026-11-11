const { isAuthenticated, requireSameOrigin } = require("../_lib/security");

const BASE = "https://bot-hosting.net/api/v1";

module.exports = async function handler(req, res) {
  if (!isAuthenticated(req)) return res.status(401).json({ error: "Please sign in first." });
  if (req.method !== "GET" && !requireSameOrigin(req, res)) return;
  const key = process.env.BOT_HOSTING_API_KEY;
  if (!key) return res.status(500).json({ error: "BOT_HOSTING_API_KEY is not configured." });

  // Vercel normally provides catch-all segments in req.query.path.
  // Fall back to the request URL so routing still works if that field is absent.
  let parts = Array.isArray(req.query.path)
    ? req.query.path
    : (typeof req.query.path === "string" ? [req.query.path] : []);

  if (!parts.length) {
    const pathname = new URL(req.url, `https://${req.headers.host || "localhost"}`).pathname;
    const prefix = "/api/hosting/";
    if (pathname.startsWith(prefix)) {
      parts = pathname.slice(prefix.length).split("/").filter(Boolean).map(segment => {
        try { return decodeURIComponent(segment); } catch (_) { return segment; }
      });
    }
  }

  const [resource, id, subresource] = parts;
  let upstreamPath = null;
  let method = "GET";
  let body;

  // Deliberately allow only read endpoints and deployment power actions.
  if (resource === "deployments" && parts.length === 1 && req.method === "GET") {
    upstreamPath = "/deployments";
  } else if (resource === "deployments" && id && parts.length === 2 && req.method === "GET") {
    upstreamPath = `/deployments/${encodeURIComponent(id)}`;
  } else if (resource === "deployments" && id && subresource === "resources" && parts.length === 3 && req.method === "GET") {
    upstreamPath = `/deployments/${encodeURIComponent(id)}/resources`;
  } else if (resource === "deployments" && id && subresource === "logs" && parts.length === 3 && req.method === "GET") {
    upstreamPath = `/deployments/${encodeURIComponent(id)}/logs`;
  } else if (resource === "deployments" && id && subresource === "power" && parts.length === 3 && req.method === "POST") {
    const action = req.body && req.body.action;
    if (!["start", "stop", "restart"].includes(action)) {
      return res.status(400).json({ error: "Power action must be start, stop, or restart." });
    }
    upstreamPath = `/deployments/${encodeURIComponent(id)}/power`;
    method = "POST";
    body = JSON.stringify({ action, waitSeconds: 5 });
  }

  if (!upstreamPath) return res.status(404).json({ error: "Endpoint is not available in this dashboard." });

  try {
    const upstream = await fetch(`${BASE}${upstreamPath}`, {
      method,
      headers: {
        "Authorization": `Bearer ${key}`,
        ...(body ? { "Content-Type": "application/json" } : {})
      },
      ...(body ? { body } : {})
    });
    const raw = await upstream.text();
    let data;
    try { data = JSON.parse(raw); } catch (_) { data = { message: raw.slice(0, 1000) }; }
    return res.status(upstream.status).json(data);
  } catch (error) {
    return res.status(502).json({ error: "Could not reach Bot-Hosting API.", detail: error.message });
  }
};
