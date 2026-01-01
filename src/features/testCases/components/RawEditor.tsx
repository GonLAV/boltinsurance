import React, { useEffect, useState } from 'react';
import { Step } from '../testCase.types';

type Props = {
  steps: Step[];
  onChange: (s: Step[]) => void;
};

// Very small parser/serializer for the simple raw format used in the UI.
const toPlain = (html: string) => {
  const tmp = document.createElement('div');
  tmp.innerHTML = html || '';
  return tmp.textContent || '';
};

const serialize = (title: string, description: string, steps: Step[]) => {
  let raw = `TITLE ${title || 'Untitled'}\nDESCRIPTION ${description || ''}\n\n`;
  steps.forEach((s, i) => {
    raw += `Step ${i + 1}: ${toPlain(s.action)}\n  Expected: ${toPlain(s.expectedResult)}\n\n`;
  });
  return raw;
};

const parse = (raw: string) => {
  const lines = raw.split(/\r?\n/);
  const steps: Step[] = [];
  let currentStep: Partial<Step> | null = null;

  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    const trimmed = ln.trim();

    // Parse TITLE
    if (trimmed.match(/^TITLE\s*:?\s*(.*)$/i)) {
      continue;
    }

    // Parse DESCRIPTION
    if (trimmed.match(/^DESCRIPTION\s*:?\s*(.*)$/i)) {
      continue;
    }

    // Skip empty lines
    if (!trimmed) {
      if (currentStep && currentStep.action && currentStep.expectedResult) {
        steps.push({
          id: Date.now() + Math.random(),
          action: currentStep.action || '',
          expectedResult: currentStep.expectedResult || ''
        });
        currentStep = null;
      }
      continue;
    }

    // Parse Step header: "Step N:" or "Step N"
    const stepMatch = trimmed.match(/^Step\s+(\d+)\s*:?\s*(.*)$/i);
    if (stepMatch) {
      // Save previous step if exists
      if (currentStep && currentStep.action && currentStep.expectedResult) {
        steps.push({
          id: Date.now() + Math.random(),
          action: currentStep.action || '',
          expectedResult: currentStep.expectedResult || ''
        });
      }
      
      currentStep = {
        id: Date.now() + Math.random(),
        action: stepMatch[2] || '',
        expectedResult: ''
      };
      continue;
    }

    // Parse Action line: "Action:" or "Action :"
    const actionMatch = trimmed.match(/^Action\s*:?\s*(.*)$/i);
    if (actionMatch && currentStep) {
      currentStep.action = (currentStep.action || '') + (currentStep.action ? ' ' : '') + (actionMatch[1] || '');
      continue;
    }

    // Parse Expected line: "Expected:" or "Expected :"
    const expectedMatch = trimmed.match(/^Expected\s*:?\s*(.*)$/i);
    if (expectedMatch && currentStep) {
      currentStep.expectedResult = (currentStep.expectedResult || '') + (currentStep.expectedResult ? ' ' : '') + (expectedMatch[1] || '');
      continue;
    }

    // Handle continuation lines (lines without a prefix, part of previous field)
    if (currentStep && trimmed) {
      // If we don't have an action yet, add to action
      if (!currentStep.action || !currentStep.action.trim()) {
        currentStep.action = (currentStep.action || '') + (currentStep.action ? ' ' : '') + trimmed;
      } else if (!currentStep.expectedResult || !currentStep.expectedResult.trim()) {
        // Otherwise add to expected result
        currentStep.expectedResult = (currentStep.expectedResult || '') + (currentStep.expectedResult ? ' ' : '') + trimmed;
      }
    }
  }

  // Don't forget the last step
  if (currentStep && (currentStep.action || currentStep.expectedResult)) {
    steps.push({
      id: Date.now() + Math.random(),
      action: currentStep.action || '',
      expectedResult: currentStep.expectedResult || ''
    });
  }

  return steps;
};

const RawEditor: React.FC<Props> = ({ steps, onChange }) => {
  const [text, setText] = useState('');

  useEffect(() => setText(serialize('', '', steps)), [steps]);

  const apply = () => {
    const parsed = parse(text);
    if (parsed.length) onChange(parsed);
  };

  return (
    <div>
      <textarea className="raw-editor" aria-label="Raw steps editor" value={text} onChange={(e) => setText(e.target.value)} />
      <div className="raw-editor-actions">
        <button className="btn-secondary" onClick={() => setText(serialize('', '', steps))}>Reset</button>
        <button className="btn-primary" onClick={apply}>Apply</button>
      </div>
    </div>
  );
};

export default RawEditor;
