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
  
  getTestCases: async () => {
    const project = (localStorage.getItem('boltest:project') || '').trim();
    const orgUrl = (localStorage.getItem('boltest:orgUrl') || '').trim();
    const params = new URLSearchParams();
    if (project) params.append('project', project);
    const headers = orgUrl ? { headers: { 'X-OrgUrl': orgUrl } } : undefined;
    const query = params.toString();
    const adoUrl = `/api/ado/testcases?${query}`;
    const legacyUrl = `/api/testcases?${query}`;

    try {
      const res = await cachedGet(adoUrl, headers, 60_000);
      if (res?.data?.success) {
        return res;
      }
    } catch (e) {
      // swallow and try legacy route
    }

    return cachedGet(legacyUrl, headers, 60_000);
  },
  
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

// Tag suggestions from Azure DevOps (ADO/TFS)
export const tagSuggestionApi = {
  getSuggestions: (opts?: { areaPath?: string; iterationPath?: string; top?: number; search?: string }) => {
    const params = new URLSearchParams();
    const project = (localStorage.getItem('boltest:project') || '').trim();
    const orgUrl = (localStorage.getItem('boltest:orgUrl') || '').trim();
    if (project) params.append('project', project);
    if (opts?.areaPath) params.append('areaPath', opts.areaPath);
    if (opts?.iterationPath) params.append('iterationPath', opts.iterationPath);
    if (typeof opts?.top === 'number') params.append('top', String(opts.top));
    if (opts?.search) params.append('search', opts.search);
    const headers = orgUrl ? { headers: { 'X-OrgUrl': orgUrl } } : undefined;
    return cachedGet(`/api/ado/tags/suggestions?${params.toString()}`, headers, 120_000);
  }
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
