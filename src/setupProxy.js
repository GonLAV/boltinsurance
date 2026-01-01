const fs = require('fs');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');

function getBackendTarget() {
  // Optional override
  const override = process.env.REACT_APP_API_PROXY_TARGET || process.env.API_PROXY_TARGET;
  if (override) return override;

  // Default: read backend-selected port from sibling repo
  try {
    const portFilePath = path.resolve(process.cwd(), '..', 'BOLTEST-Serverside', '.dev-port.json');
    const raw = fs.readFileSync(portFilePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed && parsed.port) {
      return `http://localhost:${parsed.port}`;
    }
  } catch (_) {
    // ignore
  }

  return 'http://localhost:5000';
}

module.exports = function (app) {
  const target = getBackendTarget();

  app.use(
    '/api',
    createProxyMiddleware({
      target,
      changeOrigin: true,
      ws: true,
      logLevel: 'silent',
    })
  );
};
