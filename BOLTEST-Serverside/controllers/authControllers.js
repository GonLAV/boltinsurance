const jwt = require('jsonwebtoken');
const AzureDevOpsService = require('../services/azureDevOpsService');
const { saveSession, deleteSession } = require('../middleware/auth');
const Logger = require('../utils/logger');
const { TOKEN_EXPIRATION } = require('../config/constants');

function normalizeOrgUrlForProject(orgUrl, project) {
    const raw = (orgUrl || '').toString().trim().replace(/\/+$/, '');
    const projectName = (project || '').toString().trim();
    if (!raw || !projectName) return raw;

    // If the user pasted a URL that already includes the project (common mistake),
    // strip the trailing "/{project}" so later requests don't become "/project/project/_apis".
    const suffix = `/${projectName}`.toLowerCase();
    if (raw.toLowerCase().endsWith(suffix)) {
        return raw.slice(0, raw.length - suffix.length);
    }
    return raw;
}

// התחברות
exports.login = async (req, res) => {
    try {
        const { orgUrl, project, pat } = req.body;

        // ולידציה
        if (!orgUrl || !project || !pat) {
            return res.status(400).json({
                success: false,
                message: 'חסרים פרטים נדרשים: orgUrl, project, pat'
            });
        }

        const normalizedOrgUrl = normalizeOrgUrlForProject(orgUrl, project);
        const normalizedPat = (pat || '').toString().trim();
        Logger.info('Login attempt', { orgUrl: normalizedOrgUrl, project });

        // יצירת instance של Azure DevOps Service
        const azureService = new AzureDevOpsService(normalizedOrgUrl, project, normalizedPat);

        // בדיקת חיבור (אפשר לעקוף לבדיקה בסביבת פיתוח)
        const skipAzureCheck = process.env.SKIP_AZURE_CHECK === 'true' && process.env.NODE_ENV === 'development';
        if (skipAzureCheck) {
            Logger.warn('SKIP_AZURE_CHECK is enabled (dev) — bypassing Azure DevOps connection test');
        } else {
            const connectionTest = await azureService.testConnection();

            if (!connectionTest.success) {
                return res.status(401).json(connectionTest);
            }

            // Persist API version that worked (important for older TFS)
            if (connectionTest?.data?.apiVersion) {
                azureService.apiVersion = connectionTest.data.apiVersion;
            }
        }

        // Encrypt PAT and include encrypted blob in JWT payload (stateless availability)
        const { encrypt } = require('../utils/crypto');
        const enc = encrypt(normalizedPat);

        const token = jwt.sign(
            {
                orgUrl: normalizedOrgUrl,
                project,
                enc,
                apiVersion: azureService.apiVersion
            },
            process.env.JWT_SECRET,
            { expiresIn: TOKEN_EXPIRATION }
        );

        // שמירת Session - שמור רק את ה-encoded PAT (לא טקסט רגיל)
        saveSession(token, {
            orgUrl: normalizedOrgUrl,
            project,
            enc, // encrypted PAT blob { data, iv, tag }
            apiVersion: azureService.apiVersion
        });

        Logger.success('User logged in successfully', { project });

        res.json({
            success: true,
            message: 'התחברת בהצלחה',
            token,
            user: {
                orgUrl: normalizedOrgUrl,
                project,
                apiVersion: azureService.apiVersion
            },
            azureValidation: {
                skipped: skipAzureCheck
            }
        });
    } catch (error) {
        Logger.error('Login error', error);
        res.status(500).json({
            success: false,
            message: 'שגיאה בהתחברות',
            error: error.message
        });
    }
};

// בדיקת חיבור בלבד (ללא התחברות)
exports.testConnection = async (req, res) => {
    try {
        const { orgUrl, project, pat } = req.body;

        if (!orgUrl || !project || !pat) {
            return res.status(400).json({
                success: false,
                message: 'חסרים פרטים נדרשים'
            });
        }

        const skipAzureCheck = process.env.SKIP_AZURE_CHECK === 'true' && process.env.NODE_ENV === 'development';
        if (skipAzureCheck) {
            return res.json({
                success: true,
                message: 'SKIP_AZURE_CHECK enabled (dev) — assuming connection OK',
                azureValidation: { skipped: true }
            });
        }

        const normalizedOrgUrl = normalizeOrgUrlForProject(orgUrl, project);
        const normalizedPat = (pat || '').toString().trim();
        const azureService = new AzureDevOpsService(normalizedOrgUrl, project, normalizedPat);
        const result = await azureService.testConnection();

        res.json({
            ...result,
            azureValidation: { skipped: false }
        });
    } catch (error) {
        Logger.error('Test connection error', error);
        res.status(500).json({
            success: false,
            message: 'שגיאה בבדיקת חיבור',
            error: error.message
        });
    }
};

// התנתקות
exports.logout = async (req, res) => {
    try {
        const token = req.body.token || req.headers['authorization']?.split(' ')[1];

        if (token) {
            deleteSession(token);
        }

        Logger.info('User logged out');

        res.json({
            success: true,
            message: 'התנתקת בהצלחה'
        });
    } catch (error) {
        Logger.error('Logout error', error);
        res.status(500).json({
            success: false,
            message: 'שגיאה בהתנתקות'
        });
    }
};

// בדיקת סטטוס (האם מחובר)
exports.checkStatus = async (req, res) => {
    res.json({
        success: true,
        message: 'מחובר',
        user: {
            orgUrl: req.user.orgUrl,
            project: req.user.project
        }
    });
};