import { cachedGet } from '../../../shared/services/apiClient';

const baseFromStorage = () => (localStorage.getItem('boltest:metricsBase') || '').trim();

export const toTeamSlug = (teamPath: string) => {
  const raw = (teamPath || '').toString().trim().toLowerCase();
  if (!raw) return '';
  // Convert backslashes to hyphens, remove apostrophes, replace spaces with hyphens
  return raw
    .replace(/\\/g, '-')
    .replace(/'/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
};

const buildUrl = (endpoint: string, params: Record<string, string | number | undefined>) => {
  const base = baseFromStorage() || '/api/SprintAnalytics';
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') qs.append(k, String(v));
  });
  const sep = base.endsWith('/') ? '' : '/';
  return `${base}${sep}${endpoint}?${qs.toString()}`;
};

export const metricsApi = {
  // Legacy support: some providers use 'team='
  getSprintSummaryLegacy: (teams: string[], sprint: string) => {
    const teamParam = teams.join(',');
    const url = buildUrl('sprint-summary', { team: teamParam, sprint });
    return cachedGet(url, undefined, 30_000);
  },
  // Preferred: use 'teams=' with raw team paths (e.g., Epos\RnD\Keren's Team)
  getSprintSummary: (teams: string[], sprint: string) => {
    const teamsParam = teams.join(',');
    const url = buildUrl('sprint-summary', { teams: teamsParam, sprint });
    return cachedGet(url, undefined, 30_000);
  },
  getSprintStoryPoints: (teams: string[], sprint: string) => {
    const teamsParam = teams.join(',');
    const url = buildUrl('sprint-story-points', { teams: teamsParam, sprint });
    return cachedGet(url, undefined, 30_000);
  },
  getSprintCapacity: (teams: string[], sprint: string) => {
    const teamsParam = teams.join(',');
    const url = buildUrl('sprint-capacity', { teams: teamsParam, sprint });
    return cachedGet(url, undefined, 30_000);
  },
  getSprintTasks: (teams: string[], sprint: string) => {
    const teamsParam = teams.join(',');
    const url = buildUrl('sprint-tasks', { teams: teamsParam, sprint });
    return cachedGet(url, undefined, 30_000);
  }
};
