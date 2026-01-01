import { apiClient } from '../../shared/services/apiClient';

export type WorkItemPayload = {
  type: 'Bug' | 'Task' | 'User Story' | 'Test Case';
  title: string;
  description?: string;
  reproSteps?: string;
  steps?: Array<{ action: string; expectedResult?: string }>;
  stepsText?: string;
  priority?: number;
  state?: string;
  area?: string;
  iteration?: string;
  tags?: string;
  assignedTo?: string;
  parentId?: number;
};

export const workItemsApi = {
  create: (payload: WorkItemPayload) => apiClient.post('/api/workitems/create', payload)
};
