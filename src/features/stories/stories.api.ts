import { cachedGet } from '../../shared/services/apiClient';

export type UserStory = {
  id: number;
  title: string;
  state: string;
  assignedTo: string;
  areaPath: string;
  url: string;
  relatedTestCases: any[];
};

export type BugItem = {
  id: number;
  title: string;
  state: string;
  assignedTo: any;
  url: string | null;
};

export type MyTaskItem = {
  id: number;
  title: string;
  state: string;
  assignedTo: any;
  url: string | null;
  bugs: BugItem[];
};

const withOrgHeader = (orgUrl: string) => {
  const org = (orgUrl || localStorage.getItem('boltest:orgUrl') || '').trim();
  return org ? { headers: { 'X-OrgUrl': org } } : {};
};

export const storiesApi = {
  // Fetch all user stories from Azure DevOps
  getUserStories: (orgUrl: string, project: string, areaPath?: string, iterationPath?: string) => {
    const params = new URLSearchParams({ project });
    if (areaPath) params.append('areaPath', areaPath);
    if (iterationPath) params.append('iterationPath', iterationPath);
    return cachedGet(`/api/ado/userstories?${params.toString()}`, withOrgHeader(orgUrl), 120_000);
  },

  // Get user stories WITHOUT test cases
  getStoriesWithoutTests: (orgUrl: string, project: string, areaPath?: string) => {
    const params = new URLSearchParams({ project });
    if (areaPath) params.append('areaPath', areaPath);
    return cachedGet(`/api/ado/userstories/notests?${params.toString()}`, withOrgHeader(orgUrl), 120_000);
  },

  // Get user stories WITH test cases
  getStoriesWithTests: (orgUrl: string, project: string, areaPath?: string) => {
    const params = new URLSearchParams({ project });
    if (areaPath) params.append('areaPath', areaPath);
    return cachedGet(`/api/ado/userstories/hastests?${params.toString()}`, withOrgHeader(orgUrl), 120_000);
  },

  // Get test cases linked to a user story
  getTestCasesForStory: (userStoryId: number) =>
    cachedGet(`/api/ado/userstories/${userStoryId}/testcases`, undefined, 120_000),

  getMyTasksWithChildBugs: (orgUrl: string, project: string, areaPath?: string, iterationPath?: string) => {
    const params = new URLSearchParams({ project });
    if (areaPath) params.append('areaPath', areaPath);
    if (iterationPath) params.append('iterationPath', iterationPath);
    return cachedGet(`/api/ado/mytasks?${params.toString()}`, withOrgHeader(orgUrl), 60_000);
  }
};
