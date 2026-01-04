const express = require('express');
const router = express.Router();
const ClassificationNodeService = require('../../services/classificationNodeService');
const Logger = require('../../utils/logger');

/**
 * Helper to get or create ClassificationNodeService instance for Azure DevOps
 */
function getClassificationNodeService(req) {
  const orgUrl = req.headers['x-orgurl'] || process.env.AZDO_ORG_URL;
  const pat = req.headers['x-pat'] || process.env.AZDO_PAT;
  const project = req.headers['x-project'] || process.env.AZDO_PROJECT;

  if (!orgUrl || !pat || !project) {
    const missing = [];
    if (!orgUrl) missing.push('x-orgurl');
    if (!pat) missing.push('x-pat');
    if (!project) missing.push('x-project');
    throw new Error(`Missing required headers/env: ${missing.join(', ')}`);
  }

  const https = require('https');
  const httpsAgent = new https.Agent({ rejectUnauthorized: false });
  const authHeader = `Basic ${Buffer.from(`:${pat}`).toString('base64')}`;

  return new ClassificationNodeService(orgUrl, project, authHeader, httpsAgent, '7.1');
}

/**
 * POST /api/classificationnodes/areas
 * Create a new area node at root or under a parent path.
 * 
 * Body: { name, path (optional) }
 * Query: ?parentPath=Parent/Child (optional alternative to body)
 */
router.post('/areas', async (req, res) => {
  try {
    const { name, path } = req.body || {};
    const parentPath = req.query.parentPath || path || '';

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Area name is required' });
    }

    const service = getClassificationNodeService(req);
    const result = await service.createArea(name, parentPath);

    Logger.info('Area created', { name, path: parentPath || '(root)', id: result.id });
    return res.status(201).json({ success: true, ...result });
  } catch (error) {
    Logger.error('Failed to create area', error.message || error);
    const status = error.response?.status || 500;
    return res.status(status).json({ success: false, message: error.message || 'Failed to create area' });
  }
});

/**
 * POST /api/classificationnodes/iterations
 * Create a new iteration node at root or under a parent path.
 * 
 * Body: { name, attributes (optional), path (optional) }
 * attributes: { startDate, finishDate } (ISO 8601 format)
 * Query: ?parentPath=Parent/Child (optional alternative to body)
 */
router.post('/iterations', async (req, res) => {
  try {
    const { name, attributes, path } = req.body || {};
    const parentPath = req.query.parentPath || path || '';

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Iteration name is required' });
    }

    const service = getClassificationNodeService(req);
    const result = await service.createIteration(name, attributes, parentPath);

    Logger.info('Iteration created', {
      name,
      path: parentPath || '(root)',
      id: result.id,
      dates: attributes
    });
    return res.status(201).json({ success: true, ...result });
  } catch (error) {
    Logger.error('Failed to create iteration', error.message || error);
    const status = error.response?.status || 500;
    return res.status(status).json({ success: false, message: error.message || 'Failed to create iteration' });
  }
});

/**
 * POST /api/classificationnodes/areas/move
 * Move an area node to a new parent.
 * 
 * Body: { id, newParentPath }
 * id: integer - Node ID to move
 * newParentPath: string - New parent path (e.g., "NewParent" or "NewParent/Child")
 */
router.post('/areas/move', async (req, res) => {
  try {
    const { id, newParentPath } = req.body || {};

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ success: false, message: 'Valid node id (positive integer) is required' });
    }

    if (!newParentPath || !newParentPath.trim()) {
      return res.status(400).json({ success: false, message: 'newParentPath is required' });
    }

    const service = getClassificationNodeService(req);
    const result = await service.moveClassificationNode('areas', id, newParentPath);

    Logger.info('Area node moved', { id, newParentPath, name: result.name });
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    Logger.error('Failed to move area', error.message || error);
    const status = error.response?.status || 500;
    return res.status(status).json({ success: false, message: error.message || 'Failed to move area' });
  }
});

/**
 * POST /api/classificationnodes/iterations/move
 * Move an iteration node to a new parent.
 * 
 * Body: { id, newParentPath }
 * id: integer - Node ID to move
 * newParentPath: string - New parent path
 */
router.post('/iterations/move', async (req, res) => {
  try {
    const { id, newParentPath } = req.body || {};

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ success: false, message: 'Valid node id (positive integer) is required' });
    }

    if (!newParentPath || !newParentPath.trim()) {
      return res.status(400).json({ success: false, message: 'newParentPath is required' });
    }

    const service = getClassificationNodeService(req);
    const result = await service.moveClassificationNode('iterations', id, newParentPath);

    Logger.info('Iteration node moved', { id, newParentPath, name: result.name });
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    Logger.error('Failed to move iteration', error.message || error);
    const status = error.response?.status || 500;
    return res.status(status).json({ success: false, message: error.message || 'Failed to move iteration' });
  }
});

/**
 * PUT /api/classificationnodes/iterations/:id/attributes
 * Update iteration attributes (start date, finish date).
 * 
 * Body: { attributes, path (optional) }
 * attributes: { startDate, finishDate } (ISO 8601 format)
 * path: string (optional) - Current path to node for API call
 */
router.put('/iterations/:id/attributes', async (req, res) => {
  try {
    const { id } = req.params;
    const { attributes, path } = req.body || {};

    if (!Number.isInteger(parseInt(id)) || parseInt(id) <= 0) {
      return res.status(400).json({ success: false, message: 'Valid iteration id is required' });
    }

    if (!attributes || typeof attributes !== 'object') {
      return res.status(400).json({ success: false, message: 'attributes object is required' });
    }

    const service = getClassificationNodeService(req);
    const result = await service.updateIterationAttributes(parseInt(id), attributes, path || '');

    Logger.info('Iteration attributes updated', { id, attributes });
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    Logger.error('Failed to update iteration attributes', error.message || error);
    const status = error.response?.status || 500;
    return res.status(status).json({ success: false, message: error.message || 'Failed to update attributes' });
  }
});

/**
 * POST /api/classificationnodes/custom/:structureGroup/:path
 * Generic endpoint for creating/updating classification nodes.
 * 
 * structureGroup: 'areas' or 'iterations'
 * path: URL path to the node (optional, encoded)
 * Body: { name, id, attributes }
 */
router.post('/custom/:structureGroup/:path(*)?', async (req, res) => {
  try {
    const { structureGroup, path } = req.params;
    const payload = req.body || {};

    if (!['areas', 'iterations'].includes(structureGroup.toLowerCase())) {
      return res.status(400).json({ success: false, message: 'structureGroup must be "areas" or "iterations"' });
    }

    if (!payload.name && !payload.id) {
      return res.status(400).json({ success: false, message: 'Either name (for creation) or id (for move) is required' });
    }

    const service = getClassificationNodeService(req);
    const result = await service.createOrUpdateClassificationNode(
      structureGroup,
      path || '',
      payload,
      { overridePolicy: req.query.overridePolicy === 'true' }
    );

    const statusCode = payload.id ? 200 : 201; // 200 for move/update, 201 for create
    return res.status(statusCode).json({ success: true, ...result });
  } catch (error) {
    Logger.error('Failed generic classification node operation', error.message || error);
    const status = error.response?.status || 500;
    return res.status(status).json({ success: false, message: error.message || 'Operation failed' });
  }
});

/**
 * PATCH /api/classificationnodes/custom/:structureGroup/:path
 * Update an existing classification node (Azure DevOps PATCH endpoint).
 *
 * structureGroup: 'areas' or 'iterations'
 * path: URL path to the node (optional, encoded; empty = root)
 * Body: payload with fields to update (e.g., { name, attributes })
 */
router.patch('/custom/:structureGroup/:path(*)?', async (req, res) => {
  try {
    const { structureGroup, path } = req.params;
    const payload = req.body || {};

    if (!['areas', 'iterations'].includes(structureGroup.toLowerCase())) {
      return res.status(400).json({ success: false, message: 'structureGroup must be "areas" or "iterations"' });
    }

    if (!payload || typeof payload !== 'object' || !Object.keys(payload).length) {
      return res.status(400).json({ success: false, message: 'payload is required for update' });
    }

    const service = getClassificationNodeService(req);
    const result = await service.updateClassificationNode(structureGroup, path || '', payload);

    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    Logger.error('Failed to PATCH classification node', error.message || error);
    const status = error.response?.status || 500;
    return res.status(status).json({ success: false, message: error.message || 'Update failed' });
  }
});

/**
 * DELETE /api/classificationnodes/areas
 * Delete an area node with optional reclassification.
 * 
 * Query: ?path=Parent/Child&reclassifyId=100 (optional)
 * Body: { path, reclassifyId (optional) }
 */
router.delete('/areas', async (req, res) => {
  try {
    const { path, reclassifyId } = req.query.path ? req.query : (req.body || {});

    if (!path || !path.trim()) {
      return res.status(400).json({ success: false, message: 'Area path is required for deletion' });
    }

    const service = getClassificationNodeService(req);
    const reclassifyIdNum = reclassifyId ? parseInt(reclassifyId) : null;

    await service.deleteArea(path, reclassifyIdNum);

    Logger.info('Area deleted', { path, reclassifyId: reclassifyIdNum || 'none' });
    return res.status(204).send();
  } catch (error) {
    Logger.error('Failed to delete area', error.message || error);
    const status = error.response?.status || 500;
    return res.status(status).json({ success: false, message: error.message || 'Failed to delete area' });
  }
});

/**
 * DELETE /api/classificationnodes/iterations
 * Delete an iteration node with optional reclassification.
 * 
 * Query: ?path=Release/Sprint&reclassifyId=200 (optional)
 * Body: { path, reclassifyId (optional) }
 */
router.delete('/iterations', async (req, res) => {
  try {
    const { path, reclassifyId } = req.query.path ? req.query : (req.body || {});

    if (!path || !path.trim()) {
      return res.status(400).json({ success: false, message: 'Iteration path is required for deletion' });
    }

    const service = getClassificationNodeService(req);
    const reclassifyIdNum = reclassifyId ? parseInt(reclassifyId) : null;

    await service.deleteIteration(path, reclassifyIdNum);

    Logger.info('Iteration deleted', { path, reclassifyId: reclassifyIdNum || 'none' });
    return res.status(204).send();
  } catch (error) {
    Logger.error('Failed to delete iteration', error.message || error);
    const status = error.response?.status || 500;
    return res.status(status).json({ success: false, message: error.message || 'Failed to delete iteration' });
  }
});

/**
 * DELETE /api/classificationnodes/custom/:structureGroup/:path
 * Generic endpoint for deleting classification nodes.
 * 
 * structureGroup: 'areas' or 'iterations'
 * path: URL path to the node (encoded)
 * Query: ?$reclassifyId=100 (optional)
 */
router.delete('/custom/:structureGroup/:path(*)?', async (req, res) => {
  try {
    const { structureGroup, path } = req.params;
    const reclassifyId = req.query.$reclassifyId || req.query.reclassifyId;

    if (!['areas', 'iterations'].includes(structureGroup.toLowerCase())) {
      return res.status(400).json({ success: false, message: 'structureGroup must be "areas" or "iterations"' });
    }

    if (!path || !path.trim()) {
      return res.status(400).json({ success: false, message: 'path is required for deletion' });
    }

    const service = getClassificationNodeService(req);
    const opts = {};
    if (reclassifyId && Number.isInteger(parseInt(reclassifyId))) {
      opts.reclassifyId = parseInt(reclassifyId);
    }

    await service.deleteClassificationNode(structureGroup, path, opts);

    Logger.info('Classification node deleted', { structureGroup, path, reclassifyId: opts.reclassifyId || 'none' });
    return res.status(204).send();
  } catch (error) {
    Logger.error('Failed generic classification node deletion', error.message || error);
    const status = error.response?.status || 500;
    return res.status(status).json({ success: false, message: error.message || 'Deletion failed' });
  }
});

/**
 * GET /api/classificationnodes
 * Get classification nodes by ids, or root classification nodes when ids are not provided.
 *
 * Query: ?ids=1,2,3 (optional) & $depth=2 (optional) & errorPolicy=fail|omit (optional)
 */
router.get('/', async (req, res) => {
  try {
    const { ids } = req.query;
    const depthParam = req.query.$depth;
    const errorPolicy = req.query.errorPolicy;

    // Parse ids
    let parsedIds = null;
    if (ids !== undefined) {
      if (typeof ids === 'string' && ids.trim()) {
        parsedIds = ids
          .split(',')
          .map(v => parseInt(v.trim(), 10))
          .filter(n => Number.isInteger(n) && n > 0);
        if (!parsedIds.length) {
          return res.status(400).json({ success: false, message: 'ids must contain at least one positive integer' });
        }
      } else {
        return res.status(400).json({ success: false, message: 'ids must be a comma-separated list of integers when provided' });
      }
    }

    // Validate depth
    let depth = null;
    if (depthParam !== undefined) {
      const d = parseInt(depthParam, 10);
      if (!Number.isInteger(d) || d <= 0) {
        return res.status(400).json({ success: false, message: '$depth must be a positive integer' });
      }
      depth = d;
    }

    // Validate errorPolicy
    let validatedErrorPolicy = null;
    if (errorPolicy !== undefined) {
      const ep = String(errorPolicy).toLowerCase();
      if (!['fail', 'omit'].includes(ep)) {
        return res.status(400).json({ success: false, message: 'errorPolicy must be "fail" or "omit" if provided' });
      }
      validatedErrorPolicy = ep;
    }

    const service = getClassificationNodeService(req);
    const result = await service.getClassificationNodes(parsedIds, {
      depth,
      errorPolicy: validatedErrorPolicy
    });

    Logger.info('Classification nodes retrieved (ids/root)', {
      ids: parsedIds ? parsedIds.join(',') : '(root)',
      depth: depth || 'none',
      errorPolicy: validatedErrorPolicy || 'default'
    });

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    Logger.error('Failed to get classification nodes (ids/root)', error.message || error);
    const status = error.response?.status || 500;
    return res.status(status).json({ success: false, message: error.message || 'Failed to get classification nodes' });
  }
});

/**
 * GET /api/classificationnodes/areas
 * Get an area node by path with optional depth for children.
 * 
 * Query: ?path=Parent/Child&$depth=2 (depth optional)
 */
router.get('/areas', async (req, res) => {
  try {
    const { path } = req.query;

    const service = getClassificationNodeService(req);
    const opts = {};
    if (req.query.$depth && Number.isInteger(parseInt(req.query.$depth))) {
      opts.depth = parseInt(req.query.$depth);
    }

    const result = await service.getArea(path || '', opts.depth || null);

    Logger.info('Area retrieved', { path: path || '(root)', id: result.id, hasChildren: result.hasChildren });
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    Logger.error('Failed to get area', error.message || error);
    const status = error.response?.status || 500;
    return res.status(status).json({ success: false, message: error.message || 'Failed to get area' });
  }
});

/**
 * GET /api/classificationnodes/iterations
 * Get an iteration node by path with optional depth for children.
 * 
 * Query: ?path=Release/Sprint&$depth=2 (depth optional)
 */
router.get('/iterations', async (req, res) => {
  try {
    const { path } = req.query;

    const service = getClassificationNodeService(req);
    const opts = {};
    if (req.query.$depth && Number.isInteger(parseInt(req.query.$depth))) {
      opts.depth = parseInt(req.query.$depth);
    }

    const result = await service.getIteration(path || '', opts.depth || null);

    Logger.info('Iteration retrieved', { path: path || '(root)', id: result.id, hasChildren: result.hasChildren });
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    Logger.error('Failed to get iteration', error.message || error);
    const status = error.response?.status || 500;
    return res.status(status).json({ success: false, message: error.message || 'Failed to get iteration' });
  }
});

/**
 * GET /api/classificationnodes/custom/:structureGroup/:path
 * Generic get endpoint for both areas and iterations with full path support.
 * 
 * Query: ?$depth=2 (depth optional)
 */
router.get('/custom/:structureGroup/:path(*)?', async (req, res) => {
  try {
    const { structureGroup, path } = req.params;

    if (!structureGroup || !['areas', 'iterations'].includes(structureGroup.toLowerCase())) {
      return res.status(400).json({ success: false, message: 'structureGroup must be "areas" or "iterations"' });
    }

    const service = getClassificationNodeService(req);
    const opts = {};
    if (req.query.$depth && Number.isInteger(parseInt(req.query.$depth))) {
      opts.depth = parseInt(req.query.$depth);
    }

    const result = await service.getClassificationNode(structureGroup, path || '', opts);

    Logger.info('Classification node retrieved', { structureGroup, path: path || '(root)', id: result.id, hasChildren: result.hasChildren });
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    Logger.error('Failed generic classification node retrieval', error.message || error);
    const status = error.response?.status || 500;
    return res.status(status).json({ success: false, message: error.message || 'Retrieval failed' });
  }
});

module.exports = router;
