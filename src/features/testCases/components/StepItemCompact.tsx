import React, { useEffect, useState } from 'react';
import './StepItemCompact.css';
import './StepItem.css';
import { toast } from 'react-toastify';
import { Step } from '../testCase.types';
import { RichEditor } from './RichEditor';

type Props = {
  step: Step;
  index: number;
  expanded?: boolean;
  onToggleExpanded?: () => void;
  onUpdate: (id: number, key: keyof Step, value: any) => void;
  onMoveUp: (idx: number) => void;
  onMoveDown: (idx: number) => void;
  onDuplicate: (idx: number) => void;
  onRemove: (idx: number) => void;
  onAttach: (file: File | null, stepId: number) => void;
  onOpenFullScreen?: () => void;
};

const StepItemCompact: React.FC<Props> = ({ step, index, expanded: expandedProp, onToggleExpanded, onUpdate, onMoveUp, onMoveDown, onDuplicate, onRemove, onAttach, onOpenFullScreen }) => {
  const [expandedInternal, setExpandedInternal] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);

  const expanded = expandedProp ?? expandedInternal;
  const toggleExpanded = () => {
    if (onToggleExpanded) {
      onToggleExpanded();
      return;
    }
    setExpandedInternal((v) => !v);
  };

  const attachment = step.attachment;
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (attachment instanceof File) {
      const url = URL.createObjectURL(attachment);
      setObjectUrl(url);
      return () => {
        URL.revokeObjectURL(url);
        setObjectUrl(null);
      };
    }
    setObjectUrl(null);
    return undefined;
  }, [attachment]);

  const attachmentUrl = attachment instanceof File ? objectUrl : (attachment as any)?.url;
  const attachmentName = attachment instanceof File ? attachment.name : (attachment as any)?.name || 'File';
  const attachmentType = attachment instanceof File ? attachment.type : (attachment as any)?.type;
  const hasAttachment = !!attachment;

  const handleAttachmentChange = (file: File | null) => {
    onAttach(file, step.id);
    // Reset file input so user can select same file again
    const fileInput = document.querySelector(`input[data-step-id="${step.id}"]`) as HTMLInputElement | null;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const handleDownload = () => {
    if (!attachmentUrl) {
      toast.error('Attachment is not available to download');
      return;
    }
    const a = document.createElement('a');
    a.href = attachmentUrl;
    a.download = attachmentName || 'attachment';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success('Download started');
  };
  
  // Check if step has only attachment, no text
  const plainAction = step.action?.replace(/<[^>]*>/g, '').trim() || '';
  const plainExpected = step.expectedResult?.replace(/<[^>]*>/g, '').trim() || '';
  const actionEmpty = plainAction.length === 0;
  const hasTextContent = plainAction.length > 0 && plainExpected.length > 0;
  const hasOnlyAttachment = hasAttachment && !hasTextContent;

  // Truncate text for single-line display
  const truncateText = (text: string, maxLen = 60) => {
    const plain = text.replace(/<[^>]*>/g, '').trim();
    return plain.length > maxLen ? plain.substring(0, maxLen) + '…' : plain;
  };

  const handleHeaderClick = () => {
    toggleExpanded();
  };

  return (
    <div className="step-compact-root">
      {/* Single-Line Compact View */}
      <div 
        onClick={handleHeaderClick}
        className={`compact-header ${expanded ? 'expanded' : ''}`}
      >
        {/* Drag Handle */}
        <span className="drag-handle" title="Drag to reorder" onClick={(e) => e.stopPropagation()}>
          ☰
        </span>

        {/* Step Number */}
        <button
          type="button"
          className="step-number-compact"
          onClick={(e) => {
            e.stopPropagation();
            toggleExpanded();
          }}
          title={expanded ? 'Collapse inline editor' : 'Expand inline editor'}
        >
          {expanded ? '▼' : '▶'} Step {index + 1}
        </button>

        {/* Action Text */}
        <span className="compact-text"><strong>Action:</strong> {truncateText(step.action, 40)}</span>

        {/* Expected Text */}
        <span className="compact-text-muted"><strong>→</strong> {truncateText(step.expectedResult, 40)}</span>

        {/* Attachment Indicator */}
        {hasAttachment && <span className="compact-attachment-icon">📎</span>}
        
        {/* Warning: Attachment-only (no text) */}
        {hasOnlyAttachment && (
          <span className="compact-warning" title="⚠️ This step has only an attachment - add text to Action and Expected Result">⚠️ Missing text</span>
        )}

        {/* Compact Action Buttons */}
        <div className="compact-actions" onClick={(e) => e.stopPropagation()}>
          {onOpenFullScreen && (
            <button className="btn-compact" onClick={onOpenFullScreen} title="Open full screen">⛶</button>
          )}
          <button className="btn-compact" onClick={() => onMoveUp(index)} title="Move up">⬆️</button>
          <button className="btn-compact" onClick={() => onMoveDown(index)} title="Move down">⬇️</button>
          <button className="btn-compact" onClick={() => onDuplicate(index)} title="Duplicate">📋</button>
          <button className="btn-compact delete" onClick={() => onRemove(index)} title="Delete">🗑️</button>
        </div>
      </div>

      {/* Expanded Details Panel */}
      {expanded && (
        <div className="expanded-panel">
          {/* Warning banner if attachment-only */}
          {hasOnlyAttachment && (
            <div className="warn-banner">⚠️ <strong>Attachment only:</strong> Add text to both "Action" and "Expected Result" fields before saving. Attachments alone won't persist in Azure DevOps.</div>
          )}
          
          {/* Two-card row: Action (left) + Expected Result (right) */}
          <div className="step-card-grid">
            <div className={`step-card ${actionEmpty ? 'step-card--invalid' : ''}`}>
              <div className="step-card-title">
                <span>Action</span>
                {actionEmpty && <span className="step-card-prompt">Required</span>}
              </div>
              <RichEditor
                variant="embedded"
                initialHtml={step.action || ''}
                onChange={(html) => onUpdate(step.id, 'action', html)}
                placeholder="Describe the action..."
              />
            </div>

            <div className="step-card">
              <div className="step-card-title">
                <span>Expected Result</span>
              </div>
              <RichEditor
                variant="embedded"
                initialHtml={step.expectedResult || ''}
                onChange={(html) => onUpdate(step.id, 'expectedResult', html)}
                placeholder="Expected result..."
              />
            </div>
          </div>

          {/* Attachment Field */}
          <div>
            <label className="field-label">Attachment</label>
            <div className="attachment-row">
              <label className="attachment-add">
                📎 Add File
                <input type="file" data-step-id={step.id} className="file-input-hidden" onChange={(e) => handleAttachmentChange(e.target.files?.[0] ?? null)} />
              </label>
              {hasAttachment && (
                <>
                  <span className="attachment-name">{attachmentName}</span>
                  <button className="attachment-btn view" onClick={() => setViewerOpen(true)}>👁️ View</button>
                  <button className="attachment-btn download" onClick={handleDownload}>⬇️ Download</button>
                  <button className="attachment-btn remove" onClick={() => onUpdate(step.id, 'attachment', undefined)}>✕ Remove</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* File Viewer Modal */}
      {viewerOpen && attachment && (
        <div className="modal-overlay" onClick={() => setViewerOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{attachmentName}</h3>
              <button className="modal-close" onClick={() => setViewerOpen(false)}>✕</button>
            </div>

            {attachmentUrl?.startsWith('blob:') ? (
              <div className="modal-loading">File is uploading... Please wait.</div>
            ) : attachmentType?.startsWith('image/') ? (
              <img src={attachmentUrl || ''} alt={attachmentName} className="modal-img" />
            ) : attachmentType === 'application/pdf' || attachmentName?.endsWith('.pdf') ? (
              <iframe title="pdf" src={attachmentUrl || undefined} className="modal-iframe" />
            ) : attachmentType?.startsWith('text/') || attachmentName?.endsWith('.txt') ? (
              <iframe title="text" src={attachmentUrl || undefined} className="modal-iframe" />
            ) : (
              <div className="modal-generic">
                <div className="modal-generic-icon">📎</div>
                <div className="modal-generic-title">{attachmentName}</div>
                <div className="modal-generic-type">{attachmentType || 'Unknown type'}</div>
                <button className="modal-download-btn" onClick={handleDownload}>⬇️ Download File</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StepItemCompact;
