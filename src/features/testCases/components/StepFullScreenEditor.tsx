import React, { useEffect, useMemo } from 'react';
import { Step } from '../testCase.types';
import { RichEditor } from './RichEditor';
import './StepItem.css';

type Props = {
  open: boolean;
  step: Step | null;
  onUpdate: (id: number, key: keyof Step, value: any) => void;
  onClose: () => void;
};

const createStars = (container: HTMLElement, starCount = 100) => {
  if (container.children.length > 0) return;
  for (let i = 0; i < starCount; i++) {
    const star = document.createElement('div');
    star.className = 'star';
    star.style.left = Math.random() * 100 + '%';
    star.style.top = Math.random() * 100 + '%';
    star.style.width = Math.random() * 3 + 1 + 'px';
    star.style.height = star.style.width;
    star.style.animationDelay = Math.random() * 3 + 's';
    container.appendChild(star);
  }
};

const StepFullScreenEditor: React.FC<Props> = ({ open, step, onUpdate, onClose }) => {
  useEffect(() => {
    if (!open) return;
    const starsContainer = document.getElementById('steps-stars');
    if (starsContainer) createStars(starsContainer, 100);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const title = useMemo(() => 'BOLTEST toolbar', []);
  const subtitle = useMemo(() => 'Azure-styled cosmic toolbar', []);

  if (!open || !step) return null;

  const stepId = step.id;

  return (
    <div className="steps-screen-overlay" role="dialog" aria-modal="true">
      <div className="cosmic-container steps-screen" onClick={onClose}>
        <div className="stars" id="steps-stars"></div>
        <div className="cosmic-orb orb-1"></div>
        <div className="cosmic-orb orb-2"></div>

        <div className="content-wrapper" onClick={(e) => e.stopPropagation()}>
          <div className="test-section steps-screen-body">
            <div className="section-header steps-screen-header">
              <div className="header-content">
                <div className="toolbar-title">{title}</div>
                <div className="toolbar-subtitle">{subtitle}</div>
              </div>
              <button className="steps-screen-close" type="button" onClick={onClose} aria-label="Close">
                ✕
              </button>
            </div>

            <div className="step-card-grid">
              <div className="step-card">
                <div className="step-card-title">
                  <span>Action</span>
                </div>
                <RichEditor
                  variant="embedded"
                  initialHtml={step.action ?? ''}
                  onChange={(html) => onUpdate(stepId, 'action', html)}
                  placeholder="Enter action steps..."
                />
              </div>

              <div className="step-card">
                <div className="step-card-title">
                  <span>Expected Result</span>
                </div>
                <RichEditor
                  variant="embedded"
                  initialHtml={step.expectedResult ?? ''}
                  onChange={(html) => onUpdate(stepId, 'expectedResult', html)}
                  placeholder="Expected result..."
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StepFullScreenEditor;
