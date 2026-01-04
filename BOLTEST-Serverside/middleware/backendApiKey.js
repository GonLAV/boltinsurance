// Simple API key guard for backend-only ADO routes
// If BACKEND_API_KEY is set, requests must include header: x-backend-key

function requireBackendKey(req, res, next) {
  const expected = process.env.BACKEND_API_KEY;
  if (!expected) return next();

  const provided = req.headers['x-backend-key'];
  if (!provided || provided !== expected) {
    return res.status(401).json({ success: false, message: 'Backend key required' });
  }

  next();
}

module.exports = { requireBackendKey };
