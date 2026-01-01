import React, { useEffect, useRef, useState, useCallback } from 'react';
import './rich-editor.css';

type Props = {
  initialHtml?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  variant?: 'full' | 'embedded';
};

const textColorClassByValue: Record<string, string> = {
  '#000000': 're-swatch-black',
  '#ef4444': 're-swatch-red',
  '#f59e0b': 're-swatch-amber',
  '#10b981': 're-swatch-emerald',
  '#3b82f6': 're-swatch-blue',
  '#0078d4': 're-swatch-azure',
  '#8b5cf6': 're-swatch-violet',
  '#ec4899': 're-swatch-pink',
  '#64748b': 're-swatch-slate',
  '#ffffff': 're-swatch-white',
};

const highlightClassByValue: Record<string, string> = {
  '#fef3c7': 're-hl-amber-100',
  '#dbeafe': 're-hl-blue-100',
  '#d1fae5': 're-hl-emerald-100',
  '#fce7f3': 're-hl-pink-100',
  '#e0e7ff': 're-hl-indigo-100',
  '#fef2f2': 're-hl-red-50',
  '#f3f4f6': 're-hl-gray-100',
  '#fffbeb': 're-hl-amber-50',
  '#fdf2f8': 're-hl-pink-50',
};

export const RichEditor: React.FC<Props> = ({ initialHtml = '', onChange, placeholder, variant = 'full' }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const savedRangeRef = useRef<Range | null>(null);
  // Tracks the last HTML we've emitted/applied, so we don't spam onChange or clobber user typing.
  const lastHtmlRef = useRef<string>('');

  const [spellCheckEnabled, setSpellCheckEnabled] = useState(true);
  const [trackChangesEnabled, setTrackChangesEnabled] = useState(false);
  const [lastFindQuery, setLastFindQuery] = useState<string>('');
  const [lastFindIndex, setLastFindIndex] = useState<number>(-1);

  const textColorBtnRef = useRef<HTMLButtonElement>(null);
  const highlightColorBtnRef = useRef<HTMLButtonElement>(null);
  const emojiBtnRef = useRef<HTMLButtonElement>(null);
  const pickerWrapRef = useRef<HTMLDivElement>(null);

  const [openPicker, setOpenPicker] = useState<'text' | 'background' | 'emoji' | 'fontSize' | 'mention' | null>(null);
  const [activeModal, setActiveModal] = useState<'heading' | 'codeBlock' | 'quote' | 'table' | 'panel' | 'image' | 'mention' | null>(null);

  const [pickerPos, setPickerPos] = useState<{ top: number; left: number; placement: 'above' | 'below' } | null>(null);

  const computePickerPos = useCallback((rect: DOMRect) => {
    const PICKER_WIDTH = 400; // approx width of 10 swatches + padding
    const margin = 8;
    const centerX = rect.left + rect.width / 2;
    const clampedLeft = Math.min(
      Math.max(margin, Math.round(centerX - PICKER_WIDTH / 2)),
      Math.max(margin, Math.round(window.innerWidth - PICKER_WIDTH - margin))
    );

    // Always open above the trigger button for easier use
    const aboveTop = rect.top - margin;
    return { top: Math.round(aboveTop), left: clampedLeft, placement: 'above' as const };
  }, []);

  useEffect(() => {
    if (!pickerPos || !pickerWrapRef.current) return;
    pickerWrapRef.current.style.top = `${pickerPos.top}px`;
    pickerWrapRef.current.style.left = `${pickerPos.left}px`;
  }, [pickerPos]);

  // Generate cosmic stars on mount (full variant only)
  useEffect(() => {
    if (variant !== 'full') return;
    const starsContainer = document.getElementById('stars');
    if (starsContainer && starsContainer.children.length === 0) {
      for (let i = 0; i < 100; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        star.style.left = Math.random() * 100 + '%';
        star.style.top = Math.random() * 100 + '%';
        star.style.width = Math.random() * 3 + 1 + 'px';
        star.style.height = star.style.width;
        star.style.animationDelay = Math.random() * 3 + 's';
        starsContainer.appendChild(star);
      }
    }
  }, [variant]);
  
  const [headingText, setHeadingText] = useState('');
  const [codeBlockText, setCodeBlockText] = useState('');
  const [quoteText, setQuoteText] = useState('');
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);
  const [panelTitle, setPanelTitle] = useState('');
  const [panelContent, setPanelContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageAlt, setImageAlt] = useState('');
  const [mentionHandle, setMentionHandle] = useState('');

  const emitChange = useCallback(() => {
    const html = editorRef.current?.innerHTML || '';
    if (html !== lastHtmlRef.current) {
      lastHtmlRef.current = html;
      onChange?.(html);
    }
  }, [onChange]);

  const saveSelection = useCallback(() => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      if (editorRef.current?.contains(range.commonAncestorContainer)) {
        savedRangeRef.current = range.cloneRange();
      }
    }
  }, []);

  const restoreSelection = useCallback(() => {
    if (!savedRangeRef.current) return false;
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(savedRangeRef.current.cloneRange());
      return true;
    }
    return false;
  }, []);

  const ensureFocus = useCallback(() => {
    if (document.activeElement !== editorRef.current) {
      editorRef.current?.focus();
      restoreSelection();
    }
  }, [restoreSelection]);

  const runCommand = (command: string, value: string | undefined = undefined) => {
    ensureFocus();
    try {
      document.execCommand('styleWithCSS', false, 'true');
      document.execCommand(command, false, value);
    } catch (e) {
      console.error('Command failed:', e);
    }
    emitChange();
    saveSelection();
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const applyTextColor = (color: string) => {
    ensureFocus();
    restoreSelection();
    try {
      document.execCommand('styleWithCSS', false, 'true');
      document.execCommand('foreColor', false, color);
    } catch (e) {
      console.error('Color command failed:', e);
    }
    emitChange();
    saveSelection();
    setOpenPicker(null);
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const applyHighlight = (color: string) => {
    ensureFocus();
    restoreSelection();
    try {
      document.execCommand('styleWithCSS', false, 'true');
      if (color === 'transparent') {
        document.execCommand('removeFormat', false);
      } else {
        document.execCommand('backColor', false, color);
      }
    } catch (e) {
      console.error('Highlight command failed:', e);
    }
    emitChange();
    saveSelection();
    setOpenPicker(null);
  };

  const clearFormatting = () => {
    runCommand('removeFormat');
    runCommand('unlink');
  };

  const insertElement = (node: Node) => {
    ensureFocus();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) {
      editorRef.current?.appendChild(node);
    } else {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      range.insertNode(node);
      
      const p = document.createElement('p');
      p.innerHTML = '<br>';
      node.parentNode?.insertBefore(p, node.nextSibling);
      
      const newRange = document.createRange();
      newRange.setStart(p, 0);
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);
    }
    emitChange();
    saveSelection();
  };

  const insertTextAtSelection = (text: string, opts?: { wrapClassName?: string }) => {
    ensureFocus();
    restoreSelection();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) {
      editorRef.current?.appendChild(document.createTextNode(text));
      emitChange();
      saveSelection();
      return;
    }
    const range = sel.getRangeAt(0);
    range.deleteContents();

    let nodeToInsert: Node;
    if (opts?.wrapClassName) {
      const span = document.createElement('span');
      span.className = opts.wrapClassName;
      span.textContent = text;
      nodeToInsert = span;
    } else {
      nodeToInsert = document.createTextNode(text);
    }

    range.insertNode(nodeToInsert);

    const newRange = document.createRange();
    newRange.setStartAfter(nodeToInsert);
    newRange.collapse(true);
    sel.removeAllRanges();
    sel.addRange(newRange);
    emitChange();
    saveSelection();
  };

  const wrapSelection = (className: string, attrs?: Record<string, string>) => {
    ensureFocus();
    restoreSelection();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return false;
    const range = sel.getRangeAt(0);
    if (range.collapsed) return false;

    const span = document.createElement('span');
    span.className = className;
    if (attrs) {
      Object.entries(attrs).forEach(([k, v]) => span.setAttribute(k, v));
    }

    try {
      span.appendChild(range.extractContents());
      range.insertNode(span);

      const newRange = document.createRange();
      newRange.selectNodeContents(span);
      newRange.collapse(false);
      sel.removeAllRanges();
      sel.addRange(newRange);
      emitChange();
      saveSelection();
      return true;
    } catch (e) {
      console.error('Wrap selection failed', e);
      return false;
    }
  };

  const toggleSpellCheck = () => {
    setSpellCheckEnabled((v) => !v);
    // keep focus/selection stable
    saveSelection();
    ensureFocus();
  };

  const insertSpecialCharacter = () => {
    saveSelection();
    const options = '© ® € ° ± × ÷ ≠ ≤ ≥ ∞ √ ∑ ∫ π Ω';
    const picked = prompt(`Insert special character (copy/paste one of these):\n${options}`, 'Ω');
    if (!picked) return;
    insertTextAtSelection(picked);
  };

  const insertMathFormula = () => {
    saveSelection();
    const picked = prompt('Insert math (plain text). Example: ∑(i=1..n) xᵢ', '∑(i=1..n)');
    if (!picked) return;
    insertTextAtSelection(picked, { wrapClassName: 'azure-math' });
  };

  const addCommentToSelection = () => {
    saveSelection();
    const comment = prompt('Comment text:', '');
    if (comment === null) return;
    const ok = wrapSelection('azure-comment', { 'data-comment': comment });
    if (!ok) {
      insertTextAtSelection('💬', { wrapClassName: 'azure-comment' });
    }
  };

  const toggleTrackChanges = () => {
    setTrackChangesEnabled((v) => !v);
    saveSelection();
  };

  const getTextNodes = (root: Node): Text[] => {
    const out: Text[] = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let n = walker.nextNode();
    while (n) {
      out.push(n as Text);
      n = walker.nextNode();
    }
    return out;
  };

  const findNext = (query: string) => {
    const root = editorRef.current;
    if (!root) return false;
    const nodes = getTextNodes(root);
    if (!nodes.length) return false;

    // flatten text to compute global indices
    const joined = nodes.map((t) => t.nodeValue || '').join('');
    if (!joined) return false;

    const start = query === lastFindQuery && lastFindIndex >= 0 ? lastFindIndex + query.length : 0;
    const idx = joined.indexOf(query, start);
    const actual = idx >= 0 ? idx : joined.indexOf(query, 0);
    if (actual < 0) return false;

    // map global index to a specific text node + offset
    let acc = 0;
    let startNode: Text | null = null;
    let startOffset = 0;
    let endNode: Text | null = null;
    let endOffset = 0;
    for (const t of nodes) {
      const val = t.nodeValue || '';
      const nextAcc = acc + val.length;
      if (!startNode && actual < nextAcc) {
        startNode = t;
        startOffset = actual - acc;
      }
      const endPos = actual + query.length;
      if (endPos <= nextAcc) {
        endNode = t;
        endOffset = endPos - acc;
        break;
      }
      acc = nextAcc;
    }
    if (!startNode || !endNode) return false;

    const range = document.createRange();
    range.setStart(startNode, startOffset);
    range.setEnd(endNode, endOffset);
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(range);
    }
    savedRangeRef.current = range.cloneRange();
    setLastFindQuery(query);
    setLastFindIndex(actual);

    const el = startNode.parentElement;
    el?.scrollIntoView({ block: 'center' });
    return true;
  };

  const findAndReplace = () => {
    saveSelection();
    const q = prompt('Find text:', lastFindQuery || '');
    if (!q) return;
    const replacement = prompt('Replace with (leave empty for find-only):', '');
    if (replacement === null) {
      findNext(q);
      return;
    }
    if (replacement === '') {
      // find-only
      findNext(q);
      return;
    }
    const root = editorRef.current;
    if (!root) return;
    const nodes = getTextNodes(root);
    let did = false;
    nodes.forEach((t) => {
      const val = t.nodeValue || '';
      if (!val.includes(q)) return;
      t.nodeValue = val.split(q).join(replacement);
      did = true;
    });
    if (did) {
      emitChange();
      saveSelection();
      setLastFindQuery(q);
      setLastFindIndex(-1);
    }
  };

  const insertHeading = () => {
    if (!headingText.trim()) return;
    const h2 = document.createElement('h2');
    h2.className = 'azure-heading';
    h2.textContent = headingText;
    insertElement(h2);
    setHeadingText('');
    setActiveModal(null);
  };

  const insertPanel = () => {
    const titleText = panelTitle.trim() || 'Info';
    const contentText = panelContent.trim() || 'Details go here.';
    const panel = document.createElement('div');
    panel.className = 'azure-panel';
    
    const pt = document.createElement('div');
    pt.className = 'azure-panel-title';
    pt.textContent = titleText;
    
    const pc = document.createElement('div');
    pc.textContent = contentText;
    
    panel.appendChild(pt);
    panel.appendChild(pc);
    insertElement(panel);
    setPanelTitle('');
    setPanelContent('');
    setActiveModal(null);
  };

  const insertCodeBlock = () => {
    if (!codeBlockText.trim()) return;
    const codeBlock = document.createElement('pre');
    codeBlock.className = 'azure-code-block';
    const code = document.createElement('code');
    code.textContent = codeBlockText;
    codeBlock.appendChild(code);
    insertElement(codeBlock);
    setCodeBlockText('');
    setActiveModal(null);
  };

  const insertQuote = () => {
    if (!quoteText.trim()) return;
    const blockquote = document.createElement('blockquote');
    blockquote.className = 'azure-quote';
    blockquote.textContent = quoteText;
    insertElement(blockquote);
    setQuoteText('');
    setActiveModal(null);
  };

  const insertTable = () => {
    const table = document.createElement('table');
    table.className = 'azure-table';

    for (let i = 0; i < tableRows; i++) {
      const tr = document.createElement('tr');
      for (let j = 0; j < tableCols; j++) {
        const cell = document.createElement(i === 0 ? 'th' : 'td');
        if (i === 0) {
          cell.textContent = `Header ${j + 1}`;
        } else {
          cell.textContent = `Cell ${i},${j}`;
        }
        tr.appendChild(cell);
      }
      table.appendChild(tr);
    }
    insertElement(table);
    setTableRows(3);
    setTableCols(3);
    setActiveModal(null);
  };

  const insertImage = () => {
    if (!imageUrl.trim()) return;
    const img = document.createElement('img');
    img.className = 'azure-img';
    img.src = imageUrl;
    img.alt = imageAlt || 'Image';
    insertElement(img);
    setImageUrl('');
    setImageAlt('');
    setActiveModal(null);
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const insertEmoji = (emoji: string) => {
    ensureFocus();
    restoreSelection();
    runCommand('insertText', emoji);
    saveSelection();
    setOpenPicker(null);
  };

  const applyFontSize = (size: string) => {
    restoreSelection();
    runCommand('fontSize', size);
    setOpenPicker(null);
  };

  const emojiList = [
    '😀','😁','😂','🤣','😊','😍','😘','😎','🤔','😴','😅','😭','😡','👍','👎','🙏','👏','💪','🔥','✨','🎉','✅','❌','⚠️',
    '🧪','🐞','📌','📎','📝','📷','🖼️','🔍','🔗','🚀','📊','📈','📉','⏱️','⌛','📅','🧩','⚙️','🛠️','🔒','🔓','🧠','💡',
    '💬','🗒️','📋','☐','☑️','⭐','🌟','🧭','🧰','🧯','🧱','🧵','🧷','🪲','🛰️','🧾','🧿','🧼','🧲','🧳'
  ];

  const changeFontSize = (delta: number) => {
    ensureFocus();
    restoreSelection();
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const element = sel.anchorNode?.parentElement as HTMLElement;
      if (element) {
        const currentSize = window.getComputedStyle(element).fontSize;
        const size = parseInt(currentSize) || 16;
        const newSize = Math.max(8, Math.min(72, size + delta));
        runCommand('fontSize', Math.ceil(newSize / 4).toString());
      }
    }
  };

  const applyParagraphStyle = (style: string) => {
    restoreSelection();
    switch (style) {
      case 'title':
        runCommand('formatBlock', '<h1>');
        break;
      case 'subtitle':
        runCommand('formatBlock', '<h2>');
        break;
      case 'quote':
        runCommand('formatBlock', '<blockquote>');
        break;
      case 'code':
        runCommand('formatBlock', '<pre>');
        break;
      default:
        runCommand('formatBlock', '<p>');
    }
  };

  const insertTaskCheckbox = (completed: boolean) => {
    ensureFocus();
    restoreSelection();
    const checkbox = completed ? '☑️' : '☐';
    runCommand('insertText', checkbox + ' ');
    saveSelection();
  };

  const insertMention = () => {
    if (!mentionHandle.trim()) return;
    ensureFocus();
    restoreSelection();
    const mention = document.createElement('span');
    mention.className = 'azure-mention';
    mention.textContent = '@' + mentionHandle;
    runCommand('insertText', ' ');
    const range = window.getSelection()?.getRangeAt(0);
    if (range) {
      range.insertNode(mention);
    }
    saveSelection();
    setMentionHandle('');
    setActiveModal(null);
    emitChange();
  };

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;

    const nextHtml = initialHtml || '';
    if (nextHtml === lastHtmlRef.current) return;

    // Never overwrite the DOM while the user is actively editing.
    if (document.activeElement === el) return;

    el.innerHTML = nextHtml;
    lastHtmlRef.current = nextHtml;
  }, [initialHtml]);

  useEffect(() => {
    const handleSelection = () => {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        if (editorRef.current?.contains(range.commonAncestorContainer)) {
          savedRangeRef.current = range.cloneRange();
        }
      }
    };
    document.addEventListener('selectionchange', handleSelection);
    return () => document.removeEventListener('selectionchange', handleSelection);
  }, []);
  const toolbarButtonProps = {
    onMouseDown: (e: React.MouseEvent) => {
      e.preventDefault();
    },
  };

  const editorUi = (
    <>
      <div className="toolbar">
          {/* Undo/Redo */}
          <div className="toolbar-group">
            <button {...toolbarButtonProps} className="toolbar-btn" onClick={() => runCommand('undo')} title="Undo (Ctrl+Z)"><span>⎌</span></button>
            <button {...toolbarButtonProps} className="toolbar-btn" onClick={() => runCommand('redo')} title="Redo (Ctrl+Y)"><span>⎌</span></button>
          </div>

          {/* Text Formatting */}
          <div className="toolbar-group">
            <button {...toolbarButtonProps} className="toolbar-btn" onClick={() => runCommand('bold')} title="Bold (Ctrl+B)"><span className="re-icon-bold">B</span></button>
            <button {...toolbarButtonProps} className="toolbar-btn" onClick={() => runCommand('italic')} title="Italic (Ctrl+I)"><span className="re-icon-italic">I</span></button>
            <button {...toolbarButtonProps} className="toolbar-btn" onClick={() => runCommand('underline')} title="Underline (Ctrl+U)"><span className="re-icon-underline">U</span></button>
            <button {...toolbarButtonProps} className="toolbar-btn" onClick={() => runCommand('strikeThrough')} title="Strikethrough"><span className="re-icon-strike">S</span></button>
            <button {...toolbarButtonProps} className="toolbar-btn" onClick={clearFormatting} title="Clear Formatting"><span>✖</span></button>
          </div>

          {/* Font Controls */}
          <div className="toolbar-group">
            <select className="toolbar-select" onChange={(e) => runCommand('fontName', e.target.value)} title="Font Family">
              <option>Segoe UI</option>
              <option>Arial</option>
              <option>Helvetica</option>
              <option>Times New Roman</option>
              <option>Courier New</option>
              <option>Georgia</option>
              <option>Verdana</option>
            </select>
            <select className="toolbar-select" defaultValue="16" onChange={(e) => applyFontSize(e.target.value)} title="Font Size">
              <option value="12">12</option>
              <option value="14">14</option>
              <option value="16">16</option>
              <option value="18">18</option>
              <option value="20">20</option>
              <option value="24">24</option>
              <option value="28">28</option>
            </select>
            <button {...toolbarButtonProps} className="toolbar-btn" onClick={() => changeFontSize(-2)} title="Decrease Font Size"><span className="re-icon-18">−</span></button>
            <button {...toolbarButtonProps} className="toolbar-btn" onClick={() => changeFontSize(+2)} title="Increase Font Size"><span className="re-icon-18">+</span></button>
          </div>

          {/* Text Styles */}
          <div className="toolbar-group">
            <select className="toolbar-select" onChange={(e) => applyParagraphStyle(e.target.value)} title="Paragraph Style" defaultValue="normal">
              <option value="normal">Normal</option>
              <option value="title">Title</option>
              <option value="subtitle">Subtitle</option>
              <option value="quote">Quote</option>
              <option value="code">Code</option>
            </select>
          </div>

          {/* Colors */}
          <div className="toolbar-group">
            <button
              {...toolbarButtonProps}
              ref={textColorBtnRef}
              className="toolbar-btn"
              onClick={() => {
                saveSelection();
                const next = openPicker === 'text' ? null : 'text';
                setOpenPicker(next);
                if (!next) {
                  setPickerPos(null);
                  return;
                }
                const rect = textColorBtnRef.current?.getBoundingClientRect();
                if (rect) setPickerPos(computePickerPos(rect));
              }}
              title="Text Color"
            >
              <span className="re-icon-16 re-icon-bold re-icon-text-color">A</span>
            </button>

            <button
              {...toolbarButtonProps}
              ref={highlightColorBtnRef}
              className="toolbar-btn"
              onClick={() => {
                saveSelection();
                const next = openPicker === 'background' ? null : 'background';
                setOpenPicker(next);
                if (!next) {
                  setPickerPos(null);
                  return;
                }
                const rect = highlightColorBtnRef.current?.getBoundingClientRect();
                if (rect) setPickerPos(computePickerPos(rect));
              }}
              title="Highlight Color"
            >
              <span className="re-icon-16 re-icon-bold re-icon-bg-color">A</span>
            </button>
          </div>

          {/* Script & Special */}
          <div className="toolbar-group">
            <button {...toolbarButtonProps} className="toolbar-btn" onClick={() => runCommand('superscript')} title="Superscript"><span>x²</span></button>
            <button {...toolbarButtonProps} className="toolbar-btn" onClick={() => runCommand('subscript')} title="Subscript"><span>x₂</span></button>
            <button {...toolbarButtonProps} className="toolbar-btn" onClick={insertSpecialCharacter} title="Special Characters"><span className="re-icon-18">Ω</span></button>
          </div>

          {/* Alignment */}
          <div className="toolbar-group">
            <button {...toolbarButtonProps} className="toolbar-btn" onClick={() => runCommand('justifyLeft')} title="Align Left"><span className="re-icon-18">☰</span></button>
            <button {...toolbarButtonProps} className="toolbar-btn" onClick={() => runCommand('justifyCenter')} title="Align Center"><span className="re-icon-18">☷</span></button>
            <button {...toolbarButtonProps} className="toolbar-btn" onClick={() => runCommand('justifyRight')} title="Align Right"><span className="re-icon-18">☰</span></button>
            <button {...toolbarButtonProps} className="toolbar-btn" onClick={() => runCommand('justifyFull')} title="Justify"><span className="re-icon-18">▭</span></button>
          </div>

          {/* Indentation */}
          <div className="toolbar-group">
            <button {...toolbarButtonProps} className="toolbar-btn" onClick={() => runCommand('indent')} title="Indent"><span className="re-icon-18">⇥</span></button>
            <button {...toolbarButtonProps} className="toolbar-btn" onClick={() => runCommand('outdent')} title="Outdent"><span className="re-icon-18">⇤</span></button>
          </div>

          {/* Lists */}
          <div className="toolbar-group">
            <button {...toolbarButtonProps} className="toolbar-btn" onClick={() => runCommand('insertUnorderedList')} title="Bulleted List"><span className="re-icon-20">●</span></button>
            <button {...toolbarButtonProps} className="toolbar-btn" onClick={() => runCommand('insertOrderedList')} title="Numbered List"><span className="re-icon-bold">1.</span></button>
            <button {...toolbarButtonProps} className="toolbar-btn" onClick={() => insertTaskCheckbox(false)} title="Checklist"><span>☐</span></button>
          </div>

          {/* Insert Content */}
          <div className="toolbar-group">
            <button {...toolbarButtonProps} className="toolbar-btn" onClick={() => runCommand('insertHorizontalRule')} title="Horizontal Divider"><span className="re-icon-18">―</span></button>
            <button {...toolbarButtonProps} className="toolbar-btn" onClick={() => setActiveModal('table')} title="Insert Table"><span>⊞</span></button>
            <button {...toolbarButtonProps} className="toolbar-btn" onClick={() => setActiveModal('image')} title="Insert Image"><span>🖼</span></button>
            <button {...toolbarButtonProps} className="toolbar-btn" onClick={() => runCommand('createLink', 'https://')} title="Insert Link"><span>🔗</span></button>
            <button {...toolbarButtonProps} className="toolbar-btn" onClick={() => runCommand('unlink')} title="Remove Link"><span>🔓</span></button>
          </div>

          {/* Media & Embed */}
          <div className="toolbar-group">
            <button {...toolbarButtonProps} className="toolbar-btn" onClick={() => {
              const url = prompt('Enter video URL (YouTube, Vimeo, etc.):');
              if (url) {
                const iframe = document.createElement('iframe');
                iframe.src = url;
                iframe.width = '560';
                iframe.height = '315';
                iframe.style.borderRadius = '8px';
                insertElement(iframe);
              }
            }} title="Embed Video"><span>▶</span></button>
            <button {...toolbarButtonProps} className="toolbar-btn" onClick={() => {
              const fileInput = document.createElement('input');
              fileInput.type = 'file';
              fileInput.onchange = (e: any) => {
                const file = e.target.files[0];
                if (file) {
                  const a = document.createElement('a');
                  a.href = URL.createObjectURL(file);
                  a.download = file.name;
                  a.textContent = '📎 ' + file.name;
                  insertElement(a);
                }
              };
              fileInput.click();
            }} title="Attach File"><span>📎</span></button>
            <button
              {...toolbarButtonProps}
              ref={emojiBtnRef}
              className="toolbar-btn"
              onClick={() => {
                saveSelection();
                const next = openPicker === 'emoji' ? null : 'emoji';
                setOpenPicker(next);
                if (!next) {
                  setPickerPos(null);
                  return;
                }
                const rect = emojiBtnRef.current?.getBoundingClientRect();
                if (rect) setPickerPos(computePickerPos(rect));
              }}
              title="Insert Emoji"
            >
              <span>☺</span>
            </button>
          </div>

          {/* Advanced */}
          <div className="toolbar-group">
            <button {...toolbarButtonProps} className="toolbar-btn" onClick={insertMathFormula} title="Math Formula"><span className="re-icon-18">Σ</span></button>
            <button {...toolbarButtonProps} className="toolbar-btn" onClick={() => setActiveModal('codeBlock')} title="Code Block"><span className="re-icon-mono re-icon-bold">&lt;/&gt;</span></button>
            <button {...toolbarButtonProps} className="toolbar-btn" onClick={() => setActiveModal('heading')} title="Heading Styles"><span className="re-icon-16 re-icon-bold">H</span></button>
            <button {...toolbarButtonProps} className="toolbar-btn" onClick={() => setActiveModal('panel')} title="Info Block"><span className="re-icon-bold">ⓘ</span></button>
            <button {...toolbarButtonProps} className="toolbar-btn" onClick={() => setActiveModal('quote')} title="Quote Block"><span className="re-icon-20">&quot;</span></button>
          </div>

          {/* Collaboration */}
          <div className="toolbar-group">
            <button {...toolbarButtonProps} className="toolbar-btn" onClick={addCommentToSelection} title="Add Comment"><span>💬</span></button>
            <button
              {...toolbarButtonProps}
              className={`toolbar-btn ${trackChangesEnabled ? 'active' : ''}`}
              onClick={toggleTrackChanges}
              title={trackChangesEnabled ? 'Track Changes (On)' : 'Track Changes (Off)'}
            >
              <span>✎</span>
            </button>
          </div>

          {/* Tools */}
          <div className="toolbar-group">
            <button {...toolbarButtonProps} className="toolbar-btn" onClick={findAndReplace} title="Find &amp; Replace"><span>🔍</span></button>
            <button
              {...toolbarButtonProps}
              className={`toolbar-btn ${spellCheckEnabled ? 'active' : ''}`}
              onClick={toggleSpellCheck}
              title={spellCheckEnabled ? 'Spell Check (On)' : 'Spell Check (Off)'}
            >
              <span className="re-icon-18">✓</span>
            </button>
            <button {...toolbarButtonProps} className="toolbar-btn" onClick={() => {
              const text = editorRef.current?.textContent || '';
              const wordCount = text.trim().split(/\s+/).length;
              const charCount = text.length;
              alert(`Word Count: ${wordCount}\nCharacter Count: ${charCount}`);
            }} title="Word Count"><span className="re-icon-mono re-icon-bold">123</span></button>
          </div>
        </div>

      <div className="editor-area">
        <div
          ref={editorRef}
          className="editor-content"
          contentEditable
          spellCheck={spellCheckEnabled}
          onInput={emitChange}
          onBeforeInput={(e) => {
            if (!trackChangesEnabled) return;
            // Only highlight inserted content; keep deletes as-is.
            const native = e.nativeEvent as InputEvent;
            const inputType = native?.inputType || '';
            if (!inputType.startsWith('insert')) return;

            // For paste, prefer clipboard plain text.
            let text = (native as any).data as string | null;
            if (inputType === 'insertFromPaste') {
              const paste = (native as any).dataTransfer || (native as any).clipboardData;
              const plain = paste?.getData?.('text/plain');
              if (plain) text = plain;
            }
            if (!text) return;

            e.preventDefault();
            insertTextAtSelection(text, { wrapClassName: 'azure-inserted' });
          }}
          onBlur={() => {
            saveSelection();
            emitChange();
          }}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
              e.preventDefault();
              runCommand('undo');
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
              e.preventDefault();
              runCommand('redo');
            }
          }}
          data-placeholder={placeholder || 'Enter text...'}
        />
      </div>
    </>
  );

  return (
    <div className={variant === 'full' ? 'cosmic-container' : 're-embedded'}>
      {variant === 'full' && (
        <>
          <div className="stars" id="stars"></div>
          <div className="cosmic-orb orb-1"></div>
          <div className="cosmic-orb orb-2"></div>

          <div className="test-section">
            <div className="section-header">
              <div className="header-content">
                <div className="toolbar-title">BOLTEST toolbar</div>
                <div className="toolbar-subtitle">Cosmic Rich Text Editor</div>
              </div>
            </div>

            {editorUi}
          </div>
        </>
      )}

      {variant !== 'full' && editorUi}

      {activeModal && (
        <div className="re-modal" onClick={() => setActiveModal(null)}>
          <div className="re-modal-card" onClick={(e) => e.stopPropagation()}>
            {activeModal === 'heading' && (
              <>
                <div className="re-modal-title">Insert Heading</div>
                <input
                  className="re-modal-input"
                  placeholder="Heading text"
                  value={headingText}
                  onChange={(e) => setHeadingText(e.target.value)}
                  autoFocus
                />
                <div className="re-modal-actions">
                  <button className="re-btn ghost" onClick={() => setActiveModal(null)}>Cancel</button>
                  <button className="re-btn azure" onClick={insertHeading}>Insert</button>
                </div>
              </>
            )}

            {activeModal === 'codeBlock' && (
              <>
                <div className="re-modal-title">Insert Code Block</div>
                <textarea className="re-modal-textarea code" placeholder="Enter your code here" value={codeBlockText} onChange={(e) => setCodeBlockText(e.target.value)} autoFocus />
                <div className="re-modal-actions">
                  <button className="re-btn ghost" onClick={() => setActiveModal(null)}>Cancel</button>
                  <button className="re-btn azure" onClick={insertCodeBlock}>Insert</button>
                </div>
              </>
            )}

            {activeModal === 'quote' && (
              <>
                <div className="re-modal-title">Insert Quote</div>
                <textarea className="re-modal-textarea" placeholder="Enter your quote here" value={quoteText} onChange={(e) => setQuoteText(e.target.value)} autoFocus />
                <div className="re-modal-actions">
                  <button className="re-btn ghost" onClick={() => setActiveModal(null)}>Cancel</button>
                  <button className="re-btn azure" onClick={insertQuote}>Insert</button>
                </div>
              </>
            )}

            {activeModal === 'table' && (
              <>
                <div className="re-modal-title">Insert Table</div>
                <div className="re-modal-grid-row">
                  <div className="re-modal-grid-col">
                    <label className="re-modal-label" htmlFor="table-rows">Rows:</label>
                    <input id="table-rows" type="number" min="1" max="20" value={tableRows} onChange={(e) => setTableRows(parseInt(e.target.value) || 1)} className="re-modal-input-number" />
                  </div>
                  <div className="re-modal-grid-col">
                    <label className="re-modal-label" htmlFor="table-cols">Columns:</label>
                    <input id="table-cols" type="number" min="1" max="20" value={tableCols} onChange={(e) => setTableCols(parseInt(e.target.value) || 1)} className="re-modal-input-number" />
                  </div>
                </div>
                <div className="re-modal-actions">
                  <button className="re-btn ghost" onClick={() => setActiveModal(null)}>Cancel</button>
                  <button className="re-btn azure" onClick={insertTable}>Insert</button>
                </div>
              </>
            )}

            {activeModal === 'panel' && (
              <>
                <div className="re-modal-title">Insert Info Panel</div>
                <input className="re-modal-input" placeholder="Title" value={panelTitle} onChange={(e) => setPanelTitle(e.target.value)} autoFocus />
                <textarea className="re-modal-textarea" placeholder="Content" value={panelContent} onChange={(e) => setPanelContent(e.target.value)} />
                <div className="re-modal-actions">
                  <button className="re-btn ghost" onClick={() => setActiveModal(null)}>Cancel</button>
                  <button className="re-btn azure" onClick={insertPanel}>Insert</button>
                </div>
              </>
            )}

            {activeModal === 'image' && (
              <>
                <div className="re-modal-title">Insert Image</div>
                <input className="re-modal-input" placeholder="Image URL (https://...)" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} autoFocus />
                <input className="re-modal-input" placeholder="Alt text (for accessibility)" value={imageAlt} onChange={(e) => setImageAlt(e.target.value)} />
                {imageUrl && (
                  <div className="re-modal-preview">
                    <img src={imageUrl} alt={imageAlt || 'Preview'} onError={() => {}} className="re-modal-preview-img" />
                  </div>
                )}
                <div className="re-modal-actions">
                  <button className="re-btn ghost" onClick={() => setActiveModal(null)}>Cancel</button>
                  <button className="re-btn azure" onClick={insertImage}>Insert</button>
                </div>
              </>
            )}

            {activeModal === 'mention' && (
              <>
                <div className="re-modal-title">Mention Team Member</div>
                <input className="re-modal-input" placeholder="Enter username (e.g., john.smith)" value={mentionHandle} onChange={(e) => setMentionHandle(e.target.value)} autoFocus />
                <div className="re-modal-info">Enter the username of the team member you want to mention</div>
                <div className="re-modal-actions">
                  <button className="re-btn ghost" onClick={() => setActiveModal(null)}>Cancel</button>
                  <button className="re-btn azure" onClick={insertMention}>Mention @User</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Color Picker - Text Color */}
      {openPicker === 'text' && (
        <div
          ref={pickerWrapRef}
          className={`re-picker-wrapper re-picker-fixed ${pickerPos?.placement === 'above' ? 'place-above' : 'place-below'}`}
        >
          <div className="re-picker">
            <div className="re-picker-grid">
              {Object.entries(textColorClassByValue).map(([color, swatchClass]) => (
                <button
                  key={color}
                  className={`re-swatch ${swatchClass}`}
                  onClick={() => applyTextColor(color)}
                  title={color}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Color Picker - Highlight Color */}
      {openPicker === 'background' && (
        <div
          ref={pickerWrapRef}
          className={`re-picker-wrapper re-picker-fixed ${pickerPos?.placement === 'above' ? 'place-above' : 'place-below'}`}
        >
          <div className="re-picker">
            <div className="re-picker-grid">
              <button className="re-swatch re-swatch-clear" onClick={() => applyHighlight('transparent')} title="Clear highlight" />
              {Object.entries(highlightClassByValue).map(([color, swatchClass]) => (
                <button
                  key={color}
                  className={`re-swatch ${swatchClass}`}
                  onClick={() => applyHighlight(color)}
                  title={color}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Emoji Picker */}
      {openPicker === 'emoji' && (
        <div
          ref={pickerWrapRef}
          className={`re-picker-wrapper re-picker-fixed ${pickerPos?.placement === 'above' ? 'place-above' : 'place-below'}`}
        >
          <div className="re-emoji-picker">
            <div className="re-emoji-grid">
              {emojiList.map((emoji) => (
                <button
                  key={emoji}
                  className="re-emoji-btn"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => insertEmoji(emoji)}
                  title={emoji}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
