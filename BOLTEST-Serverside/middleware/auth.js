const jwt = require('jsonwebtoken');
const Logger = require('../utils/logger');

function normalizeOrgUrlForProject(orgUrl, project) {
    const raw = (orgUrl || '').toString().trim().replace(/\/+$/, '');
    const projectName = (project || '').toString().trim();
    if (!raw || !projectName) return raw;

    const suffix = `/${projectName}`.toLowerCase();
    if (raw.toLowerCase().endsWith(suffix)) {
        return raw.slice(0, raw.length - suffix.length);
    }
    return raw;
}

// אחסון זמני של Sessions (בפרודקשן - השתמש ב-Redis או DB)
const activeSessions = new Map();

// Middleware לאימות JWT
const authenticateToken = (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            Logger.warn('No token provided in request');
            return res.status(401).json({
                success: false,
                message: 'נדרש Token לאימות'
            });
        }

        // אימות JWT (stateless). If the server restarted and in-memory sessions were cleared,
        // we can reconstruct the session from the JWT payload (which contains encrypted PAT).
        jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
            if (err) {
                Logger.error('JWT verification failed', err.message);
                activeSessions.delete(token); // מחיקת Token לא תקף
                return res.status(403).json({
                    success: false,
                    message: 'Token לא תקף'
                });
            }

            // אם יש נתוני enc ב-token, פענח והוסף את ה-PAT ל-req.user
            try {
                if (user && user.enc) {
                    const { decrypt } = require('../utils/crypto');
                    const pat = decrypt(user.enc);
                    user.pat = (pat || '').toString().trim();
                }
            } catch (cryptoErr) {
                Logger.error('Failed to decrypt PAT from token', cryptoErr.message);
                return res.status(500).json({ success: false, message: 'שגיאת פענוח Token' });
            }

            req.user = user;
            req.token = token;

            // Defensive normalization: some clients paste a project URL into orgUrl.
            // If orgUrl ends with '/{project}', strip it so service URLs don't become '/project/project/_apis/...'.
            try {
                if (req.user && req.user.orgUrl && req.user.project) {
                    req.user.orgUrl = normalizeOrgUrlForProject(req.user.orgUrl, req.user.project);
                }
            } catch {
                // ignore
            }

            // Re-hydrate in-memory session after restarts
            if (!activeSessions.has(token)) {
                try {
                    saveSession(token, {
                        orgUrl: req.user.orgUrl,
                        project: user.project,
                        enc: user.enc,
                        apiVersion: user.apiVersion
                    });
                } catch (e) {
                    // best-effort; do not block request
                }
            }

            next();
        });
    } catch (error) {
        Logger.error('Authentication error', error);
        res.status(500).json({
            success: false,
            message: 'שגיאה באימות'
        });
    }
};

// שמירת Session
const saveSession = (token, sessionData) => {
    activeSessions.set(token, {
        ...sessionData,
        createdAt: Date.now()
    });
    Logger.info(`Session saved for project: ${sessionData.project}`);
};

// קבלת Session
const getSession = (token) => {
    return activeSessions.get(token);
};

// מחיקת Session
const deleteSession = (token) => {
    const deleted = activeSessions.delete(token);
    if (deleted) {
        Logger.info('Session deleted');
    }
    return deleted;
};

// ניקוי Sessions ישנים (כל שעה)
setInterval(() => {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 שעות

    for (const [token, session] of activeSessions.entries()) {
        if (now - session.createdAt > maxAge) {
            activeSessions.delete(token);
            Logger.info('Expired session cleaned up');
        }
    }
}, 60 * 60 * 1000); // כל שעה

// Optional auth: if no token is provided, continue anonymously.
// If a token is provided, validate and populate req.user.
const optionalAuthenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return next();
    return authenticateToken(req, res, next);
};

module.exports = {
    authenticateToken,
    optionalAuthenticateToken,
    saveSession,
    getSession,
    deleteSession
};