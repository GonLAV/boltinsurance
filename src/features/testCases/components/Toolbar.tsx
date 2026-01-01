import React from 'react';

type Props = {
  onAdd: () => void;
  mode: 'visual' | 'raw';
  setMode: (m: 'visual' | 'raw') => void;
  onExtract?: () => void;
};

const Toolbar: React.FC<Props> = ({ onAdd, mode, setMode, onExtract }) => {
  return (
    <div className="steps-toolbar">
      <button className="steps-toolbar-add" onClick={onAdd}>
        ➕ <span>Add Step</span>
      </button>

      <div className="steps-toolbar-right">
        <div className="steps-toolbar-modes" aria-label="Steps editor mode">
          <button
            className={`steps-toolbar-mode ${mode === 'visual' ? 'active visual' : ''}`}
            onClick={() => setMode('visual')}
            type="button"
          >
            👁️ Visual
          </button>

          <button
            className={`steps-toolbar-mode ${mode === 'raw' ? 'active raw' : ''}`}
            onClick={() => setMode('raw')}
            type="button"
          >
            ⚙️ Raw
          </button>

          {onExtract && (
            <button
              className="steps-toolbar-extract"
              onClick={onExtract}
              title="Copy all steps to clipboard"
              type="button"
            >
              📋 Extract
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Toolbar;
