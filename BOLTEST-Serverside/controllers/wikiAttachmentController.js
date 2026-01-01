const WikiAttachmentService = require('../services/wikiAttachmentService');
const { getSession } = require('../middleware/auth');
const Logger = require('../utils/logger');

/**
 * Upload file to wiki
 * POST /api/wiki-attachments/upload
 * Body: multipart FormData with 'attachment' field and 'wikiIdentifier' (optional)
 */
exports.uploadWikiAttachment = async (req, res) => {
  try {
    const { wikiIdentifier } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'No file provided'
      });
    }

    const session = getSession(req.token);
    if (!session) {
      return res.status(401).json({
        success: false,
        message: 'Session not found'
      });
    }

    const { decrypt } = require('../utils/crypto');
    let pat = session.pat;
    if (!pat && session.enc) {
      try {
        pat = decrypt(session.enc);
      } catch (err) {
        Logger.error('Failed to decrypt PAT', err.message);
        return res.status(500).json({ success: false, message: 'Session decrypt error' });
      }
    }

    const https = require('https');
    const httpsAgent = new https.Agent({ rejectUnauthorized: false });
    const authHeader = `Basic ${Buffer.from(`:${pat}`).toString('base64')}`;

    const wikiService = new WikiAttachmentService(
      session.orgUrl,
      session.project,
      authHeader,
      httpsAgent,
      '7.1'
    );

    const result = await wikiService.uploadAttachment(file.buffer, {
      fileName: file.originalname,
      wikiIdentifier: wikiIdentifier || 'wiki'
    });

    if (result.error) {
      return res.status(400).json({ success: false, message: result.error });
    }

    Logger.info('Wiki attachment uploaded', { name: file.originalname, path: result.path });

    res.status(201).json({
      success: true,
      data: {
        name: result.name,
        path: result.path,
        version: result.version
      }
    });
  } catch (error) {
    Logger.error('Upload wiki attachment error', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload wiki attachment',
      error: error.message
    });
  }
};

/**
 * Get wiki attachment metadata
 * GET /api/wiki-attachments/:wikiIdentifier/attachments?path=/.attachments/file.png
 */
exports.getWikiAttachment = async (req, res) => {
  try {
    const { wikiIdentifier } = req.params;
    const { path } = req.query;

    if (!path) {
      return res.status(400).json({
        success: false,
        message: 'Attachment path is required'
      });
    }

    const session = getSession(req.token);
    if (!session) {
      return res.status(401).json({
        success: false,
        message: 'Session not found'
      });
    }

    const { decrypt } = require('../utils/crypto');
    let pat = session.pat;
    if (!pat && session.enc) {
      try {
        pat = decrypt(session.enc);
      } catch (err) {
        Logger.error('Failed to decrypt PAT', err.message);
        return res.status(500).json({ success: false, message: 'Session decrypt error' });
      }
    }

    const https = require('https');
    const httpsAgent = new https.Agent({ rejectUnauthorized: false });
    const authHeader = `Basic ${Buffer.from(`:${pat}`).toString('base64')}`;

    const wikiService = new WikiAttachmentService(
      session.orgUrl,
      session.project,
      authHeader,
      httpsAgent,
      '7.1'
    );

    const result = await wikiService.getAttachment(wikiIdentifier || 'wiki', path);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    Logger.error('Get wiki attachment error', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get wiki attachment',
      error: error.message
    });
  }
};

/**
 * Delete wiki attachment
 * DELETE /api/wiki-attachments/:wikiIdentifier/attachments?path=/.attachments/file.png
 */
exports.deleteWikiAttachment = async (req, res) => {
  try {
    const { wikiIdentifier } = req.params;
    const { path } = req.query;

    if (!path) {
      return res.status(400).json({
        success: false,
        message: 'Attachment path is required'
      });
    }

    const session = getSession(req.token);
    if (!session) {
      return res.status(401).json({
        success: false,
        message: 'Session not found'
      });
    }

    const { decrypt } = require('../utils/crypto');
    let pat = session.pat;
    if (!pat && session.enc) {
      try {
        pat = decrypt(session.enc);
      } catch (err) {
        Logger.error('Failed to decrypt PAT', err.message);
        return res.status(500).json({ success: false, message: 'Session decrypt error' });
      }
    }

    const https = require('https');
    const httpsAgent = new https.Agent({ rejectUnauthorized: false });
    const authHeader = `Basic ${Buffer.from(`:${pat}`).toString('base64')}`;

    const wikiService = new WikiAttachmentService(
      session.orgUrl,
      session.project,
      authHeader,
      httpsAgent,
      '7.1'
    );

    const success = await wikiService.deleteAttachment(wikiIdentifier || 'wiki', path);

    if (!success) {
      return res.status(400).json({ success: false, message: 'Failed to delete attachment' });
    }

    Logger.info('Wiki attachment deleted', { path });

    res.json({
      success: true,
      message: 'Attachment deleted'
    });
  } catch (error) {
    Logger.error('Delete wiki attachment error', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete wiki attachment',
      error: error.message
    });
  }
};
