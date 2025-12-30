import { apiClient, cachedGet } from '../../shared/services/apiClient';
import { Step } from './testCase.types';

export const testCaseApi = {
  uploadAttachment: (file: File, workItemId?: number, stepId?: number) => {
    const fd = new FormData();
    fd.append('file', file);
    if (workItemId !== undefined && workItemId !== null) {
      fd.append('workItemId', String(workItemId));
    }
    if (stepId !== undefined && stepId !== null) {
      fd.append('stepId', String(stepId));
    }
    return apiClient.post('/api/attachments', fd, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  
  createTestCase: (payload: {
    title: string;
    description?: string;
    steps: Step[];
    tags?: string;
    priority?: number;
    state?: string;
    area?: string;
    iteration?: string;
    userStoryId?: number | null;
    attachmentIds?: string[];
  }) => apiClient.post('/api/testcases/create', payload),
  
  createTestCaseWithFiles: (formData: FormData) => apiClient.post('/api/testcases/create-with-files', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  
  getTestCases: () => cachedGet('/api/testcases', undefined, 120_000),
  
  getTestCaseById: (testCaseId: number) => cachedGet(`/api/testcases/${testCaseId}`, undefined, 120_000),
  
  cloneTestCase: (testCaseId: number) => apiClient.post(`/api/testcases/${testCaseId}/clone`, {}),
  
  updateTestCase: (testCaseId: number, payload: {
    title: string;
    description?: string;
    steps: Step[];
    tags?: string;
    priority?: number;
    state?: string;
    area?: string;
    iteration?: string;
    attachmentIds?: string[];
  }) => apiClient.patch(`/api/testcases/${testCaseId}`, payload)
};

export const wikiAttachmentApi = {
  uploadAttachment: (file: File, wikiIdentifier: string = 'wiki') => {
    const fd = new FormData();
    fd.append('attachment', file);
    fd.append('wikiIdentifier', wikiIdentifier);
    return apiClient.post('/api/wiki-attachments/upload', fd, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  
  getAttachment: (wikiIdentifier: string, attachmentPath: string) =>
    apiClient.get(`/api/wiki-attachments/${wikiIdentifier}/attachments?path=${encodeURIComponent(attachmentPath)}`),
  
  deleteAttachment: (wikiIdentifier: string, attachmentPath: string) =>
    apiClient.delete(`/api/wiki-attachments/${wikiIdentifier}/attachments?path=${encodeURIComponent(attachmentPath)}`)
};
