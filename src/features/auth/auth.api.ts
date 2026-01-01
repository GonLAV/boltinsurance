import { apiClient } from '../../shared/services/apiClient';
import { LoginPayload, TestConnectionPayload } from './auth.types';

function normalizeOrgUrlForProject(orgUrl: string, project: string) {
  const raw = String(orgUrl || '').trim().replace(/\/+$/, '');
  const projectName = String(project || '').trim();
  if (!raw || !projectName) return raw;
  const suffix = `/${projectName}`.toLowerCase();
  return raw.toLowerCase().endsWith(suffix) ? raw.slice(0, raw.length - suffix.length) : raw;
}

export const authApi = {
  testConnection: (payload: TestConnectionPayload) =>
    apiClient.post('/api/auth/test-connection', {
      ...payload,
      orgUrl: normalizeOrgUrlForProject(payload.orgUrl, payload.project)
    }),
  login: (payload: LoginPayload) =>
    apiClient.post('/api/auth/login', {
      ...payload,
      orgUrl: normalizeOrgUrlForProject(payload.orgUrl, payload.project)
    }),
  logout: () => apiClient.post('/api/auth/logout')
};
