
const express = require('express');
const router = express.Router();
const { getConnection, listProjects } = require('../devops');
const { authenticateToken } = require('../../middleware/auth');
const { requireBackendKey } = require('../../middleware/backendApiKey');

// Protect: require backend key if set, and JWT auth
router.use(requireBackendKey);
router.use(authenticateToken);

router.post('/connect', async (req, res) => {
  try {
    // Use server-configured credentials only; do not mutate env from client input
    getConnection();
    const projects = await listProjects();
    res.json(projects.map(p => ({ id: p.id, name: p.name })));
  } catch (e) {
    res.status(401).json({ error: e.message });
  }
});

module.exports = router;
