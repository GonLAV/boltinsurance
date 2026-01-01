const express = require('express');
const router = express.Router();
const mirrorStore = require('../../utils/mirrorStore');
const { authenticateToken } = require('../../middleware/auth');
const { getSession } = require('../../middleware/auth');
const AzureDevOpsService = require('../../services/azureDevOpsService');

// Search mirrored mappings by User Story ID or title
router.get('/search', authenticateToken, (req, res) => {
  const q = req.query.q || '';
  const results = mirrorStore.findByStory(q);
  res.json({ success: true, data: { results } });
});

// Optional: expose store path for debugging (dev only)
router.get('/_debug', authenticateToken, (req, res) => {
  res.json({ success: true, data: { storePath: mirrorStore.STORE_PATH } });
});

// Resync pending local test cases into TFS/Azure DevOps
router.post('/resync', authenticateToken, async (req, res) => {
  const session = getSession(req.token);
  if (!session) {
    return res.status(401).json({ success: false, message: 'Session לא נמצא' });
  }

  const pat = req.user?.pat || session.pat;
  if (!pat) {
    return res.status(400).json({ success: false, message: 'PAT missing in session/token' });
  }

  const svc = new AzureDevOpsService(session.orgUrl, session.project, pat, session.apiVersion);
  const db = mirrorStore.load();
  const pending = (db.testCases || []).filter((t) => {
    return t && t.syncStatus === 'pending' && t.orgUrl === session.orgUrl && t.project === session.project;
  });

  const limit = Math.min(Number(req.body?.limit || 25), 100);
  const batch = pending.slice(0, limit);

  let synced = 0;
  let failed = 0;

  for (const item of batch) {
    try {
      let existingId = null;
      try {
        existingId = await svc.findTestCaseByExactTitle(item.title);
      } catch {
        existingId = null;
      }

      const payload = {
        title: item.title,
        description: item.description || '',
        steps: item.steps || [],
        priority: item.priority || undefined,
        assignedTo: item.assignedTo || undefined,
        tags: item.tags || undefined,
        userStoryId: item.userStoryId || undefined,
      };

      const result = existingId
        ? await svc.updateTestCase(existingId, payload)
        : await svc.createTestCase(payload);

      if (!result.success) {
        failed += 1;
        mirrorStore.upsertTestCase({
          ...item,
          syncStatus: 'pending',
          syncError: result.message,
        });
        continue;
      }

      synced += 1;
      mirrorStore.upsertTestCase({
        ...item,
        remoteId: result.data.id,
        testCaseId: result.data.id,
        url: result.data.url || item.url,
        syncStatus: 'synced',
        syncError: null,
      });
    } catch (e) {
      failed += 1;
      mirrorStore.upsertTestCase({
        ...item,
        syncStatus: 'pending',
        syncError: e?.message || String(e),
      });
    }
  }

  return res.json({
    success: true,
    message: 'Resync completed',
    data: { totalPending: pending.length, attempted: batch.length, synced, failed }
  });
});

module.exports = router;
