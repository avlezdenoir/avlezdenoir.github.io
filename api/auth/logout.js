const { clearCookie, requireMethod, requireSameOrigin } = require("../_lib/security");
module.exports = async function handler(req, res) {
  if (!requireMethod(req, res, "POST")) return;
  if (!requireSameOrigin(req, res)) return;
  clearCookie(res);
  return res.status(200).json({ ok: true });
};
