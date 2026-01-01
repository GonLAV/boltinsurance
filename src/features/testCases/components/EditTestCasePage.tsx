import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { useParams, useNavigate } from 'react-router-dom';
import StepsEditor from './StepsEditor';
import TemplatesModal from './TemplatesModal';
import { Step } from '../testCase.types';
import { testCaseApi } from '../testCase.api';
import './EditTestCasePage.css';

type TestCaseAttachment = {
  id: number | string;
  comment?: string;
  fileName?: string;
  downloadUrl?: string;
  url?: string;
};

type LinkedStory = {
  id: number;
  title: string;
};

type LoadedTestCase = {
  id: number;
  title?: string;
  description?: string;
  state?: string;
  priority?: number | string;
  area?: string;
  iteration?: string;
  tags?: string;
  steps?: Step[];
  attachments?: TestCaseAttachment[];
  createdBy?: string;
  createdDate?: string;
  linkedStory?: LinkedStory;
};

const EditTestCasePage: React.FC = () => {
  const { testCaseId } = useParams<{ testCaseId?: string }>();
  const navigate = useNavigate();

  const [testCase, setTestCase] = useState<LoadedTestCase | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [stateField, setStateField] = useState('Design');
  const [priority, setPriority] = useState('2');
  const [area, setArea] = useState('');
  const [iteration, setIteration] = useState('');
  const [tags, setTags] = useState('');
  const [steps, setSteps] = useState<Step[]>([]);
  const [linkedStory, setLinkedStory] = useState<LinkedStory | null>(null);
  const [openTemplatesModal, setOpenTemplatesModal] = useState(false);

  useEffect(() => {
    if (!testCaseId) {
      setLoading(false);
      return;
    }

    const fetchTestCase = async () => {
      setLoading(true);
      try {
        const resp = await testCaseApi.getTestCaseById(Number(testCaseId));
        const fetched = resp?.data?.data?.testCase;
        if (!fetched) {
          toast.error('Test case not found');
          navigate('/app/team-tests');
          return;
        }

        setTestCase(fetched);
        setTitle(fetched.title || '');
        setDescription(fetched.description || '');
        setStateField(fetched.state || 'Design');
        setPriority(fetched.priority ? String(fetched.priority) : '2');
        setArea(fetched.area || '');
        setIteration(fetched.iteration || '');
        setTags(fetched.tags || '');
        setLinkedStory(fetched.linkedStory || null);
        setSteps(
          (fetched.steps ?? []).map((step: Step, index: number) => ({
            id: (step as any).id ?? index,
            action: step.action || '',
            expectedResult: step.expectedResult || '',
            attachment: (step as any).attachment,
          }))
        );
      } catch (err) {
        console.error('Error fetching test case:', err);
        toast.error((err as any)?.response?.data?.message || 'Failed to load test case');
        navigate('/app/team-tests');
      } finally {
        setLoading(false);
      }
    };

    fetchTestCase();
  }, [testCaseId, navigate]);

  const handleSave = async () => {
    if (saving) return;
    if (!testCaseId || !title.trim()) {
      toast.error('Title is required');
      return;
    }

    try {
      setSaving(true);
      const workItemId = parseInt(testCaseId, 10);
      const nextSteps: Step[] = [...steps];

      for (let i = 0; i < nextSteps.length; i += 1) {
        const step = nextSteps[i];
        if (step.attachment && step.attachment instanceof File) {
          try {
            const stepId = i + 2;
            const uploadResp = await testCaseApi.uploadAttachment(step.attachment, workItemId, stepId);
            const attachmentId = uploadResp?.data?.data?.attachmentId;
            const downloadUrl = attachmentId
              ? `/api/attachments/${encodeURIComponent(attachmentId)}/download?download=true`
              : undefined;

            nextSteps[i] = {
              ...step,
              attachment: {
                url: downloadUrl || uploadResp?.data?.data?.attachmentUrl || '',
                name: step.attachment.name,
                type: step.attachment.type,
              },
            };

            toast.info(`📎 Uploaded & linked: ${step.attachment.name}`);
          } catch (err) {
            console.error('Attachment upload failed', err);
            const errorMsg = (err as any)?.response?.data?.message || (err as any)?.message || 'Unknown error';
            toast.error(`Attachment failed: ${errorMsg}`);
            return;
          }
        }
      }

      setSteps(nextSteps);

      const payload = {
        title,
        description,
        steps: nextSteps.map((s) => ({
          action: s.action,
          expectedResult: s.expectedResult,
          attachment: s.attachment,
        } as Step)),
        state: stateField || 'Design',
        priority: parseInt(priority, 10) || 1,
        area,
        iteration,
        tags,
      };

      const resp = await testCaseApi.updateTestCase(workItemId, payload);
      if (resp?.data?.success) {
        toast.success('✅ Test case updated with attachments');
        navigate('/app/team-tests');
      } else {
        toast.error(resp?.data?.message || 'Failed to update test case');
      }
    } catch (err) {
      console.error('Error saving test case:', err);
      toast.error((err as any)?.response?.data?.message || 'Failed to save test case');
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = async () => {
    try {
      if (!testCaseId) return;
      const resp = await testCaseApi.cloneTestCase(parseInt(testCaseId, 10));
      if (resp?.data?.success) {
        const newId = resp?.data?.data?.id;
        toast.success(`✅ Copied test case #${testCaseId} → #${newId}`);
        if (newId) {
          navigate(`/app/edit-test/${newId}`);
        }
      } else {
        toast.error(resp?.data?.message || 'Failed to copy test case');
      }
    } catch (err: any) {
      console.error('Copy failed', err);
      toast.error(err?.response?.data?.message || 'Failed to copy test case');
    }
  };

  if (loading) {
    return (
      <div className="etc-state-text">
        Loading test case...
      </div>
    );
  }

  if (!testCase) {
    return (
      <div className="etc-state-text">
        Test case not found
      </div>
    );
  }

  const generalAttachments = (testCase.attachments || []).filter((a) => !a.comment?.includes('[TestStep='));

  return (
    <div className="page-card tc-shell tc-wide tc-density-compact">
      <div className="page-header-actions">
        <div>
          <h2>Edit Test Case</h2>
          <p className="muted">ID: #{testCase.id}</p>
        </div>
        <div className="header-actions-right">
          <button className="btn-secondary" onClick={handleCopy}>
            📄 Copy
          </button>
          <button className="btn-primary" onClick={() => setOpenTemplatesModal(true)}>
            📋 Templates
          </button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>

      {linkedStory && (
        <div className="alert alert-success etc-linked-alert">
          🔗 Linked to User Story: {linkedStory.title} (#{linkedStory.id})
        </div>
      )}

      <div className="form-card meta-card etc-meta-compact">
        <div className="titleRow">
          <div>
            <label className="form-label" htmlFor="editTitle">
              Title *
            </label>
            <input
              id="editTitle"
              className="form-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., TC 1.1 – Login"
            />
            <p className="titleHelp">Structured steps, clean visuals, attachments ready for ADO/TFS.</p>
          </div>
        </div>

        {description && (
          <div className="tc-banner info etc-mb-12">
            <div>
              <button className="btn-secondary" onClick={handleCopy}>
                📄 Copy
              </button>
              <strong>Description:</strong> {description.substring(0, 80)}{description.length > 80 ? '…' : ''}
            </div>
          </div>
        )}

        <button className="link-button" onClick={() => setDescriptionExpanded((prev) => !prev)}>
          {descriptionExpanded ? '▼ Hide details' : '▶ More options'}
        </button>

        {descriptionExpanded && (
          <div className="etc-mb-12">
            <label className="form-label" htmlFor="editDescription">
              Description
            </label>
            <textarea
              id="editDescription"
              className="form-input etc-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed description..."
            />
          </div>
        )}

        <div className="inputsGrid">
          <div className="form-group">
            <label className="form-label" htmlFor="editState">
              State
            </label>
            <select
              id="editState"
              className="form-input"
              value={stateField}
              onChange={(e) => setStateField(e.target.value)}
            >
              <option value="Design">Design</option>
              <option value="Ready">Ready</option>
              <option value="Active">Active</option>
              <option value="Closed">Closed</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="editPriority">
              Priority
            </label>
            <select
              id="editPriority"
              className="form-input"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option value="1">1-High</option>
              <option value="2">2-High</option>
              <option value="3">3-Med</option>
              <option value="4">4-Low</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="editArea">
              Area
            </label>
            <input
              id="editArea"
              className="form-input"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              placeholder="Epos"
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="editIteration">
              Iteration
            </label>
            <input
              id="editIteration"
              className="form-input"
              value={iteration}
              onChange={(e) => setIteration(e.target.value)}
              placeholder="Epos"
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="editTags">
              Tags
            </label>
            <input
              id="editTags"
              className="form-input"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="tag1, tag2"
            />
          </div>
        </div>

        {generalAttachments.length > 0 && (
          <div className="etc-mb-12">
            <label className="form-label">General Attachments</label>
            <div className="muted">
              {generalAttachments.map((a) => (
                <div key={a.id} className="etc-attachment-item">
                  <a href={a.downloadUrl || a.url} target="_blank" rel="noreferrer">
                    📎 {a.fileName || a.id}
                  </a>
                  {a.comment ? (
                    <span className="etc-attachment-comment">
                      {' — '}
                      {a.comment.replace(/\[TestStep=\d+\]:?\s*/, '').trim()}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="steps-wrapper">
        <div className="tc-section steps-section">
          <div className="tc-section-header etc-steps-header">
            <div>
              <h3 className="card-title">Steps</h3>
              <p className="muted">Rich step editor with drag, duplicate, attach.</p>
            </div>
          </div>
          <StepsEditor steps={steps} onChange={setSteps} />
        </div>

        <div className="form-actions etc-mt-16">
          <button className="btn-secondary" onClick={() => navigate('/app/team-tests')} disabled={saving}>
            Cancel
          </button>
        </div>

        <div className="muted etc-footer-meta">
          Created by: {testCase.createdBy || 'Unknown'} ·{' '}
          {testCase.createdDate ? new Date(testCase.createdDate).toLocaleString() : 'Unknown'}
        </div>
      </div>

      {openTemplatesModal && (
        <TemplatesModal
          open={openTemplatesModal}
          onClose={() => setOpenTemplatesModal(false)}
          onSelect={(template: { name: string; description: string; steps: Step[] }) => {
            setTitle(template.name);
            setDescription(template.description);
            setSteps(
              template.steps.map((step: Step & { id?: number | string }, index: number) => ({
                ...step,
                id: step.id ?? index,
              }))
            );
            setDescriptionExpanded(true);
          }}
        />
      )}
    </div>
  );
};

export default EditTestCasePage;
