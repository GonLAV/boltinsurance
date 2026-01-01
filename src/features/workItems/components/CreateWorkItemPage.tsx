import React, { useState } from 'react';
import { workItemsApi, WorkItemPayload } from '../workItems.api';
import './CreateWorkItemPage.css';

const defaultPayload: WorkItemPayload = {
  type: 'Bug',
  title: '',
  description: '',
  reproSteps: '',
  stepsText: '',
  priority: 2,
  tags: '',
};

const CreateWorkItemPage: React.FC = () => {
  const [payload, setPayload] = useState<WorkItemPayload>(defaultPayload);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ id?: number; url?: string; created?: boolean; message?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'repro' | 'meta'>('overview');

  const handleChange = (field: keyof WorkItemPayload, value: any) => {
    setPayload((p) => ({ ...p, [field]: value }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setError(null);

    const body: WorkItemPayload = {
      ...payload,
      steps: payload.type === 'Test Case' ? undefined : undefined,
    };

    try {
      const res = await workItemsApi.create(body);
      setResult({ id: res.data?.data?.id, url: res.data?.data?.url, created: true, message: res.data?.message });
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to create work item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-card">
      <div className="card-header">
        <div>
          <h2>Create Work Item</h2>
          <p className="muted">Create Bug, Task, User Story, or Test Case using the server PAT.</p>
        </div>
        <div className="pill">Azure DevOps</div>
      </div>

      <div className="tab-strip cwi-tabs">
        <button type="button" className={`tab-chip ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
          Overview
        </button>
        {payload.type === 'Bug' && (
          <button type="button" className={`tab-chip ${activeTab === 'repro' ? 'active' : ''}`} onClick={() => setActiveTab('repro')}>
            Repro & Steps
          </button>
        )}
        {payload.type === 'Test Case' && (
          <button type="button" className={`tab-chip ${activeTab === 'repro' ? 'active' : ''}`} onClick={() => setActiveTab('repro')}>
            Steps
          </button>
        )}
        <button type="button" className={`tab-chip ${activeTab === 'meta' ? 'active' : ''}`} onClick={() => setActiveTab('meta')}>
          Meta & Links
        </button>
      </div>

      <form className="form-grid two-col" onSubmit={onSubmit}>
        {activeTab === 'overview' && (
          <>
            <div className="stack">
              <label>
                Type
                <select value={payload.type} onChange={(e) => handleChange('type', e.target.value as WorkItemPayload['type'])}>
                  <option>Bug</option>
                  <option>Task</option>
                  <option>User Story</option>
                  <option>Test Case</option>
                </select>
              </label>

              <label>
                Title
                <input value={payload.title} onChange={(e) => handleChange('title', e.target.value)} required placeholder="Clear, action-based title" />
              </label>

              <label>
                Description
                <textarea value={payload.description || ''} onChange={(e) => handleChange('description', e.target.value)} rows={6} placeholder="Context, expected behavior, notes" />
              </label>
            </div>

            <div className="stack">
              <label>
                Tags (comma or semicolon)
                <input value={payload.tags || ''} onChange={(e) => handleChange('tags', e.target.value)} placeholder="tag1, tag2" />
              </label>

              <label>
                Assigned To
                <input value={payload.assignedTo || ''} onChange={(e) => handleChange('assignedTo', e.target.value)} placeholder="user@domain" />
              </label>

              <label>
                Priority (1 high - 4 low)
                <input type="number" min={1} max={4} value={payload.priority || ''} onChange={(e) => handleChange('priority', Number(e.target.value))} />
              </label>
            </div>
          </>
        )}

        {activeTab === 'repro' && (
          <>
            {payload.type === 'Bug' && (
              <div className="section-grid cwi-span-all">
                <div className="section-stack">
                  <div className="section-block">
                    <div className="section-title">Symptom</div>
                    <label>
                      <textarea
                        value={payload.description || ''}
                        onChange={(e) => handleChange('description', e.target.value)}
                        rows={5}
                        placeholder="Describe the observed behavior"
                      />
                    </label>
                  </div>

                  <div className="section-block">
                    <div className="section-title">Step to Reproduce</div>
                    <label>
                      <textarea
                        value={payload.reproSteps || ''}
                        onChange={(e) => handleChange('reproSteps', e.target.value)}
                        rows={6}
                        placeholder="1) ...\n2) ...\n3) ..."
                      />
                    </label>
                  </div>

                  <div className="section-block">
                    <div className="section-title">Discussion / Notes</div>
                    <label>
                      <textarea
                        value={payload.tags || ''}
                        onChange={(e) => handleChange('tags', e.target.value)}
                        rows={4}
                        placeholder="Add quick notes or tags (comma/semicolon)"
                      />
                    </label>
                  </div>
                </div>

                <div className="section-stack">
                  <div className="section-block">
                    <div className="section-title">Identification</div>
                    <label>
                      Area Path
                      <input value={payload.area || ''} onChange={(e) => handleChange('area', e.target.value)} placeholder="e.g. Project\\Area" />
                    </label>
                    <label>
                      Iteration Path
                      <input value={payload.iteration || ''} onChange={(e) => handleChange('iteration', e.target.value)} placeholder="e.g. Project\\Sprint 1" />
                    </label>
                    <label>
                      Assigned To
                      <input value={payload.assignedTo || ''} onChange={(e) => handleChange('assignedTo', e.target.value)} placeholder="user@domain" />
                    </label>
                    <label>
                      Priority (1 high - 4 low)
                      <input type="number" min={1} max={4} value={payload.priority || ''} onChange={(e) => handleChange('priority', Number(e.target.value))} />
                    </label>
                    <label>
                      Parent ID (link to requirement)
                      <input type="number" value={payload.parentId || ''} onChange={(e) => handleChange('parentId', Number(e.target.value) || undefined)} placeholder="Work item ID" />
                    </label>
                  </div>
                </div>
              </div>
            )}

            {payload.type === 'Test Case' && (
              <div className="stack cwi-span-all">
                <label>
                  Steps (one per line)
                  <textarea
                    value={payload.stepsText || ''}
                    onChange={(e) => handleChange('stepsText', e.target.value)}
                    rows={8}
                    placeholder="Step 1\nStep 2"
                  />
                </label>
              </div>
            )}
          </>
        )}

        {activeTab === 'meta' && (
          <>
            <div className="stack">
              <label>
                Area Path
                <input value={payload.area || ''} onChange={(e) => handleChange('area', e.target.value)} placeholder="e.g. Project\\Area" />
              </label>

              <label>
                Iteration Path
                <input value={payload.iteration || ''} onChange={(e) => handleChange('iteration', e.target.value)} placeholder="e.g. Project\\Sprint 1" />
              </label>
            </div>

            <div className="stack">
              <label>
                Parent ID (link to requirement)
                <input type="number" value={payload.parentId || ''} onChange={(e) => handleChange('parentId', Number(e.target.value) || undefined)} placeholder="Work item ID" />
              </label>

              <label>
                Type (read-only mirror)
                <input value={payload.type} disabled />
              </label>
            </div>
          </>
        )}

        <div className="form-actions cwi-span-all">
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Creating...' : 'Create Work Item'}
          </button>
        </div>
      </form>

      {error && <div className="alert alert-error">{error}</div>}
      {result?.id && (
        <div className="alert alert-success">
          Created Work Item #{result.id} {result.url && (<a href={result.url} target="_blank" rel="noreferrer">View in Azure DevOps</a>)}
        </div>
      )}
    </div>
  );
};

export default CreateWorkItemPage;
