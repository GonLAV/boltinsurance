import React, { useRef, useState, useEffect } from 'react';
import { Step } from '../testCase.types';
import './StepTextEditor.css';

type Props = {
  step: Step;
  field: keyof Step;
  onUpdate: (id: number, key: keyof Step, value: any) => void;
};

const StepTextEditor: React.FC<Props> = ({ step, field, onUpdate }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [toolbarVisible, setToolbarVisible] = useState(false);
  const [toolbarPos, setToolbarPos] = useState({ x: 0, y: 0 });
  let savedSelection: Range | null = null;

  // Save current selection
  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedSelection = sel.getRangeAt(0).cloneRange();
      return savedSelection;
    }
    return null;
  };

  // Restore saved selection
  const restoreSelection = () => {
    if (!savedSelection) return;
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(savedSelection);
    }
  };

  // Show toolbar on selection
  const handleSelection = () => {
    const sel = window.getSelection();
    if (!sel || sel.toString().length === 0) {
      setToolbarVisible(false);
      return;
    }

    // Ensure we have a valid range
    if (sel.rangeCount === 0) return;

    saveSelection();
    const range = sel.getRangeAt(0).cloneRange();
    const rects = range.getClientRects();

    if (rects.length === 0) return; // Can't get valid position

    // Get the last rect (end of selection)
    const rect = rects[rects.length - 1];
    let x = rect.left + rect.width / 2 - 200;
    let y = rect.bottom + 10;

    // Keep toolbar in viewport
    x = Math.max(10, Math.min(x, window.innerWidth - 420));
    if (y + 50 > window.innerHeight) {
      y = Math.max(10, rect.top - 50); // Above if below would be off-screen
    }

    setToolbarPos({ x, y });
    setToolbarVisible(true);
  };

  // Handle text changes
  const handleInput = () => {
    if (editorRef.current) {
      onUpdate(step.id, field, editorRef.current.innerHTML);
    }
  };

  const currentValue = (step[field] as string) || '';

  // Initialize content on mount or when step/field changes
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== currentValue) {
      editorRef.current.innerHTML = currentValue;
    }
  }, [step.id, field, currentValue]);

  // Toolbar actions
  const toggleBold = () => {
    restoreSelection();
    document.execCommand('bold', false);
    handleInput();
    setTimeout(() => editorRef.current?.focus(), 0);
  };

  const toggleItalic = () => {
    restoreSelection();
    document.execCommand('italic', false);
    handleInput();
    setTimeout(() => editorRef.current?.focus(), 0);
  };

  const toggleUnderline = () => {
    restoreSelection();
    document.execCommand('underline', false);
    handleInput();
    setTimeout(() => editorRef.current?.focus(), 0);
  };

  const toggleBulletList = () => {
    restoreSelection();
    document.execCommand('insertUnorderedList', false);
    handleInput();
    setTimeout(() => editorRef.current?.focus(), 0);
  };

  const toggleNumberList = () => {
    restoreSelection();
    document.execCommand('insertOrderedList', false);
    handleInput();
    setTimeout(() => editorRef.current?.focus(), 0);
  };

  const changeCase = () => {
    const sel = window.getSelection();
    if (!sel || sel.toString().length === 0) return;
    
    const text = sel.toString();
    const range = sel.getRangeAt(0);
    
    // Cycle: normal -> uppercase -> lowercase -> normal
    let newText = text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
    if (text === newText) {
      newText = text.toUpperCase();
    } else if (text === newText.toUpperCase()) {
      newText = text.toLowerCase();
    }

    range.deleteContents();
    range.insertNode(document.createTextNode(newText));
    handleInput();
    setTimeout(() => editorRef.current?.focus(), 0);
  };

  const insertCode = () => {
    const sel = window.getSelection();
    if (!sel || sel.toString().length === 0) return;

    const code = document.createElement('code');
    code.style.background = '#f5f5f5';
    code.style.padding = '2px 6px';
    code.style.borderRadius = '4px';
    code.style.fontFamily = 'monospace';
    code.style.color = '#d63384';

    const range = sel.getRangeAt(0);
    const fragment = range.extractContents();
    code.appendChild(fragment);
    range.insertNode(code);
    handleInput();
    setTimeout(() => editorRef.current?.focus(), 0);
  };

  const insertMention = () => {
    restoreSelection();
    document.execCommand('insertText', false, '@');
    handleInput();
    setTimeout(() => editorRef.current?.focus(), 0);
  };

  const toggleHeading = () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    const range = sel.getRangeAt(0);
    let container: ParentNode | null = range.commonAncestorContainer as ParentNode;
    
    while (container && container !== editorRef.current && (container as Node).nodeType !== 1) {
      container = (container as Node).parentNode;
    }

    if (!container || container === editorRef.current) return;

    const element = container as HTMLElement;
    let newTag = 'h1';
    
    if (element.tagName === 'H1') newTag = 'h2';
    else if (element.tagName === 'H2') newTag = 'p';

    const newElement = document.createElement(newTag);
    newElement.innerHTML = element.innerHTML;
    element.replaceWith(newElement);
    
    handleInput();
    setTimeout(() => editorRef.current?.focus(), 0);
  };

  const addLink = () => {
    const sel = window.getSelection();
    if (!sel || sel.toString().length === 0) return;

    const url = prompt('Enter URL:');
    if (!url) return;

    const a = document.createElement('a');
    a.href = url;
    a.style.color = '#667eea';
    a.style.textDecoration = 'underline';
    a.style.cursor = 'pointer';

    const range = sel.getRangeAt(0);
    const fragment = range.extractContents();
    a.appendChild(fragment);
    range.insertNode(a);
    handleInput();
    setTimeout(() => editorRef.current?.focus(), 0);
  };

  const addImage = () => {
    const url = prompt('Enter image URL:');
    if (!url) return;

    restoreSelection();
    const img = document.createElement('img');
    img.src = url;
    img.alt = 'Image';
    img.style.maxWidth = '100%';
    img.style.height = 'auto';
    img.style.marginTop = '8px';
    img.style.marginBottom = '8px';

    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      range.insertNode(img);
    }
    handleInput();
    setTimeout(() => editorRef.current?.focus(), 0);
  };

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (
        toolbarRef.current &&
        !toolbarRef.current.contains(e.target as Node) &&
        editorRef.current &&
        !editorRef.current.contains(e.target as Node)
      ) {
        setToolbarVisible(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setToolbarVisible(false);
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    const el = toolbarRef.current;
    if (!el) return;
    el.style.left = `${toolbarPos.x}px`;
    el.style.top = `${toolbarPos.y}px`;
  }, [toolbarPos.x, toolbarPos.y]);

  return (
    <div className="step-text-editor-container">
      <div
        ref={editorRef}
        className="step-text-editor"
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onMouseUp={handleSelection}
        onKeyUp={handleSelection}
      />

      {toolbarVisible && (
        <div
          ref={toolbarRef}
          className="step-toolbar"
        >
          <button className="step-toolbar-btn" onClick={toggleBold} title="Bold">
            <strong>B</strong>
          </button>
          <button className="step-toolbar-btn" onClick={toggleItalic} title="Italic">
            <em>I</em>
          </button>
          <button className="step-toolbar-btn" onClick={toggleUnderline} title="Underline">
            <u>U</u>
          </button>

          <div className="step-toolbar-divider" />

          <button className="step-toolbar-btn" onClick={toggleBulletList} title="Bullet List">
            •
          </button>
          <button className="step-toolbar-btn" onClick={toggleNumberList} title="Numbered List">
            1.
          </button>

          <div className="step-toolbar-divider" />

          <button className="step-toolbar-btn" onClick={changeCase} title="Change Case">
            Aa
          </button>
          <button className="step-toolbar-btn" onClick={insertCode} title="Inline Code">
            &lt;/&gt;
          </button>
          <button className="step-toolbar-btn" onClick={insertMention} title="Mention">
            @
          </button>

          <div className="step-toolbar-divider" />

          <button className="step-toolbar-btn" onClick={toggleHeading} title="Heading">
            #
          </button>
          <button className="step-toolbar-btn" onClick={addLink} title="Link">
            🔗
          </button>
          <button className="step-toolbar-btn" onClick={addImage} title="Image">
            🖼️
          </button>

          <div className="step-toolbar-divider" />

          <button className="step-toolbar-btn" onClick={() => {}} title="More">
            …
          </button>
        </div>
      )}
    </div>
  );
};

export default StepTextEditor;
