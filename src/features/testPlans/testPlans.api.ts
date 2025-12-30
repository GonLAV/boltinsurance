import { apiClient } from '../../shared/services/apiClient';

export type TestPlan = {
  id: number;
  name: string;
  state?: string;
  startDate?: string;
  endDate?: string;
  rootSuiteId?: number;
  revision?: number;
};

export type TestSuite = {
  id: number;
  name: string;
  suiteType?: string;
  parentSuite?: { id: number; name?: string } | null;
  testCaseCount?: number;
  children?: TestSuite[];
};

export type SuiteEntry = {
  id: number;
  sequenceNumber?: number;
  testCase?: { id: number; name?: string };
  suite?: { id: number; name?: string };
  suiteEntryType?: 'testCase' | 'suite' | string;
};

export type TestPoint = {
  id: number;
  testCase: { id: number };
  configuration?: { id: number; name?: string };
  outcome?: string;
};

export type GetPlansRequest = {
  org: string;
  project: string;
  backendKey?: string;
};

export type GetSuitesRequest = {
  org: string;
  project: string;
  planId: number;
  backendKey?: string;
};

export type GetSuiteEntriesRequest = {
  org: string;
  project: string;
  suiteId: number;
  suiteEntryType?: 'testCase' | 'suite';
  backendKey?: string;
};

export type CreateRunRequest = {
  org: string;
  project: string;
  name: string;
  planId?: number;
  comment?: string;
  backendKey?: string;
};

export type AddRunResultRequest = {
  org: string;
  project: string;
  runId: number;
  outcome: 'Passed' | 'Failed' | 'Blocked' | 'Inconclusive' | 'NotApplicable' | 'Paused';
  comment?: string;
  testCaseId?: number;
  testPointId?: number;
  backendKey?: string;
};

export type GetTestPointsRequest = {
  org: string;
  project: string;
  planId: number;
  suiteId: number;
  includePointDetails?: boolean;
  testCaseId?: number;
  backendKey?: string;
};

const withBackendKey = (backendKey?: string) =>
  backendKey
    ? {
        headers: { 'x-backend-key': backendKey }
      }
    : {};

export const testPlansApi = {
  getPlans: ({ org, project, backendKey }: GetPlansRequest) =>
    apiClient.get('/api/ado/testplans', {
      params: { org, project },
      ...withBackendKey(backendKey)
    }),
  getSuites: ({ org, project, planId, backendKey }: GetSuitesRequest) =>
    apiClient.get('/api/ado/testsuites', {
      params: { org, project, planId },
      ...withBackendKey(backendKey)
    }),
  getSuiteEntries: ({ org, project, suiteId, suiteEntryType = 'testCase', backendKey }: GetSuiteEntriesRequest) =>
    apiClient.get('/api/ado/suiteentries', {
      params: { org, project, suiteId, suiteEntryType },
      ...withBackendKey(backendKey)
    }),
  createRun: ({ org, project, name, planId, comment, backendKey }: CreateRunRequest) =>
    apiClient.post(
      '/api/ado/testrun',
      { org, project, name, planId, comment },
      withBackendKey(backendKey)
    ),
  addRunResult: ({ org, project, runId, outcome, comment, testCaseId, testPointId, backendKey }: AddRunResultRequest) =>
    apiClient.post(
      `/api/ado/testrun/${runId}/result`,
      { org, project, result: { outcome, comment, testCaseId, testPointId } },
      withBackendKey(backendKey)
    ),
  getTestPoints: ({ org, project, planId, suiteId, includePointDetails = true, testCaseId, backendKey }: GetTestPointsRequest) =>
    apiClient.get('/api/ado/testpoints', {
      params: { org, project, planId, suiteId, includePointDetails, testCaseId },
      ...withBackendKey(backendKey)
    })
};
