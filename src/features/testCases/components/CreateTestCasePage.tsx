import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import StepsEditor from './StepsEditor';
import TemplatesModal from './TemplatesModal';
import { Step } from '../testCase.types';
import { testCaseApi } from '../testCase.api';
import './EditTestCasePage.css';

interface LocationState {
  userStoryId?: number;
  userStoryTitle?: string;
}

const CreateTestCasePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userStoryId = undefined, userStoryTitle = '' } = (location.state as LocationState) || {};

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [stateField, setStateField] = useState('Design');
  const [priority, setPriority] = useState('2');
  const [area, setArea] = useState('Epos');
  const [iteration, setIteration] = useState('Epos');
  const [tags, setTags] = useState('');
  const [reason, setReason] = useState('New');
  const [steps, setSteps] = useState<Step[]>([]);
  const [sharedParameterName, setSharedParameterName] = useState('');
  const [openTemplatesModal, setOpenTemplatesModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setDescriptionExpanded(false);
    setStateField('Design');
    setPriority('2');
    setArea('Epos');
    setIteration('Epos');
    setTags('');
    setReason('New');
    setSteps([]);
    setSharedParameterName('');
  };

  const handleCancel = () => {
    navigate('/app/team-tests');
  };

  const handleSave = async () => {
    if (saving) return; // prevent double-submits
    try {
      if (!title.trim()) {
        toast.error('Title is required');
        return;
      }

      setSaving(true);
      const filteredSteps = steps.filter((s) => (s.action?.trim() || s.expectedResult?.trim()));

      // STEP 1: Upload all attachments first and collect IDs
      const attachmentIds: string[] = [];
      const nextSteps = [...filteredSteps];
      for (let i = 0; i < nextSteps.length; i++) {
        const step = nextSteps[i];
        if (step.attachment && step.attachment instanceof File) {
          try {
            const stepId = i + 2; // Azure DevOps step IDs usually start at 2
            const uploadResp = await testCaseApi.uploadAttachment(step.attachment, undefined, stepId);
            const attachmentUrl = uploadResp?.data?.data?.attachmentUrl;
            const attachmentId = uploadResp?.data?.data?.attachmentId;
            if (attachmentUrl || attachmentId) {
              // Prefer attachmentUrl (includes fileName + api-version) for reliable relation linking.
              const attachmentRef = attachmentUrl || attachmentId;
              attachmentIds.push(attachmentRef);
              
              // Update step with attachment metadata for the create payload
              nextSteps[i] = {
                ...step,
                attachment: {
                  url: attachmentRef,
                  name: step.attachment.name,
                  type: step.attachment.type
                }
              };
              
              toast.info(`📎 Uploaded: ${step.attachment.name}`);
            }
          } catch (err: any) {
            console.error('Attachment upload failed', err);
            // Show the detailed error message from backend if available
            const errorMsg = err?.response?.data?.message || err?.message || 'Unknown error';
            toast.error(`Attachment failed: ${errorMsg}`);
            // Don't continue if attachment upload fails - user needs to fix auth issue
            return;
          }
        }
      }

      // STEP 2: Create test case with attachment IDs
      const payload = {
        title,
        description,
        steps: nextSteps.map((s) => ({
          action: s.action || '',
          expectedResult: s.expectedResult || '',
          attachment: s.attachment
        } as Step)),
        tags,
        priority: parseInt(priority, 10) || 1,
        state: stateField,
        area,
        iteration,
        userStoryId: userStoryId || null,
        reason,
        sharedParameterName: sharedParameterName || null,
        attachmentIds: attachmentIds.length > 0 ? attachmentIds : undefined,
      };

      const resp = await testCaseApi.createTestCase(payload);
      if (resp?.data?.success) {
        toast.success('✅ Test case created with attachments');
        resetForm();
        navigate('/app/team-tests');
      } else {
        toast.error(resp?.data?.message || 'Failed to save test case');
      }
    } catch (err: any) {
      console.error('Save failed', err);
      toast.error(err?.response?.data?.message || 'Failed to save test case');
    } finally {
      setSaving(false);
    }
  };

  const extractTestCase = () => {
    toast.info('Extracting sections into steps…');
  };

  return (
    <div className="page-card tc-shell tc-wide tc-density-compact">
      <div className="page-header-actions etc-header-row">
        <div className="etc-header-left">
          <h2 id="tcHeader">Test Case</h2>
          <div className="header-title-field">
            <label className="form-label" htmlFor="testTitle">Title *</label>
            <input
              id="testTitle"
              className="form-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., TC 1.1 – Login"
              aria-label="Test Case Title"
              aria-describedby="tcHeader"
              required
            />
          </div>
        </div>
        <div className="header-actions-right">
          <button className="btn-primary" onClick={() => setOpenTemplatesModal(true)}>📋 Templates</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>💾 {saving ? 'Saving…' : 'Save Test Case'}</button>
        </div>
      </div>

      <div className="tc-grid">
        <div className="form-card meta-card">

          {userStoryTitle && (
            <div className="tc-banner success">
              <strong>✓ Linked to User Story:</strong> {userStoryTitle} (ID: {userStoryId})
            </div>
          )}

          {description && (
            <div className="tc-banner info">
              <div>
                <strong>Description:</strong> {description.substring(0, 80)}{description.length > 80 ? '…' : ''}
              </div>
            </div>
          )}

          <button className="link-button" onClick={() => setDescriptionExpanded(!descriptionExpanded)}>
            {descriptionExpanded ? '▼ Hide details' : '▶ More options'}
          </button>

          {descriptionExpanded && (
            <div className="tc-field">
              <label className="form-label" htmlFor="testDescription">Description</label>
              <textarea id="testDescription" className="form-input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detailed description..." />
            </div>
          )}

          <div className="inputsGrid">
            <div className="form-group">
              <label className="form-label" htmlFor="state">State</label>
              <select id="state" className="form-input" value={stateField} onChange={(e) => setStateField(e.target.value)}>
                <option value="Design">Design</option>
                <option value="Ready">Ready</option>
                <option value="Closed">Closed</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="priority">Priority</label>
              <select id="priority" className="form-input" value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="1">1-High</option>
                <option value="2">2-High</option>
                <option value="3">3-Med</option>
                <option value="4">4-Low</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="area">Area</label>
              <input id="area" className="form-input" value={area} onChange={(e) => setArea(e.target.value)} placeholder="Epos" />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="iteration">Iteration</label>
              <input id="iteration" className="form-input" value={iteration} onChange={(e) => setIteration(e.target.value)} placeholder="Epos" />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="tags">Tags</label>
              <input id="tags" className="form-input" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="tag1; tag2" />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="reason">Reason</label>
              <select id="reason" className="form-input" value={reason} onChange={(e) => setReason(e.target.value)} aria-label="Reason">
                <option value="New">New</option>
                <option value="Regression">Regression</option>
                <option value="Investigation">Investigation</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="steps-wrapper">
        <div className="tc-section steps-section steps-tall">
          <div className="tc-section-header">
            <div>
              <h4>Steps</h4>
              <p className="muted">Rich step editor with drag, duplicate, attach.</p>
            </div>
            <div className="tc-section-actions">
              <button className="btn-secondary ghost" onClick={extractTestCase}>🔗 Extract</button>
              <button className="btn-secondary danger" onClick={handleCancel}>✕ Cancel</button>
            </div>
          </div>
          <StepsEditor steps={steps} onChange={setSteps} />
        </div>
      </div>

      {openTemplatesModal && (
        <TemplatesModal
          open={openTemplatesModal}
          onClose={() => setOpenTemplatesModal(false)}
          onSelect={(template) => {
            setTitle(template.name);
            setDescription(template.description);
            setSteps(template.steps);
            if (template.sharedParameterName) {
              setSharedParameterName(template.sharedParameterName);
            }
          }}
        />
      )}
    </div>
  );
};

export default CreateTestCasePage;
