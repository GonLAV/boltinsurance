import React, { useEffect, useMemo, useState } from 'react';
import './StepItem.css';
import { toast } from 'react-toastify';
import { Step } from '../testCase.types';
import { RichEditor } from './RichEditor';

type Props = {
  step: Step;
  index: number;
  onUpdate: (id: number, key: keyof Step, value: any) => void;
  onMoveUp: (idx: number) => void;
  onMoveDown: (idx: number) => void;
  onDuplicate: (idx: number) => void;
  onRemove: (idx: number) => void;
  onAttach: (file: File | null, stepId: number) => void;
};

const StepItem: React.FC<Props> = ({ step, index, onUpdate, onMoveUp, onMoveDown, onDuplicate, onRemove, onAttach }) => {
  const [imgError, setImgError] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);

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

  const attachmentUrl = attachment instanceof File ? objectUrl : attachment?.url;
  const attachmentName = attachment instanceof File ? attachment.name : attachment?.name;
  const attachmentType = attachment instanceof File ? attachment.type : attachment?.type;

  const category = useMemo(() => {
    if (!attachment) return 'none';
    const t = (attachmentType || '').toLowerCase();
    const name = attachmentName?.toLowerCase() || '';
    if (t.startsWith('image/')) return 'image';
    if (t === 'application/pdf' || name.endsWith('.pdf')) return 'pdf';
    if (t.includes('word') || name.endsWith('.doc') || name.endsWith('.docx')) return 'word';
    if (t.includes('sheet') || t.includes('excel') || name.endsWith('.xls') || name.endsWith('.xlsx')) return 'excel';
    if (t.includes('powerpoint') || name.endsWith('.ppt') || name.endsWith('.pptx')) return 'ppt';
    if (t.startsWith('text/') || name.endsWith('.txt')) return 'text';
    if (t.startsWith('video/')) return 'video';
    if (t.startsWith('audio/')) return 'audio';
    if (name.match(/\.(zip|rar|7z|tar|gz)$/)) return 'archive';
    return 'generic';
  }, [attachment, attachmentName, attachmentType]);

  const iconForCategory = (cat: string) => {
    switch (cat) {
      case 'image': return '🖼️';
      case 'pdf': return '📄';
      case 'word': return '📘';
      case 'excel': return '📊';
      case 'ppt': return '📈';
      case 'text': return '📝';
      case 'video': return '🎬';
      case 'audio': return '🎵';
      case 'archive': return '🗂️';
      default: return '📎';
    }
  };

  const handleDownload = () => {
    if (!attachment || !attachmentUrl) {
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

  const handleRemove = () => {
    onUpdate(step.id, 'attachment' as keyof Step, undefined);
    setImgError(false);
    setViewerOpen(false);
  };

  const handleView = () => {
    if (!attachment) return;
    if (category === 'generic' || category === 'archive') {
      handleDownload();
      return;
    }
    setViewerOpen(true);
  };

  const renderPreview = () => {
    if (!attachment) return null;

    if (category === 'image') {
      if (imgError) {
        return <div className="step-image-error">Preview unavailable. Use View or Download.</div>;
      }
      return (
        <img
          src={attachmentUrl || ''}
          alt={attachmentName}
          className="step-image-preview"
          onClick={handleView}
          onError={() => setImgError(true)}
        />
      );
    }

    const labels: Record<string, string> = {
      pdf: 'PDF Document',
      word: 'Word Document',
      excel: 'Excel Spreadsheet',
      ppt: 'PowerPoint',
      text: 'Text File',
      video: 'Video',
      audio: 'Audio',
      archive: 'Archive',
      generic: 'File Attached',
    };

    const label = labels[category] || 'File Attached';

    return (
      <div className="preview-icon" onClick={handleView}>
        <div className="preview-icon-category">{iconForCategory(category)}</div>
        <div className="preview-icon-label">{label}</div>
        <div className="preview-icon-name">{attachmentName}</div>
      </div>
    );
  };

  const renderViewer = () => {
    if (!viewerOpen || !attachment) return null;
    const close = () => setViewerOpen(false);
    const content = () => {
      if (category === 'image') {
        return <img src={attachmentUrl || ''} alt={attachmentName} className="step-viewer-img" onError={() => <div className="step-image-error">Could not load image</div>} />;
      }
      if (category === 'pdf') {
        return <iframe title="pdf" src={attachmentUrl || undefined} className="step-viewer-iframe" />;
      }
      if (category === 'text') {
        return <iframe title="text" src={attachmentUrl || undefined} className="step-viewer-iframe" />;
      }
      return (
        <div className="step-viewer-generic">
          <div className="step-viewer-generic-icon">{iconForCategory(category)}</div>
          <div className="step-viewer-generic-title">{attachmentName}</div>
          <div className="step-viewer-generic-desc">Preview not available. Download to view.</div>
        </div>
      );
    };

    return (
      <div className="step-viewer-overlay" onClick={close}>
        <div className="step-viewer-panel" onClick={(e) => e.stopPropagation()}>
          <div className="step-viewer-header">
            <div className="step-viewer-header-left">
              <span className="step-viewer-header-icon">{iconForCategory(category)}</span>
              <div>
                <div className="step-viewer-header-title">{attachmentName}</div>
                <div className="step-viewer-header-type">{attachmentType || 'Unknown type'}</div>
              </div>
            </div>
            <div className="step-viewer-header-actions">
              <button className="btn-secondary" onClick={handleDownload}>⬇️ Download</button>
              <button className="btn-cancel" onClick={close}>Close</button>
            </div>
          </div>
          <div className="step-viewer-body">{content()}</div>
        </div>
      </div>
    );
  };

  const actionEmpty = !step.action?.replace(/<[^>]*>/g, '').trim();

  return (
    <div className="step-item">
      <div className="step-row-header">
        <div className="step-header-left"><span className="drag-handle">⋮⋮</span> <span className="step-number">Step {index + 1}</span></div>
        <div className="step-actions">
          <button className="btn-step-action" onClick={() => onMoveUp(index)} aria-label="Move step up">⬆️</button>
          <button className="btn-step-action" onClick={() => onMoveDown(index)} aria-label="Move step down">⬇️</button>
          <button className="btn-step-action" onClick={() => onDuplicate(index)} aria-label="Duplicate step">📋</button>
          <button className="btn-step-action" onClick={() => onRemove(index)} aria-label="Delete step">🗑️</button>
        </div>
      </div>

      <div className="step-card-grid">
        <div className={`step-card ${actionEmpty ? 'step-card--invalid' : ''}`}>
          <div className="step-card-title">
            <span>Action</span>
            {actionEmpty && <span className="step-card-prompt">Required</span>}
          </div>
          <RichEditor
            initialHtml={step.action || ''}
            onChange={(html) => onUpdate(step.id, 'action', html)}
            placeholder="Describe the action..."
            variant="embedded"
          />
        </div>

        <div className="step-card">
          <div className="step-card-title">
            <span>Expected Result</span>
          </div>
          <RichEditor
            initialHtml={step.expectedResult || ''}
            onChange={(html) => onUpdate(step.id, 'expectedResult', html)}
            placeholder="Expected result..."
            variant="embedded"
          />
        </div>
      </div>

      <div className="step-attachment-wrapper">
        <label className="step-attachment-label">Attachment</label>
        <div className="step-attachment-row">
          <label className="btn-attachment">
            <span>📎</span>
            <span className="attach-label">Add File</span>
            <input type="file" className="file-input-hidden" onChange={(e) => onAttach(e.target.files?.[0] ?? null, step.id)} />
          </label>
          {attachment && (
            <div className="step-attachment-actions">
              <button className="btn-secondary" onClick={handleView}>👁️ Preview</button>
              <button className="btn-secondary" onClick={handleDownload}>⬇️ Download</button>
              <button className="btn-cancel" onClick={handleRemove}>✕ Remove</button>
            </div>
          )}
        </div>
        {attachment && (
          <div className="attachment-preview show">
            <div className="preview-content">
              {attachmentUrl?.startsWith('blob:') && (
                <div className="attachment-uploading">Uploading…</div>
              )}
              {renderPreview()}
            </div>
          </div>
        )}
      </div>

      {renderViewer()}
    </div>
  );
};

export default StepItem;
