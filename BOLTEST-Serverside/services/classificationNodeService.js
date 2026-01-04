const axios = require('axios');
const Logger = require('../utils/Logger');

/**
 * Handles classification node (Areas/Iterations) operations in Azure DevOps.
 * Supports creating, updating, and moving classification nodes.
 * API: Work Item Tracking - Classification Nodes
 */
class ClassificationNodeService {
  constructor(orgUrl, project, authHeader, httpsAgent, apiVersion = '7.1') {
    this.orgUrl = orgUrl;
    this.project = project;
    this.authHeader = authHeader;
    this.httpsAgent = httpsAgent;
    this.apiVersion = apiVersion;
  }

  /**
   * Create or update a classification node (Area or Iteration).
   * @param {string} structureGroup 'areas' or 'iterations'
   * @param {string} path Path to the node (e.g., "Parent/Child" or empty for root)
   * @param {Object} payload Node data: { name, id, attributes }
   *        - name: string - Name of the node
   *        - id: integer (optional) - For moving existing nodes by ID
   *        - attributes: object (optional) - For iterations: { startDate, finishDate }
   * @param {Object} opts Optional params: { overridePolicy }
   * @returns {Promise<Object>} WorkItemClassificationNode { id, identifier, name, structureType, path, url, ... }
   */
  async createOrUpdateClassificationNode(structureGroup, path, payload, opts = {}) {
    if (!structureGroup || !['areas', 'iterations'].includes(structureGroup.toLowerCase())) {
      throw new Error('structureGroup must be "areas" or "iterations"');
    }

    const query = new URLSearchParams({ 'api-version': this.apiVersion });
    if (opts.overridePolicy) query.set('overridePolicy', String(opts.overridePolicy));

    // Build path: /project/_apis/wit/classificationnodes/{structureGroup}/{path}
    // If path is empty, post to root; otherwise include path
    let urlPath = `${this.orgUrl}/${this.project}/_apis/wit/classificationnodes/${structureGroup}`;
    if (path && path.trim()) {
      // Encode path components
      const encodedPath = path.split('/').map(p => encodeURIComponent(p)).join('/');
      urlPath += `/${encodedPath}`;
    }

    const url = `${urlPath}?${query.toString()}`;

    try {
      Logger.info('Creating/updating classification node', {
        structureGroup,
        path: path || '(root)',
        name: payload.name || payload.id,
        url
      });

      const response = await axios.post(url, payload, {
        headers: {
          Authorization: this.authHeader,
          'Content-Type': 'application/json',
        },
        httpsAgent: this.httpsAgent,
      });

      Logger.info('Classification node created/updated', {
        id: response.data.id,
        identifier: response.data.identifier,
        name: response.data.name,
        structureType: response.data.structureType
      });

      return response.data;
    } catch (error) {
      Logger.error('Failed to create/update classification node', {
        error: error.message,
        structureGroup,
        path,
        status: error.response?.status,
        statusText: error.response?.statusText
      });
      throw error;
    }
  }

  /**
   * Create a new area node.
   * @param {string} name Area name
   * @param {string} path Parent path (optional, e.g., "ParentArea" or "ParentArea/SubArea")
   * @returns {Promise<Object>} WorkItemClassificationNode
   */
  async createArea(name, path = '') {
    if (!name || !name.trim()) {
      throw new Error('Area name is required');
    }

    return this.createOrUpdateClassificationNode('areas', path, {
      name: name.trim()
    });
  }

  /**
   * Create a new iteration node.
   * @param {string} name Iteration name
   * @param {Object} attributes Optional: { startDate, finishDate } (ISO 8601 format)
   * @param {string} path Parent path (optional)
   * @returns {Promise<Object>} WorkItemClassificationNode
   */
  async createIteration(name, attributes = {}, path = '') {
    if (!name || !name.trim()) {
      throw new Error('Iteration name is required');
    }

    const payload = { name: name.trim() };

    // Validate date formats if provided
    if (attributes.startDate) {
      try {
        new Date(attributes.startDate);
      } catch {
        throw new Error('Invalid startDate format; use ISO 8601: YYYY-MM-DDTHH:mm:ssZ');
      }
      payload.attributes = payload.attributes || {};
      payload.attributes.startDate = attributes.startDate;
    }

    if (attributes.finishDate) {
      try {
        new Date(attributes.finishDate);
      } catch {
        throw new Error('Invalid finishDate format; use ISO 8601: YYYY-MM-DDTHH:mm:ssZ');
      }
      payload.attributes = payload.attributes || {};
      payload.attributes.finishDate = attributes.finishDate;
    }

    return this.createOrUpdateClassificationNode('iterations', path, payload);
  }

  /**
   * Move a classification node to a new parent.
   * @param {string} structureGroup 'areas' or 'iterations'
   * @param {integer} nodeId Node ID to move
   * @param {string} newParentPath New parent path (e.g., "NewParent" or "NewParent/Child")
   * @returns {Promise<Object>} Updated WorkItemClassificationNode
   */
  async moveClassificationNode(structureGroup, nodeId, newParentPath) {
    if (!Number.isInteger(nodeId) || nodeId <= 0) {
      throw new Error('nodeId must be a positive integer');
    }

    if (!newParentPath || !newParentPath.trim()) {
      throw new Error('newParentPath is required for moving nodes');
    }

    return this.createOrUpdateClassificationNode(structureGroup, newParentPath, {
      id: nodeId
    });
  }

  /**
   * Update attributes of an iteration node (e.g., dates).
   * @param {integer} nodeId Node ID to update
   * @param {Object} attributes { startDate, finishDate } (ISO 8601 format)
   * @param {string} path Current path to the node
   * @returns {Promise<Object>} Updated WorkItemClassificationNode
   */
  async updateIterationAttributes(nodeId, attributes, path = '') {
    if (!Number.isInteger(nodeId) || nodeId <= 0) {
      throw new Error('nodeId must be a positive integer');
    }

    if (!attributes || typeof attributes !== 'object') {
      throw new Error('attributes object is required');
    }

    const payload = { id: nodeId, attributes };

    return this.createOrUpdateClassificationNode('iterations', path, payload);
  }

  /**
   * Delete a classification node (Area or Iteration).
   * @param {string} structureGroup 'areas' or 'iterations'
   * @param {string} path Path to the node (e.g., "Parent/Child")
   * @param {Object} opts Optional params: { reclassifyId }
   *        - reclassifyId: integer (optional) - Target node ID for reclassifying work items
   * @returns {Promise<void>} Resolves on successful deletion (204 No Content)
   */
  async deleteClassificationNode(structureGroup, path, opts = {}) {
    if (!structureGroup || !['areas', 'iterations'].includes(structureGroup.toLowerCase())) {
      throw new Error('structureGroup must be "areas" or "iterations"');
    }

    if (!path || !path.trim()) {
      throw new Error('path is required for deletion');
    }

    const query = new URLSearchParams({ 'api-version': this.apiVersion });
    if (opts.reclassifyId && Number.isInteger(opts.reclassifyId)) {
      query.set('$reclassifyId', String(opts.reclassifyId));
    }

    // Build URL with encoded path
    const encodedPath = path.split('/').map(p => encodeURIComponent(p)).join('/');
    const urlPath = `${this.orgUrl}/${this.project}/_apis/wit/classificationnodes/${structureGroup}/${encodedPath}`;
    const url = `${urlPath}?${query.toString()}`;

    try {
      Logger.info('Deleting classification node', {
        structureGroup,
        path,
        reclassifyId: opts.reclassifyId || 'none',
        url
      });

      await axios.delete(url, {
        headers: { Authorization: this.authHeader },
        httpsAgent: this.httpsAgent,
      });

      Logger.info('Classification node deleted', {
        structureGroup,
        path,
        reclassified: !!opts.reclassifyId
      });

      return;
    } catch (error) {
      Logger.error('Failed to delete classification node', {
        error: error.message,
        structureGroup,
        path,
        status: error.response?.status,
        statusText: error.response?.statusText
      });
      throw error;
    }
  }

  /**
   * Delete an area node with optional reclassification.
   * @param {string} path Path to the area (e.g., "Parent/Child")
   * @param {integer} reclassifyId Optional target area ID for reclassifying work items
   * @returns {Promise<void>}
   */
  async deleteArea(path, reclassifyId = null) {
    if (!path || !path.trim()) {
      throw new Error('Area path is required for deletion');
    }

    const opts = {};
    if (reclassifyId && Number.isInteger(reclassifyId)) {
      opts.reclassifyId = reclassifyId;
    }

    return this.deleteClassificationNode('areas', path, opts);
  }

  /**
   * Delete an iteration node with optional reclassification.
   * @param {string} path Path to the iteration (e.g., "Release/Sprint")
   * @param {integer} reclassifyId Optional target iteration ID for reclassifying work items
   * @returns {Promise<void>}
   */
  async deleteIteration(path, reclassifyId = null) {
    if (!path || !path.trim()) {
      throw new Error('Iteration path is required for deletion');
    }

    const opts = {};
    if (reclassifyId && Number.isInteger(reclassifyId)) {
      opts.reclassifyId = reclassifyId;
    }

    return this.deleteClassificationNode('iterations', path, opts);
  }

  /**
   * Get a classification node by path with optional depth for children.
   * @param {string} structureGroup 'areas' or 'iterations'
   * @param {string} path Path to the node (e.g., "Parent/Child" or empty for root)
   * @param {Object} opts Optional params: { depth }
   *        - depth: integer - Number of levels of children to fetch (1-based)
   * @returns {Promise<Object>} WorkItemClassificationNode { id, identifier, name, structureType, path, hasChildren, attributes, _links, url, ... }
   */
  async getClassificationNode(structureGroup, path = '', opts = {}) {
    if (!structureGroup || !['areas', 'iterations'].includes(structureGroup.toLowerCase())) {
      throw new Error('structureGroup must be "areas" or "iterations"');
    }

    const query = new URLSearchParams({ 'api-version': this.apiVersion });
    if (opts.depth && Number.isInteger(opts.depth) && opts.depth > 0) {
      query.set('$depth', String(opts.depth));
    }

    // Build path: /project/_apis/wit/classificationnodes/{structureGroup}/{path}
    let urlPath = `${this.orgUrl}/${this.project}/_apis/wit/classificationnodes/${structureGroup}`;
    if (path && path.trim()) {
      // Encode path components
      const encodedPath = path.split('/').map(p => encodeURIComponent(p)).join('/');
      urlPath += `/${encodedPath}`;
    }

    const url = `${urlPath}?${query.toString()}`;

    try {
      Logger.info('Getting classification node', {
        structureGroup,
        path: path || '(root)',
        depth: opts.depth || 'none'
      });

      const response = await axios.get(url, {
        headers: {
          'Authorization': this.authHeader,
          'Content-Type': 'application/json'
        },
        httpsAgent: this.httpsAgent
      });

      Logger.info('Classification node retrieved successfully', {
        structureGroup,
        path: path || '(root)',
        nodeId: response.data?.id,
        name: response.data?.name
      });

      return response.data;
    } catch (error) {
      Logger.error('Failed to get classification node', {
        structureGroup,
        path: path || '(root)',
        status: error.response?.status,
        statusText: error.response?.statusText,
        message: error.message
      });

      throw error;
    }
  }

  /**
   * Get an area node.
   * @param {string} path Area path (e.g., "Department/Team" or empty for root)
   * @param {integer} depth Optional depth for children
   * @returns {Promise<Object>} WorkItemClassificationNode for area
   */
  async getArea(path = '', depth = null) {
    const opts = {};
    if (depth && Number.isInteger(depth) && depth > 0) {
      opts.depth = depth;
    }

    return this.getClassificationNode('areas', path, opts);
  }

  /**
   * Get an iteration node.
   * @param {string} path Iteration path (e.g., "Release/Sprint" or empty for root)
   * @param {integer} depth Optional depth for children
   * @returns {Promise<Object>} WorkItemClassificationNode for iteration
   */
  async getIteration(path = '', depth = null) {
    const opts = {};
    if (depth && Number.isInteger(depth) && depth > 0) {
      opts.depth = depth;
    }

    return this.getClassificationNode('iterations', path, opts);
  }

  /**
   * Get classification nodes by IDs or fetch root nodes when ids are not provided.
   * @param {Array<number>|string|null} ids Array of node IDs, comma-separated string, or null for root
   * @param {Object} opts Optional params: { depth, errorPolicy }
   *        - depth: integer - Number of levels of children to fetch (1-based)
   *        - errorPolicy: 'fail' | 'omit' - How to handle partial failures when fetching by ids
   * @returns {Promise<Object>} Azure DevOps response (WorkItemClassificationNode or collection)
   */
  async getClassificationNodes(ids = null, opts = {}) {
    // Normalize ids input
    let idList = [];
    if (Array.isArray(ids)) {
      idList = ids.filter(n => Number.isInteger(n) && n > 0);
      if (ids.length && idList.length !== ids.length) {
        throw new Error('All ids must be positive integers');
      }
    } else if (typeof ids === 'string' && ids.trim()) {
      idList = ids
        .split(',')
        .map(v => parseInt(v.trim(), 10))
        .filter(n => Number.isInteger(n) && n > 0);
      if (!idList.length) {
        throw new Error('ids must contain at least one positive integer');
      }
    } else if (ids !== null && ids !== undefined && ids !== '') {
      throw new Error('ids must be an array, comma-separated string, or null/empty for root');
    }

    const query = new URLSearchParams({ 'api-version': this.apiVersion });
    if (idList.length) {
      query.set('ids', idList.join(','));
    }
    if (opts.depth && Number.isInteger(opts.depth) && opts.depth > 0) {
      query.set('$depth', String(opts.depth));
    }
    if (opts.errorPolicy && ['fail', 'omit'].includes(String(opts.errorPolicy).toLowerCase())) {
      query.set('errorPolicy', String(opts.errorPolicy));
    }

    const url = `${this.orgUrl}/${this.project}/_apis/wit/classificationnodes?${query.toString()}`;

    try {
      Logger.info('Getting classification nodes (ids/root)', {
        ids: idList.length ? idList.join(',') : '(root)',
        depth: opts.depth || 'none',
        errorPolicy: opts.errorPolicy || 'default'
      });

      const response = await axios.get(url, {
        headers: {
          Authorization: this.authHeader,
          'Content-Type': 'application/json'
        },
        httpsAgent: this.httpsAgent
      });

      Logger.info('Classification nodes retrieved', {
        ids: idList.length ? idList.join(',') : '(root)',
        depth: opts.depth || 'none'
      });

      return response.data;
    } catch (error) {
      Logger.error('Failed to get classification nodes', {
        ids: idList.length ? idList.join(',') : '(root)',
        depth: opts.depth || 'none',
        status: error.response?.status,
        statusText: error.response?.statusText,
        message: error.message
      });

      throw error;
    }
  }

  /**
   * Convenience wrapper to get root classification nodes (areas/iterations trees) with optional depth.
   * @param {integer|null} depth Optional depth for children
   * @returns {Promise<Object>} Azure DevOps response
   */
  async getRootClassificationNodes(depth = null) {
    const opts = {};
    if (depth && Number.isInteger(depth) && depth > 0) {
      opts.depth = depth;
    }
    return this.getClassificationNodes(null, opts);
  }

  /**
   * Update an existing classification node using PATCH (Azure DevOps Update endpoint).
   * @param {string} structureGroup 'areas' or 'iterations'
   * @param {string} path Path to the node (e.g., "Parent/Child" or empty for root)
   * @param {Object} payload Node payload (e.g., { name, attributes, hasChildren })
   * @returns {Promise<Object>} Updated WorkItemClassificationNode
   */
  async updateClassificationNode(structureGroup, path = '', payload = {}) {
    if (!structureGroup || !['areas', 'iterations'].includes(structureGroup.toLowerCase())) {
      throw new Error('structureGroup must be "areas" or "iterations"');
    }

    if (!payload || typeof payload !== 'object' || !Object.keys(payload).length) {
      throw new Error('payload is required for update');
    }

    const query = new URLSearchParams({ 'api-version': this.apiVersion });

    let urlPath = `${this.orgUrl}/${this.project}/_apis/wit/classificationnodes/${structureGroup}`;
    if (path && path.trim()) {
      const encodedPath = path.split('/').map(p => encodeURIComponent(p)).join('/');
      urlPath += `/${encodedPath}`;
    }

    const url = `${urlPath}?${query.toString()}`;

    try {
      Logger.info('Updating classification node (PATCH)', {
        structureGroup,
        path: path || '(root)',
        payloadKeys: Object.keys(payload)
      });

      const response = await axios.patch(url, payload, {
        headers: {
          Authorization: this.authHeader,
          'Content-Type': 'application/json'
        },
        httpsAgent: this.httpsAgent
      });

      Logger.info('Classification node updated (PATCH)', {
        structureGroup,
        path: path || '(root)',
        id: response.data?.id,
        name: response.data?.name
      });

      return response.data;
    } catch (error) {
      Logger.error('Failed to update classification node (PATCH)', {
        structureGroup,
        path: path || '(root)',
        status: error.response?.status,
        statusText: error.response?.statusText,
        message: error.message
      });

      throw error;
    }
  }
}

module.exports = ClassificationNodeService;
