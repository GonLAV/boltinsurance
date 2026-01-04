const AzureDevOpsService = require('../services/azureDevOpsService');
const { getSession } = require('../middleware/auth');
const Logger = require('../utils/logger');
const mirrorStore = require('../utils/mirrorStore');

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

// יצירת Test Case חדש
exports.createTestCase = async (req, res) => {
    try {
        const { title, description, steps, priority, assignedTo, tags, userStoryKeyword, userStoryId, attachmentIds, sharedParameterName } = req.body;

        // ולידציה
        if (!title) {
            return res.status(400).json({
                success: false,
                message: 'שדה Title הוא חובה'
            });
        }

        Logger.info('🔍 [DEBUG] createTestCase received', { 
            title, 
            bodyKeys: Object.keys(req.body),
            attachmentIds,
            attachmentIdsType: typeof attachmentIds,
            attachmentIdsIsArray: Array.isArray(attachmentIds),
            attachmentCount: attachmentIds?.length || 0 
        });

        // Dev bypass: if DEV_BYPASS env var is set, return a mocked response for easier local testing
        if (process.env.DEV_BYPASS === 'true') {
            const id = `dev-${Date.now()}`;
            Logger.info('DEV_BYPASS enabled: returning mocked Test Case', { id });
            return res.status(201).json({
                success: true,
                data: { id, title, description, steps, priority, assignedTo, tags }
            });
        }

        // קבלת Session Data
        const session = getSession(req.token);
        if (!session) {
            return res.status(401).json({
                success: false,
                message: 'Session לא נמצא'
            });
        }

        // יצירת Azure DevOps Service instance (פענוח PAT מ-session.enc)
        const { decrypt } = require('../utils/crypto');
        let pat = (req.user && req.user.pat) ? req.user.pat : session.pat;
        if (!pat && session.enc) {
            try {
                pat = decrypt(session.enc);
            } catch (err) {
                Logger.error('Failed to decrypt PAT from session', err.message);
                return res.status(500).json({ success: false, message: 'שגיאת פענוח Session' });
            }
        }
        pat = (pat || '').toString().trim();

        const azureService = new AzureDevOpsService(
            session.orgUrl,
            session.project,
            pat,
            session.apiVersion
        );

        // Get authenticated user info (email from session.userEmail or PAT user)
        const assignedToUser = session.userEmail || session.user || null;
        
        // 1) Find User Story automatically (graceful handling)
        const keyword = (userStoryKeyword || title || '').trim();
        let storyMatch = null;
        let storyMatches = [];
        if (userStoryId) {
            try {
                const wi = await azureService.getWorkItem(userStoryId);
                storyMatch = { id: wi.id, title: wi.fields?.['System.Title'] };
            } catch (e) {
                // ignore; will attempt keyword search
            }
        }

        if (!storyMatch && keyword) {
            try {
                storyMatches = await azureService.findUserStoriesByKeyword(keyword, 5);
                storyMatch = storyMatches[0] || null;
            } catch (e) {
                // ignore: allow test case creation without story link
            }
        }

        // 2) Avoid duplicates: if a Test Case with the same exact title exists, update it (mirror behavior)
        let existingId = null;
        try {
            existingId = await azureService.findTestCaseByExactTitle(title);
        } catch (e) {
            // Best-effort: if WIQL is not available/allowed, continue with create
            existingId = null;
        }
        const payload = {
            title,
            description,
            steps,
            priority,
            assignedTo: assignedTo || assignedToUser, // Use authenticated user if not explicitly provided
            tags,
            userStoryId: storyMatch?.id,
            attachmentIds: attachmentIds || [] // Pass attachment IDs to be linked
        };

        Logger.info('Test Case payload before service call', { 
            title, 
            attachmentIdsCount: payload.attachmentIds?.length || 0,
            attachmentIds: payload.attachmentIds,
            existingId 
        });

        const result = existingId
            ? await azureService.updateTestCase(existingId, payload)
            : await azureService.createTestCase(payload);

        if (!result.success) {
            // If server can't reach on-prem TFS from this environment, allow creating now by saving locally.
            const transientNetErrors = new Set(['ENOTFOUND', 'EAI_AGAIN', 'ECONNREFUSED', 'ETIMEDOUT', 'ECONNRESET']);
            if ((result.statusCode === 502 || result.statusCode === 503 || result.statusCode === 504) && transientNetErrors.has(result.error)) {
                const localId = `local-${Date.now()}`;
                try {
                    mirrorStore.upsertTestCase({
                        localId,
                        remoteId: null,
                        syncStatus: 'pending',
                        syncError: result.message,
                        title,
                        description: description || '',
                        steps: steps || [],
                        priority: priority || null,
                        assignedTo: assignedTo || null,
                        tags: tags || null,
                        userStoryId: storyMatch?.id || null,
                        userStoryTitle: storyMatch?.title || null,
                        project: session.project,
                        orgUrl: session.orgUrl
                    });
                } catch (e) {
                    // even if local save fails, return the real error
                    return res.status(result.statusCode || 502).json(result);
                }

                return res.status(202).json({
                    success: true,
                    message: 'נשמר מקומית (ממתין לסנכרון ל-TFS). השרת לא יכול להגיע ל-TFS כרגע מהסביבה הזו.',
                    data: {
                        id: localId,
                        title,
                        syncStatus: 'pending',
                        linkedUserStory: storyMatch ? { id: storyMatch.id, title: storyMatch.title } : null,
                        userStoryMatches: storyMatches
                    }
                });
            }

            return res.status(result.statusCode || 400).json(result);
        }

        Logger.success('Test Case synced', { id: result.data.id, mode: existingId ? 'updated' : 'created' });

        // 2.5) Link Shared Parameter if provided
        if (sharedParameterName) {
            try {
                const normalizedSpName = String(sharedParameterName).trim().replace(/\s+/g, '_').replace(/_?SharedParameters$/i, '');
                const spResult = await azureService.findWorkItemByTitle(normalizedSpName, 'Shared Parameter');
                if (spResult) {
                    await azureService.linkSharedParameterToTestCase(result.data.id, spResult.id, normalizedSpName);
                    Logger.info('Shared Parameter linked automatically', { testCaseId: result.data.id, sharedParameterName: normalizedSpName });
                }
            } catch (e) {
                Logger.error('Failed to link shared parameter automatically', e.message);
            }
        }

        // 3) Persist mirror mapping locally for search
        try {
            mirrorStore.upsertTestCase({
                testCaseId: result.data.id,
                title,
                url: result.data.url,
                userStoryId: storyMatch?.id || null,
                userStoryTitle: storyMatch?.title || null,
                project: session.project,
                orgUrl: session.orgUrl
            });
        } catch (e) {
            // don't fail request if local persistence fails
        }

        res.status(existingId ? 200 : 201).json({
            ...result,
            data: {
                ...result.data,
                linkedUserStory: storyMatch ? { id: storyMatch.id, title: storyMatch.title } : null,
                userStoryMatches: storyMatches
            }
        });
    } catch (error) {
        Logger.error('Create Test Case error', error);
        res.status(500).json({
            success: false,
            message: 'שגיאה ביצירת Test Case',
            error: error.message
        });
    }
};

// Dev-only create (unauthenticated) - helpful for local testing when Azure is unavailable
exports.createTestCaseDev = async (req, res) => {
    try {
        const { title, description, steps, priority, assignedTo, tags } = req.body;
        if (!title) return res.status(400).json({ success: false, message: 'Title is required' });
        const id = `dev-${Date.now()}`;
        Logger.info('Created dev test case', { id });
        return res.status(201).json({ success: true, data: { id, title, description, steps, priority, assignedTo, tags } });
    } catch (err) {
        Logger.error('Dev create error', err);
        return res.status(500).json({ success: false, message: 'Dev create failed', error: err.message });
    }
};

// Create Test Case WITH file attachments (FormData multipart)
exports.createTestCaseWithFiles = async (req, res) => {
    try {
        const { title, description, steps: stepsJson, priority, assignedTo, tags, userStoryKeyword, userStoryId } = req.body;
        const attachmentFiles = req.files || [];

        if (!title) {
            return res.status(400).json({ success: false, message: 'Title is required' });
        }

        const steps = JSON.parse(stepsJson || '[]');
        
        Logger.info('Creating Test Case with files', { title, fileCount: attachmentFiles.length });

        // Get session
        const session = require('../middleware/auth').getSession(req.token);
        if (!session) {
            return res.status(401).json({ success: false, message: 'Session not found' });
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

        const AzureDevOpsService = require('../services/azureDevOpsService');
        const azureService = new AzureDevOpsService(session.orgUrl, session.project, pat);

        // Upload files to Azure DevOps and collect IDs
        const AttachmentService = require('../services/attachmentService');
        const https = require('https');
        const httpsAgent = new https.Agent({ rejectUnauthorized: false });
        const authHeader = `Basic ${Buffer.from(`:${pat}`).toString('base64')}`;
        const attachmentService = new AttachmentService(session.orgUrl, session.project, authHeader, httpsAgent, '7.1');

        const attachmentIds = [];
        for (const file of attachmentFiles) {
            try {
                const fileBuffer = require('fs').readFileSync(file.path);
                const uploadResult = await attachmentService.uploadAttachment(fileBuffer, {
                    fileName: file.originalname
                });
                if (uploadResult?.id) {
                    attachmentIds.push(uploadResult.id);
                    Logger.info('Attachment uploaded to ADO', { name: file.originalname, id: uploadResult.id });
                }
                // Clean up local file
                require('fs').unlinkSync(file.path);
            } catch (fileErr) {
                Logger.warn('Failed to upload file to ADO', { 
                    fileName: file.originalname, 
                    status: fileErr.response?.status,
                    statusText: fileErr.response?.statusText,
                    data: fileErr.response?.data,
                    message: fileErr.message 
                });
            }
        }

        // Find linked user story (if any)
        const keyword = (userStoryKeyword || title || '').trim();
        let storyMatch = null;
        let storyMatches = [];
        if (userStoryId) {
            try {
                const wi = await azureService.getWorkItem(userStoryId);
                storyMatch = { id: wi.id, title: wi.fields?.['System.Title'] };
            } catch (e) {
                // ignore
            }
        }
        if (!storyMatch && keyword) {
            try {
                storyMatches = await azureService.findUserStoriesByKeyword(keyword, 5);
                storyMatch = storyMatches[0] || null;
            } catch (e) {
                // ignore
            }
        }

        // Create test case with attachment relations
        const payload = {
            title,
            description,
            steps,
            priority: parseInt(priority) || 2,
            assignedTo: assignedTo || session.userEmail || null,
            tags,
            userStoryId: storyMatch?.id,
            attachmentIds // Pass collected ADO attachment IDs
        };

        const result = await azureService.createTestCase(payload);

        if (!result.success) {
            return res.status(result.statusCode || 400).json(result);
        }

        Logger.success('Test Case with attachments created', { id: result.data.id, attachments: attachmentIds.length });

        res.status(201).json({
            ...result,
            data: {
                ...result.data,
                linkedUserStory: storyMatch ? { id: storyMatch.id, title: storyMatch.title } : null,
                attachmentIds
            }
        });
    } catch (error) {
        Logger.error('Create Test Case with files error', error);
        res.status(500).json({
            success: false,
            message: 'Test Case creation failed',
            error: error.message
        });
    }
};

// קבלת כל ה-Test Cases
exports.getTestCases = async (req, res) => {
    try {
        const { top } = req.query; // כמה תוצאות להחזיר (default: 200)

        Logger.info('Fetching Test Cases');

        const headerOrgUrl = req.headers['x-orgurl'];
        const headerPat = req.headers['x-pat'];
        const headerProject = req.headers['x-project'];

        // קבלת Session Data
        const session = getSession(req.token);
        if (!session && !(headerOrgUrl && headerPat)) {
            return res.status(401).json({
                success: false,
                message: 'Session לא נמצא'
            });
        }

        // יצירת Azure DevOps Service instance
        const { decrypt } = require('../utils/crypto');
        const effectiveProject = (headerProject || session?.project || req.user?.project || '').toString().trim();
        const orgUrl = normalizeOrgUrlForProject((headerOrgUrl || session?.orgUrl || req.user?.orgUrl || '').toString(), effectiveProject);

        let pat = (headerPat || (req.user && req.user.pat) || session?.pat || '').toString();
        if (!pat && session?.enc) {
            try {
                pat = decrypt(session.enc);
            } catch (err) {
                Logger.error('Failed to decrypt PAT from session', err.message);
                return res.status(500).json({ success: false, message: 'שגיאת פענוח Session' });
            }
        }
        pat = (pat || '').toString().trim();

        const azureService = new AzureDevOpsService(orgUrl, effectiveProject, pat);

        // שליפת Test Cases
        const result = await azureService.getTestCases(top ? parseInt(top) : 200);

        if (result && result.success === false) {
            return res.status(result.statusCode || 502).json(result);
        }

        return res.json(result);
    } catch (error) {
        Logger.error('Get Test Cases error', error);
        res.status(500).json({
            success: false,
            message: 'שגיאה בשליפת Test Cases',
            error: error.message
        });
    }
};

// עדכון Test Case
exports.updateTestCase = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'חסר ID של Test Case'
            });
        }

        Logger.info('Updating Test Case', { id });

        // קבלת Session Data
        const session = getSession(req.token);
        if (!session) {
            return res.status(401).json({
                success: false,
                message: 'Session לא נמצא'
            });
        }

        // יצירת Azure DevOps Service instance (פענוח PAT מ-session.enc)
        const { decrypt } = require('../utils/crypto');
        let pat = session.pat;
        if (!pat && session.enc) {
            try {
                pat = decrypt(session.enc);
            } catch (err) {
                Logger.error('Failed to decrypt PAT from session', err.message);
                return res.status(500).json({ success: false, message: 'שגיאת פענוח Session' });
            }
        }

        const azureService = new AzureDevOpsService(
            session.orgUrl,
            session.project,
            pat,
            session.apiVersion
        );

        // עדכון Test Case
        const result = await azureService.updateTestCase(id, updates);

        if (!result.success) {
            return res.status(result.statusCode || 400).json(result);
        }

        Logger.success('Test Case updated', { id });

        res.json(result);
    } catch (error) {
        Logger.error('Update Test Case error', error);
        res.status(500).json({
            success: false,
            message: 'שגיאה בעדכון Test Case',
            error: error.message
        });
    }
};

// מחיקת Test Case
exports.deleteTestCase = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'חסר ID של Test Case'
            });
        }

        Logger.info('Deleting Test Case', { id });

        // קבלת Session Data
        const session = getSession(req.token);
        if (!session) {
            return res.status(401).json({
                success: false,
                message: 'Session לא נמצא'
            });
        }

        // יצירת Azure DevOps Service instance (פענוח PAT מ-session.enc)
        const { decrypt } = require('../utils/crypto');
        let pat = session.pat;
        if (!pat && session.enc) {
            try {
                pat = decrypt(session.enc);
            } catch (err) {
                Logger.error('Failed to decrypt PAT from session', err.message);
                return res.status(500).json({ success: false, message: 'שגיאת פענוח Session' });
            }
        }

        const azureService = new AzureDevOpsService(
            session.orgUrl,
            session.project,
            pat,
            session.apiVersion
        );

        // מחיקת Test Case
        const result = await azureService.deleteTestCase(id);

        if (!result.success) {
            return res.status(result.statusCode || 400).json(result);
        }

        Logger.success('Test Case deleted', { id });

        res.json(result);
    } catch (error) {
        Logger.error('Delete Test Case error', error);
        res.status(500).json({
            success: false,
            message: 'שגיאה במחיקת Test Case',
            error: error.message
        });
    }
};

// קבלת Test Case בודד
exports.getTestCaseById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'Test Case ID is required'
            });
        }

        Logger.info('Fetching Test Case by ID', { id });

        // Get Session Data
        const session = getSession(req.token);
        if (!session) {
            return res.status(401).json({
                success: false,
                message: 'Session not found'
            });
        }

        // Create Azure DevOps Service instance (decrypt PAT from session)
        const { decrypt } = require('../utils/crypto');
        let pat = session.pat;
        if (!pat && session.enc) {
            try {
                pat = decrypt(session.enc);
            } catch (err) {
                Logger.error('Failed to decrypt PAT from session', err.message);
                return res.status(500).json({ success: false, message: 'Session decryption failed' });
            }
        }

        const azureService = new AzureDevOpsService(
            session.orgUrl,
            session.project,
            pat,
            session.apiVersion
        );

        // USE THE NEW METHOD with $expand=all and proper XML parsing
        const result = await azureService.getTestCaseById(id);

        if (!result.success) {
            return res.status(404).json({
                success: false,
                message: 'Test Case not found'
            });
        }

        const testCase = result.data;

        res.json({
            success: true,
            data: {
                testCase: {
                    id: testCase.id,
                    title: testCase.title,
                    state: testCase.state,
                    priority: testCase.priority,
                    assignedTo: testCase.assignedTo,
                    description: testCase.description,
                    area: testCase.area,
                    iteration: testCase.iteration,
                    tags: testCase.tags,
                    linkedUserStory: testCase.linkedUserStory,
                    attachments: testCase.attachments || [],
                    steps: testCase.steps,  // NOW PROPERLY PARSED!
                    createdDate: testCase.createdDate,
                    url: testCase.url
                }
            }
        });
    } catch (error) {
        Logger.error('Get Test Case by ID error', error);

        if (error.response && error.response.status === 404) {
            return res.status(404).json({
                success: false,
                message: 'Test Case not found'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error fetching Test Case',
            error: error.message
        });
    }
};

// Clone Test Case 1:1 (fields, steps, attachments)
exports.cloneTestCase = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ success: false, message: 'Test Case ID is required' });
        }

        const session = getSession(req.token);
        if (!session) {
            return res.status(401).json({ success: false, message: 'Session not found' });
        }

        const { decrypt } = require('../utils/crypto');
        let pat = session.pat;
        if (!pat && session.enc) {
            try { pat = decrypt(session.enc); } catch (e) {
                Logger.error('Failed to decrypt PAT', e.message);
                return res.status(500).json({ success: false, message: 'Session decrypt error' });
            }
        }

        const azureService = new AzureDevOpsService(
            session.orgUrl,
            session.project,
            pat,
            session.apiVersion
        );

        // 1) Load the source test case with steps and attachments
        const source = await azureService.getTestCaseById(id);
        if (!source?.success || !source.data) {
            return res.status(404).json({ success: false, message: 'Source Test Case not found' });
        }

        const tc = source.data;

        // Build map: filename -> ADO URL for precise attachment URL usage
        const adoUrlByName = new Map();
        (tc.attachments || []).forEach((a) => {
            if (a?.fileName && a.url) adoUrlByName.set(a.fileName, a.url);
        });

        // 2) Prepare steps, ensuring step attachments use ADO URLs (not local proxy)
        const steps = (tc.steps || []).map((s) => {
            const step = { id: s.id, action: s.action || '', expectedResult: s.expectedResult || '' };
            if (s.attachment && (s.attachment.url || s.attachment.name)) {
                const name = s.attachment.name || '';
                const adoUrl = (name && adoUrlByName.get(name)) || s.attachment.url || '';
                if (adoUrl) {
                    step.attachment = { url: adoUrl, name: s.attachment.name, type: s.attachment.type };
                }
            }
            return step;
        });

        // 3) General attachments (not tied to steps)
        const stepAttachmentUrls = new Set(
            steps.filter((s) => s.attachment?.url).map((s) => String(s.attachment.url).toLowerCase())
        );
        const generalAttachmentUrls = (tc.attachments || [])
            .map((a) => a?.url)
            .filter((u) => u && !stepAttachmentUrls.has(String(u).toLowerCase()));

        // 4) Create the cloned Test Case (preserve title 1:1 as requested)
        const payload = {
            title: tc.title || `Copy of ${id}`,
            description: tc.description || '',
            steps,
            priority: tc.priority || undefined,
            state: tc.state || undefined,
            area: tc.area || undefined,
            iteration: tc.iteration || undefined,
            tags: tc.tags || undefined,
            userStoryId: tc.linkedUserStory?.id || undefined,
            // Pass ADO URLs directly; service will attach them
            attachmentIds: generalAttachmentUrls
        };

        const created = await azureService.createTestCase(payload);
        if (!created?.success) {
            return res.status(created?.statusCode || 400).json(created);
        }

        Logger.success('Cloned Test Case', { from: id, to: created.data?.id });
        return res.status(201).json({ success: true, message: 'Test Case cloned', data: created.data });
    } catch (error) {
        Logger.error('Clone Test Case error', error);
        return res.status(500).json({ success: false, message: 'Failed to clone Test Case', error: error.message });
    }
};