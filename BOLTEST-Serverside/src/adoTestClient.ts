/**
 * Azure DevOps Test REST API v7.1 Client
 * Production-ready TypeScript client for Test Management APIs
 * 
 * Supports:
 * - Test Runs (create, list, get, update, query)
 * - Test Results (add, update, list)
 * - Test Plans & Suites (create, list suites, add cases)
 * - Test Points (list, update)
 * - WIQL Queries
 * 
 * Authentication: PAT (Basic auth) or OAuth Bearer token
 * API Version: 7.1 (default, with preview opt-in)
 */

import axios, {
  AxiosInstance,
  AxiosError,
  AxiosRequestConfig,
  AxiosResponse,
} from 'axios';
import {
  RunCreateModel,
  TestCaseResult,
  TestRun,
  TestRunQueryResult,
  SuiteCreateModel,
  TestSuite,
  SuiteTestCaseCreateUpdateParameters,
  TestPoint,
  TestPointUpdateModel,
  TestPlanPayload,
  WiqlQueryResult,
  TestIterationDetailsModel,
  TestActionResultModel,
  AdoClientConfig,
  AdoErrorResponse,
} from './types';

/**
 * Link type mappings for WIQL queries
 */
const LINK_TYPE_MAP = {
  testedBy: 'Microsoft.VSTS.Common.TestedBy',
  tests: 'Microsoft.VSTS.Common.Tests',
  relatedWorkItem: 'System.LinkTypes.Duplicate',
} as const;

/**
 * Azure DevOps Test API Client
 * 
 * Provides type-safe access to Test Management REST APIs with:
 * - Automatic authentication (PAT or Bearer token)
 * - URL normalization (Services vs Server/TFS)
 * - Per-endpoint JSDoc with MS Docs links
 * - Strong typing for all payloads
 * - Comprehensive error handling
 */
export class AdoTestClient {
  private axios: AxiosInstance;
  private organizationUrl: string;
  private apiVersion: string;

  /**
   * Initialize Azure DevOps Test Client
   * 
   * @param config Client configuration
   * @param config.organizationUrl - Base organization URL (e.g., https://dev.azure.com/myorg or http://tfs.local/tfs/myorg)
   * @param config.project - Default project name/ID
   * @param config.pat - Personal Access Token (mutually exclusive with bearerToken)
   * @param config.bearerToken - OAuth bearer token (mutually exclusive with pat)
   * @param config.apiVersion - API version (default: 7.1)
   * 
   * @throws Error if neither PAT nor bearerToken provided
   */
  constructor(config: AdoClientConfig) {
    if (!config.pat && !config.bearerToken) {
      throw new Error('Either pat or bearerToken must be provided');
    }

    this.organizationUrl = this.normalizeUrl(config.organizationUrl);
    this.apiVersion = config.apiVersion || '7.1';

    // Initialize axios instance with auth
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (config.pat) {
      // PAT: Basic auth format ":" + PAT
      const encoded = Buffer.from(`:${config.pat}`).toString('base64');
      headers['Authorization'] = `Basic ${encoded}`;
    } else if (config.bearerToken) {
      headers['Authorization'] = `Bearer ${config.bearerToken}`;
    }

    this.axios = axios.create({
      baseURL: this.organizationUrl,
      headers,
      timeout: 30000,
    });

    // Add response interceptor for error handling
    this.axios.interceptors.response.use(
      (response) => response,
      (error) => this.handleError(error)
    );
  }

  /**
   * Normalize organization URL for both Services and Server/TFS
   * Examples:
   * - https://dev.azure.com/myorg → https://dev.azure.com/myorg/_apis
   * - http://tfs.local/tfs/mycollection → http://tfs.local/tfs/mycollection/_apis
   */
  private normalizeUrl(url: string): string {
    const normalized = url.replace(/\/$/, ''); // Remove trailing slash
    if (!normalized.includes('_apis')) {
      return `${normalized}/_apis`;
    }
    return normalized;
  }

  /**
   * Build query string with api-version and optional parameters
   */
  private buildQuery(params?: Record<string, any>, apiVersion?: string): string {
    const version = apiVersion || this.apiVersion;
    const query = new URLSearchParams();
    query.append('api-version', version);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach((v) => query.append(key, v));
          } else {
            query.append(key, String(value));
          }
        }
      });
    }

    return `?${query.toString()}`;
  }

  /**
   * Handle and surface API errors with full context
   */
  private handleError(error: AxiosError): Promise<never> {
    if (error.response) {
      const statusCode = error.response.status;
      const data = error.response.data as AdoErrorResponse | undefined;

      const errorMessage = data?.message || error.message || 'Unknown error';
      const errorCode = data?.$id || data?.id || 'UNKNOWN';

      const adoError = new Error(`[${statusCode}] ${errorMessage}`) as any;
      adoError.statusCode = statusCode;
      adoError.errorCode = errorCode;
      adoError.response = error.response;
      adoError.originalError = error;

      return Promise.reject(adoError);
    }

    return Promise.reject(error);
  }

  // ============================================================================
  // TEST RUNS
  // ============================================================================

  /**
   * Create a new test run
   * 
   * @link https://learn.microsoft.com/en-us/rest/api/azure/devops/test/runs/create?view=azure-devops-rest-7.1
   * 
   * @param project - Project ID or name
   * @param body - Run creation parameters
   * @param body.name - Name of the test run (required)
   * @param body.buildId - Build ID to associate with run
   * @param body.releaseId - Release ID to associate with run
   * @param body.buildUri - Build URI
   * @param body.releaseUri - Release URI
   * @param body.releaseEnvironmentUri - Release environment URI
   * @returns Created TestRun with ID
   */
  async createRun(
    project: string,
    body: RunCreateModel
  ): Promise<TestRun> {
    const response = await this.axios.post<TestRun>(
      `/test/runs${this.buildQuery({ project })}`,
      body
    );
    return response.data;
  }

  /**
   * Get a single test run by ID
   * 
   * @link https://learn.microsoft.com/en-us/rest/api/azure/devops/test/runs?view=azure-devops-rest-7.1
   * 
   * @param project - Project ID or name
   * @param runId - Test run ID
   * @returns TestRun object
   */
  async getRun(project: string, runId: number): Promise<TestRun> {
    const response = await this.axios.get<TestRun>(
      `/test/runs/${runId}${this.buildQuery({ project })}`
    );
    return response.data;
  }

  /**
   * List all test runs in a project
   * 
   * @link https://learn.microsoft.com/en-us/rest/api/azure/devops/test/runs?view=azure-devops-rest-7.1
   * 
   * @param project - Project ID or name
   * @param options - List options
   * @param options.buildIds - Filter by build IDs (comma-separated)
   * @param options.releaseIds - Filter by release IDs (comma-separated)
   * @param options.skip - Number of results to skip
   * @param options.top - Number of results to return (max 1000)
   * @returns Array of TestRun objects
   */
  async listRuns(
    project: string,
    options?: {
      buildIds?: number[];
      releaseIds?: number[];
      skip?: number;
      top?: number;
    }
  ): Promise<TestRun[]> {
    const params: Record<string, any> = { project };
    if (options?.buildIds?.length) {
      params.buildIds = options.buildIds.join(',');
    }
    if (options?.releaseIds?.length) {
      params.releaseIds = options.releaseIds.join(',');
    }
    if (options?.skip !== undefined) {
      params['$skip'] = options.skip;
    }
    if (options?.top !== undefined) {
      params['$top'] = options.top;
    }

    const response = await this.axios.get<{ value: TestRun[] }>(
      `/test/runs${this.buildQuery(params)}`
    );
    return response.data.value || [];
  }

  /**
   * Update a test run
   * 
   * @link https://learn.microsoft.com/en-us/rest/api/azure/devops/test/runs?view=azure-devops-rest-7.1
   * 
   * @param project - Project ID or name
   * @param runId - Test run ID
   * @param body - Update payload (partial update)
   * @returns Updated TestRun
   */
  async updateRun(
    project: string,
    runId: number,
    body: Partial<TestRun>
  ): Promise<TestRun> {
    const response = await this.axios.patch<TestRun>(
      `/test/runs/${runId}${this.buildQuery({ project })}`,
      body
    );
    return response.data;
  }

  /**
   * Query test runs by filters (build, release, branch, state)
   * 
   * @link https://learn.microsoft.com/en-us/rest/api/azure/devops/test/runs?view=azure-devops-rest-7.1
   * 
   * @param project - Project ID or name
   * @param filters - Query filters
   * @param filters.buildIds - Filter by build IDs
   * @param filters.releaseIds - Filter by release IDs
   * @param filters.branchName - Filter by branch name
   * @param filters.state - Filter by run state (NotStarted, InProgress, Completed, Aborted)
   * @param filters.skip - Number of results to skip
   * @param filters.top - Number of results to return
   * @returns TestRunQueryResult with value array
   */
  async queryRuns(
    project: string,
    filters: {
      buildIds?: number[];
      releaseIds?: number[];
      branchName?: string;
      state?: 'NotStarted' | 'InProgress' | 'Completed' | 'Aborted';
      skip?: number;
      top?: number;
    }
  ): Promise<TestRunQueryResult> {
    const params: Record<string, any> = { project };

    if (filters.buildIds?.length) {
      params.buildIds = filters.buildIds.join(',');
    }
    if (filters.releaseIds?.length) {
      params.releaseIds = filters.releaseIds.join(',');
    }
    if (filters.branchName) {
      params.branchName = filters.branchName;
    }
    if (filters.state) {
      params.state = filters.state;
    }
    if (filters.skip !== undefined) {
      params['$skip'] = filters.skip;
    }
    if (filters.top !== undefined) {
      params['$top'] = filters.top;
    }

    const response = await this.axios.get<TestRunQueryResult>(
      `/test/runs${this.buildQuery(params)}`
    );
    return response.data;
  }

  // ============================================================================
  // TEST RESULTS
  // ============================================================================

  /**
   * Add test results to a test run
   * 
   * @link https://learn.microsoft.com/en-us/rest/api/azure/devops/test/results/add?view=azure-devops-rest-7.1
   * 
   * @param project - Project ID or name
   * @param runId - Test run ID
   * @param results - Array of TestCaseResult objects to add
   * @returns Array of created TestCaseResult objects with assigned IDs
   * 
   * @example
   * const results = await client.addResults(projectId, runId, [
   *   {
   *     testCaseTitle: 'Test1',
   *     automatedTestName: 'MyTests.Test1',
   *     outcome: 'Passed',
   *     startedDate: new Date(),
   *     completedDate: new Date(),
   *     durationInMs: 100
   *   }
   * ]);
   */
  async addResults(
    project: string,
    runId: number,
    results: TestCaseResult[]
  ): Promise<TestCaseResult[]> {
    const response = await this.axios.post<{ value: TestCaseResult[] }>(
      `/test/Runs/${runId}/results${this.buildQuery({ project })}`,
      results
    );
    return response.data.value || [];
  }

  /**
   * Update existing test results in a test run
   * 
   * @link https://learn.microsoft.com/en-us/rest/api/azure/devops/test/results?view=azure-devops-rest-7.1
   * 
   * @param project - Project ID or name
   * @param runId - Test run ID
   * @param results - Array of TestCaseResult objects with ID field for updates
   * @returns Array of updated TestCaseResult objects
   * 
   * @example
   * // Update outcomes and add iteration details for manual tests
   * await client.updateResults(projectId, runId, [
   *   {
   *     id: 100000,
   *     outcome: 'Failed',
   *     comment: 'Step 1 failed',
   *     iterationDetails: [
   *       {
   *         id: 1,
   *         outcome: 'Failed',
   *         comment: 'Expected value did not match',
   *         actionResults: [
   *           {
   *             actionPath: '00000002',
   *             outcome: 'Failed',
   *             errorMessage: 'Assertion failed'
   *           }
   *         ]
   *       }
   *     ]
   *   }
   * ]);
   */
  async updateResults(
    project: string,
    runId: number,
    results: Partial<TestCaseResult>[]
  ): Promise<TestCaseResult[]> {
    const response = await this.axios.patch<{ value: TestCaseResult[] }>(
      `/test/Runs/${runId}/results${this.buildQuery({ project })}`,
      results
    );
    return response.data.value || [];
  }

  /**
   * List test results from a test run
   * 
   * @link https://learn.microsoft.com/en-us/rest/api/azure/devops/test/results?view=azure-devops-rest-7.1
   * 
   * @param project - Project ID or name
   * @param runId - Test run ID
   * @param options - List options
   * @param options.detailsToInclude - Details to include: 'none', 'iterations', 'workItems', 'subResults', 'point'
   * @param options.outcomes - Filter by outcomes (array of outcome strings, comma-separated)
   * @param options.skip - Number of results to skip
   * @param options.top - Number of results to return (max 1000 for none, 200 for others)
   * @returns Array of TestCaseResult objects
   */
  async listResults(
    project: string,
    runId: number,
    options?: {
      detailsToInclude?: 'none' | 'iterations' | 'workItems' | 'subResults' | 'point';
      outcomes?: string[];
      skip?: number;
      top?: number;
    }
  ): Promise<TestCaseResult[]> {
    const params: Record<string, any> = { project };

    if (options?.detailsToInclude) {
      params.detailsToInclude = options.detailsToInclude;
    }
    if (options?.outcomes?.length) {
      params.outcomes = options.outcomes.join(',');
    }
    if (options?.skip !== undefined) {
      params['$skip'] = options.skip;
    }
    if (options?.top !== undefined) {
      params['$top'] = options.top;
    }

    const response = await this.axios.get<{ value: TestCaseResult[] }>(
      `/test/Runs/${runId}/results${this.buildQuery(params)}`
    );
    return response.data.value || [];
  }

  /**
   * Get a single test result
   * 
   * @link https://learn.microsoft.com/en-us/rest/api/azure/devops/test/results?view=azure-devops-rest-7.1
   * 
   * @param project - Project ID or name
   * @param runId - Test run ID
   * @param resultId - Test result ID
   * @param options - Get options
   * @param options.detailsToInclude - Details to include
   * @returns Single TestCaseResult with details
   */
  async getResult(
    project: string,
    runId: number,
    resultId: number,
    options?: {
      detailsToInclude?: 'none' | 'iterations' | 'workItems' | 'subResults' | 'point';
    }
  ): Promise<TestCaseResult> {
    const params: Record<string, any> = { project };
    if (options?.detailsToInclude) {
      params.detailsToInclude = options.detailsToInclude;
    }

    const response = await this.axios.get<TestCaseResult>(
      `/test/Runs/${runId}/results/${resultId}${this.buildQuery(params)}`
    );
    return response.data;
  }

  // ============================================================================
  // TEST PLANS & SUITES
  // ============================================================================

  /**
   * Create a test plan
   * 
   * @link https://learn.microsoft.com/en-us/rest/api/azure/devops/testplan/plans/create?view=azure-devops-rest-7.1
   * 
   * @param project - Project ID or name
   * @param body - Plan creation parameters
   * @param body.name - Plan name (required)
   * @param body.description - Plan description
   * @param body.areaPath - Area path for the plan
   * @param body.iterationPath - Iteration path for the plan
   * @returns Created TestPlan object
   */
  async createTestPlan(
    project: string,
    body: TestPlanPayload
  ): Promise<any> {
    const response = await this.axios.post<any>(
      `/testplan/Plans${this.buildQuery({ project }, '7.1')}`,
      body
    );
    return response.data;
  }

  /**
   * List test suites in a test plan
   * 
   * @link https://learn.microsoft.com/en-us/rest/api/azure/devops/test/test-suites?view=azure-devops-rest-7.1
   * 
   * @param project - Project ID or name
   * @param planId - Test plan ID
   * @param options - List options
   * @param options.asTreeView - Return as tree view
   * @param options.includeChildSuites - Include child suites
   * @returns Array of TestSuite objects
   */
  async listSuites(
    project: string,
    planId: number,
    options?: {
      asTreeView?: boolean;
      includeChildSuites?: boolean;
    }
  ): Promise<TestSuite[]> {
    const params: Record<string, any> = { project };
    if (options?.asTreeView !== undefined) {
      params.asTreeView = options.asTreeView;
    }
    if (options?.includeChildSuites !== undefined) {
      params.includeChildSuites = options.includeChildSuites;
    }

    const response = await this.axios.get<{ value: TestSuite[] }>(
      `/test/Plans/${planId}/suites${this.buildQuery(params)}`
    );
    return response.data.value || [];
  }

  /**
   * Add test cases to a suite using Test API
   * 
   * @link https://learn.microsoft.com/en-us/rest/api/azure/devops/test/test-suites/add?view=azure-devops-rest-7.1
   * 
   * @param project - Project ID or name
   * @param planId - Test plan ID
   * @param suiteId - Test suite ID
   * @param testCaseIds - Array of test case work item IDs to add
   * @returns Array of added TestSuiteTestCase objects
   * 
   * @example
   * await client.addTestCasesToSuite(projectId, planId, suiteId, [33, 34, 35]);
   */
  async addTestCasesToSuite(
    project: string,
    planId: number,
    suiteId: number,
    testCaseIds: number[]
  ): Promise<any[]> {
    const params = testCaseIds.join(',');
    const response = await this.axios.post<{ value: any[] }>(
      `/test/Plans/${planId}/suites/${suiteId}/testcases/${params}${this.buildQuery(
        { project }
      )}`,
      {}
    );
    return response.data.value || [];
  }

  /**
   * Add test cases with configurations using TestPlan API
   * 
   * @link https://learn.microsoft.com/en-us/rest/api/azure/devops/testplan/suite-test-case/add?view=azure-devops-rest-7.1
   * 
   * @param project - Project ID or name
   * @param planId - Test plan ID
   * @param suiteId - Test suite ID
   * @param createParams - Array of SuiteTestCaseCreateUpdateParameters
   * @returns Array of created test case entries
   * 
   * @example
   * await client.addCasesWithConfigurations(projectId, planId, suiteId, [
   *   { testCaseId: 33, configurationIds: [1] },
   *   { testCaseId: 34, configurationIds: [1, 2] }
   * ]);
   */
  async addCasesWithConfigurations(
    project: string,
    planId: number,
    suiteId: number,
    createParams: SuiteTestCaseCreateUpdateParameters[]
  ): Promise<any[]> {
    const response = await this.axios.post<{ value: any[] }>(
      `/testplan/Plans/${planId}/Suites/${suiteId}/TestCase${this.buildQuery(
        { project },
        '7.1-preview.1'
      )}`,
      createParams
    );
    return response.data.value || [];
  }

  /**
   * Update suite test cases (e.g., associate with configurations)
   * 
   * @link https://learn.microsoft.com/en-us/rest/api/azure/devops/testplan/suite-test-case/update?view=azure-devops-rest-7.1
   * 
   * @param project - Project ID or name
   * @param planId - Test plan ID
   * @param suiteId - Test suite ID
   * @param testCaseIds - Comma-separated test case IDs (e.g. "33,34,35")
   * @param body - Update payload with configurations array
   * @param body.configurations - Array of ShallowReference objects with id/name/url
   * @returns Array of updated SuiteTestCase objects with pointAssignments
   * 
   * @example
   * await client.updateSuiteTestCases(projectId, planId, suiteId, "33,34,35", {
   *   configurations: [
   *     { id: 1, name: "Chrome", url: "..." },
   *     { id: 2, name: "Firefox", url: "..." }
   *   ]
   * });
   */
  async updateSuiteTestCases(
    project: string,
    planId: number,
    suiteId: number,
    testCaseIds: string,
    body: { configurations: any[] }
  ): Promise<any[]> {
    const response = await this.axios.patch<{ value: any[] }>(
      `/test/Plans/${planId}/suites/${suiteId}/testcases/${testCaseIds}${this.buildQuery({
        project,
      })}`,
      body
    );
    return response.data.value || [];
  }

  /**
   * Remove test cases from a suite
   * 
   * @link https://learn.microsoft.com/en-us/rest/api/azure/devops/test/test-suites/remove?view=azure-devops-rest-7.1
   * 
   * @param project - Project ID or name
   * @param planId - Test plan ID
   * @param suiteId - Test suite ID
   * @param testCaseIds - Comma-separated test case IDs to remove
   * @returns Void on success
   * 
   * @example
   * await client.removeSuiteTestCases(projectId, planId, suiteId, "33,34,35");
   */
  async removeSuiteTestCases(
    project: string,
    planId: number,
    suiteId: number,
    testCaseIds: string
  ): Promise<void> {
    await this.axios.delete(
      `/test/Plans/${planId}/suites/${suiteId}/testcases/${testCaseIds}${this.buildQuery({
        project,
      })}`
    );
  }

  /**
   * Delete a test case (work item)
   * 
   * @link https://learn.microsoft.com/en-us/rest/api/azure/devops/test/test-cases/delete?view=azure-devops-rest-7.1
   * 
   * @param project - Project ID or name
   * @param testCaseId - Test case work item ID
   * @param permanent - Permanently delete (default: soft delete)
   * @returns Void on success (204 No Content)
   * 
   * @example
   * await client.deleteTestCase(projectId, 33);
   */
  async deleteTestCase(
    project: string,
    testCaseId: number,
    permanent: boolean = false
  ): Promise<void> {
    const params: Record<string, any> = { project };
    if (permanent) {
      params.permanent = true;
    }

    await this.axios.delete(
      `/test/testcases/${testCaseId}${this.buildQuery(params)}`
    );
  }

  // ============================================================================
  // TEST POINTS
  // ============================================================================

  /**
   * List test points for a suite
   * 
   * @link https://learn.microsoft.com/en-us/rest/api/azure/devops/test/points?view=azure-devops-rest-7.1
   * 
   * @param project - Project ID or name
   * @param planId - Test plan ID
   * @param suiteId - Test suite ID
   * @param options - List options
   * @param options.includePointDetails - Include detailed point information
   * @param options.skip - Number to skip
   * @param options.top - Number to return
   * @returns Array of TestPoint objects
   */
  async listPoints(
    project: string,
    planId: number,
    suiteId: number,
    options?: {
      includePointDetails?: boolean;
      skip?: number;
      top?: number;
    }
  ): Promise<TestPoint[]> {
    const params: Record<string, any> = { project };

    if (options?.includePointDetails !== undefined) {
      params.includePointDetails = options.includePointDetails;
    }
    if (options?.skip !== undefined) {
      params['$skip'] = options.skip;
    }
    if (options?.top !== undefined) {
      params['$top'] = options.top;
    }

    const response = await this.axios.get<{ value: TestPoint[] }>(
      `/test/Plans/${planId}/Suites/${suiteId}/points${this.buildQuery(params)}`
    );
    return response.data.value || [];
  }

  /**
   * Update test points (outcome, tester, reset to active)
   * 
   * @link https://learn.microsoft.com/en-us/rest/api/azure/devops/test/points/update?view=azure-devops-rest-7.1
   * 
   * @param project - Project ID or name
   * @param planId - Test plan ID
   * @param suiteId - Test suite ID
   * @param pointIds - Array of test point IDs to update
   * @param updates - Update payload
   * @param updates.outcome - New outcome (Passed, Failed, Blocked, etc)
   * @param updates.tester - User ID/email to assign as tester
   * @param updates.resetToActive - Set to true to reset to active state
   * @returns Array of updated TestPoint objects
   * 
   * @example
   * await client.updatePoints(projectId, planId, suiteId, [1, 2, 3], {
   *   outcome: 'Passed'
   * });
   */
  async updatePoints(
    project: string,
    planId: number,
    suiteId: number,
    pointIds: number[],
    updates: TestPointUpdateModel
  ): Promise<TestPoint[]> {
    const idParam = pointIds.join(',');
    const response = await this.axios.patch<{ value: TestPoint[] }>(
      `/test/Plans/${planId}/Suites/${suiteId}/points/${idParam}${this.buildQuery({
        project,
      })}`,
      updates
    );
    return response.data.value || [];
  }

  // ============================================================================
  // WIQL QUERIES
  // ============================================================================

  /**
   * Execute WIQL query to find work items
   * 
   * @link https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/wiql?view=azure-devops-rest-7.1
   * 
   * @param project - Project ID or name (optional for cross-project queries)
   * @param wiql - WIQL query string
   * @param options - Query options
   * @param options.timePrecision - Include time in dates
   * @param options.top - Maximum results to return
   * @returns WiqlQueryResult with matching work item IDs
   * 
   * @example
   * const result = await client.queryByWiql(projectId,
   *   'SELECT [System.Id] FROM WorkItems WHERE [System.WorkItemType] = "User Story"'
   * );
   */
  async queryByWiql(
    project: string,
    wiql: string,
    options?: {
      timePrecision?: boolean;
      top?: number;
    }
  ): Promise<WiqlQueryResult> {
    const params: Record<string, any> = {};
    if (options?.timePrecision !== undefined) {
      params.timePrecision = options.timePrecision;
    }
    if (options?.top !== undefined) {
      params.$top = options.top;
    }

    const response = await this.axios.post<WiqlQueryResult>(
      `/_apis/wit/wiql${this.buildQuery(params)}`,
      { query: wiql }
    );
    return response.data;
  }

  /**
   * Find user stories with associated test cases (using TestedBy link)
   * 
   * WIQL uses Microsoft.VSTS.Common.TestedBy link type to find test relationships
   * 
   * @param project - Project ID or name
   * @param options - Query options
   * @param options.areaPath - Filter by area path
   * @param options.iterationPath - Filter by iteration path
   * @param options.top - Maximum results
   * @returns WiqlQueryResult with story IDs and their test associations
   * 
   * @example
   * const stories = await client.findStoriesWithTests(projectId);
   * // Returns: { workItemRelations: [{ target: {id, url}, rel: 'Microsoft.VSTS.Common.TestedBy', source: {...} }] }
   */
  async findStoriesWithTests(
    project: string,
    options?: {
      areaPath?: string;
      iterationPath?: string;
      top?: number;
    }
  ): Promise<WiqlQueryResult> {
    let wiql = `SELECT [System.Id] FROM WorkItems 
      WHERE [System.WorkItemType] = 'User Story' 
      AND [System.State] <> 'Removed'`;

    if (options?.areaPath) {
      wiql += ` AND [System.AreaPath] = '${options.areaPath}'`;
    }
    if (options?.iterationPath) {
      wiql += ` AND [System.IterationPath] = '${options.iterationPath}'`;
    }

    wiql += ` MODE (MUST) [System.Links.LinkType] = '${LINK_TYPE_MAP.testedBy}'`;

    return this.queryByWiql(project, wiql, { top: options?.top });
  }

  /**
   * Get link type map for reference
   */
  getLinkTypeMap() {
    return LINK_TYPE_MAP;
  }
}

/**
 * Helper function to create client instance
 */
export function createAdoTestClient(config: AdoClientConfig): AdoTestClient {
  return new AdoTestClient(config);
}

// Export types
export type {
  AdoClientConfig,
  RunCreateModel,
  TestRun,
  TestCaseResult,
  TestSuite,
  TestPoint,
  TestPointUpdateModel,
  WiqlQueryResult,
  TestIterationDetailsModel,
  TestActionResultModel,
  AdoErrorResponse,
};
