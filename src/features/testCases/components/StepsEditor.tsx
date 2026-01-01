import React, { useEffect, useRef, useState } from 'react';
import './StepsEditor.css';
import { Step } from '../testCase.types';
import StepItemCompact from './StepItemCompact';
import Toolbar from './Toolbar';
import RawEditor from './RawEditor';
import StepFullScreenEditor from './StepFullScreenEditor';

type Props = {
  steps: Step[];
  onChange: (s: Step[]) => void;
};

const StepsEditor: React.FC<Props> = ({ steps, onChange }) => {
  const [mode, setMode] = useState<'visual' | 'raw'>('visual');
  const [toolbarState, setToolbarState] = useState<{ x: number; y: number; visible: boolean }>({ x: 0, y: 0, visible: false });
  const [currentEditable, setCurrentEditable] = useState<HTMLElement | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [fullScreenStepId, setFullScreenStepId] = useState<number | null>(null);
  const [expandedStepId, setExpandedStepId] = useState<number | null>(null);
  const inlineToolbarRef = useRef<HTMLDivElement | null>(null);

  const toPlain = (html: string) => {
    const tmp = document.createElement('div');
    tmp.innerHTML = html || '';
    return tmp.textContent || '';
  };

  const handleDragStart = (e: React.DragEvent, idx: number) => {
    setDraggedIndex(idx);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, dropIdx: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIdx) {
      setDraggedIndex(null);
      return;
    }
    const newSteps = [...steps];
    const draggedStep = newSteps[draggedIndex];
    newSteps.splice(draggedIndex, 1);
    newSteps.splice(dropIdx, 0, draggedStep);
    onChange(newSteps);
    setDraggedIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  useEffect(() => { /* noop */ }, [steps]);

  useEffect(() => {
    const handleSelection = () => {
      const sel = window.getSelection();
      if (!sel || !sel.rangeCount) {
        setToolbarState((s) => ({ ...s, visible: false }));
        setCurrentEditable(null);
        return;
      }

      const node = sel.anchorNode instanceof Element ? sel.anchorNode : sel.anchorNode?.parentElement;
      const editable = node?.closest?.('.step-rich') as HTMLElement | null;
      if (!editable || mode !== 'visual') {
        setToolbarState((s) => ({ ...s, visible: false }));
        setCurrentEditable(null);
        return;
      }

      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setToolbarState({
        x: rect.left,
        y: rect.top - 42,
        visible: true,
      });
      setCurrentEditable(editable);
    };

    document.addEventListener('selectionchange', handleSelection);
    return () => document.removeEventListener('selectionchange', handleSelection);
  }, [mode]);

  // Keep dynamic positioning out of JSX inline styles
  useEffect(() => {
    const el = inlineToolbarRef.current;
    if (!el) return;
    el.style.left = `${toolbarState.x}px`;
    el.style.top = `${toolbarState.y}px`;
    el.style.display = toolbarState.visible ? 'flex' : 'none';
  }, [toolbarState.x, toolbarState.y, toolbarState.visible]);

  const addStep = (action = '', expected = '') => onChange([...steps, { id: Date.now(), action, expectedResult: expected }]);
  const removeStepByIndex = (idx: number) => onChange(steps.filter((_, i) => i !== idx));
  const updateStep = (id: number, key: keyof Step, value: any) => {
    onChange(steps.map(s => s.id === id ? { ...s, [key]: value } : s));
  };
  const moveStepUp = (idx: number) => { if (idx <= 0) return; const copy = [...steps]; [copy[idx - 1], copy[idx]] = [copy[idx], copy[idx - 1]]; onChange(copy); };
  const moveStepDown = (idx: number) => { if (idx >= steps.length - 1) return; const copy = [...steps]; [copy[idx], copy[idx + 1]] = [copy[idx + 1], copy[idx]]; onChange(copy); };
  const duplicateStep = (idx: number) => { const copy = [...steps]; const toDup = copy[idx]; if (!toDup) return; const dup = { ...toDup, id: Date.now() }; copy.splice(idx + 1, 0, dup); onChange(copy); };

  const handleAttach = (file: File | null, stepId: number) => {
    // Store File object directly - upload happens when test case is created
    if (!file) {
      onChange(steps.map(s => s.id === stepId ? { ...s, attachment: undefined } : s));
      return;
    }
    onChange(steps.map(s => s.id === stepId ? { ...s, attachment: file } : s));
  };

  const extract = () => {
    if (steps.length === 0) { window.alert('No steps to extract'); return; }
    let raw = `TITLE Untitled\nDESCRIPTION \n\n`;
    steps.forEach((s, i) => {
      raw += `Step ${i + 1}: ${toPlain(s.action)}\n  Expected: ${toPlain(s.expectedResult)}\n\n`;
    });
    if (navigator.clipboard) { navigator.clipboard.writeText(raw); window.alert('Extracted to clipboard'); } else { window.alert(raw); }
  };

  const persistCurrentEditable = () => {
    if (!currentEditable) return;
    const stepId = Number(currentEditable.dataset.stepId);
    const field = currentEditable.dataset.field as keyof Step | undefined;
    if (!stepId || !field) return;
    onChange(steps.map((s) => (s.id === stepId ? { ...s, [field]: currentEditable.innerHTML } : s)));
  };

  const applyFormat = (cmd: string, value?: string) => {
    document.execCommand(cmd, false, value);
    persistCurrentEditable();
  };

  return (
    <div>
      <Toolbar onAdd={() => addStep()} mode={mode} setMode={setMode} onExtract={extract} />
      <div
        id="inlineToolbar"
        className="inline-toolbar"
        ref={inlineToolbarRef}
      >
        <button aria-label="Bold" onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat('bold')}>B</button>
        <button aria-label="Italic" onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat('italic')}>I</button>
        <button aria-label="Color blue" className="color-blue" onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat('foreColor', '#2563eb')}>●</button>
        <button aria-label="Color green" className="color-green" onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat('foreColor', '#059669')}>●</button>
        <button aria-label="Color orange" className="color-orange" onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat('foreColor', '#f97316')}>●</button>
      </div>

      {mode === 'visual' ? (
        <div className="steps-list">
          {steps.map((s, idx) => (
            <div
              key={s.id}
              draggable
              onDragStart={(e) => handleDragStart(e as any, idx)}
              onDragOver={(e) => handleDragOver(e as any)}
              onDrop={(e) => handleDrop(e as any, idx)}
              onDragEnd={handleDragEnd}
              className={`step-draggable ${draggedIndex === idx ? 'dragging' : ''}`}
            >
              <StepItemCompact
                step={s}
                index={idx}
                expanded={expandedStepId === s.id}
                onToggleExpanded={() => setExpandedStepId((cur) => (cur === s.id ? null : s.id))}
                onUpdate={updateStep}
                onMoveUp={moveStepUp}
                onMoveDown={moveStepDown}
                onDuplicate={duplicateStep}
                onRemove={removeStepByIndex}
                onAttach={handleAttach}
                onOpenFullScreen={() => setFullScreenStepId(s.id)}
              />
            </div>
          ))}
        </div>
      ) : (
        <RawEditor steps={steps} onChange={onChange} />
      )}

      <StepFullScreenEditor
        open={fullScreenStepId !== null}
        step={fullScreenStepId ? (steps.find((x) => x.id === fullScreenStepId) || null) : null}
        onUpdate={updateStep}
        onClose={() => setFullScreenStepId(null)}
      />
    </div>
  );
};

export default StepsEditor;
