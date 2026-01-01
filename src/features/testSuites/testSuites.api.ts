import { apiClient } from '../../shared/services/apiClient';

export type AddCasesPayload = {
  planId: number;
  suiteId: number;
  testCaseIds: number[];
  apiVersion?: string; // default 7.2-preview.3
};

export const testSuitesApi = {
  addCases: (payload: AddCasesPayload) => apiClient.post('/api/test-suites/add-cases', payload)
};
