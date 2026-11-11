const { isAuthenticated, requireMethod } = require("../_lib/security");
module.exports = async function handler(req, res) {
  if (!requireMethod(req, res, "GET")) return;
  return res.status(200).json({ authenticated: isAuthenticated(req) });
};
