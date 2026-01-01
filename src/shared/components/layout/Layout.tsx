import React, { useEffect, useRef, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Suspense } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

const Layout: React.FC = () => {
  const [darkMode, setDarkMode] = useState<boolean>(() => localStorage.getItem('darkMode') === 'enabled');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => localStorage.getItem('sidebarCollapsed') === 'true');
  const [projectName, setProjectName] = useState<string>(() => localStorage.getItem('boltest:project') || 'Project Name');
  const [toolbarState, setToolbarState] = useState<{ visible: boolean; x: number; y: number }>({ visible: false, x: 0, y: 0 });
  const [toastMessage, setToastMessage] = useState<string>('');
  const activeBoxRef = useRef<HTMLElement | null>(null);
  const toastTimer = useRef<NodeJS.Timeout | null>(null);
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    document.body.classList.toggle('dark-mode', darkMode);
    localStorage.setItem('darkMode', darkMode ? 'enabled' : 'disabled');
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', sidebarCollapsed ? 'true' : 'false');
  }, [sidebarCollapsed]);

  useEffect(() => {
    const saved = localStorage.getItem('boltest:project');
    if (saved) setProjectName(saved);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMessage(''), 2200);
  };

  const positionToolbar = (target: HTMLElement) => {
    const rect = target.getBoundingClientRect();
    const width = 320;
    const viewportWidth = document.documentElement.clientWidth;
    let left = window.scrollX + rect.left + 8;
    if (left + width > viewportWidth - 10) left = viewportWidth - width - 10;
    const top = window.scrollY + rect.bottom + 8;
    setToolbarState({ visible: true, x: left, y: top });
  };

  useEffect(() => {
    const handleClick = (ev: MouseEvent) => {
      const target = ev.target as HTMLElement | null;
      const toolbar = document.getElementById('ctx-toolbar');
      const hitToolbar = toolbar && toolbar.contains(target);
      const box = target?.closest('.step-rich') as HTMLElement | null;

      if (box) {
        activeBoxRef.current = box;
        positionToolbar(box);
      } else if (!hitToolbar) {
        activeBoxRef.current = null;
        setToolbarState((s) => ({ ...s, visible: false }));
      }
    };

    const handleResizeScroll = () => {
      if (toolbarState.visible && activeBoxRef.current) positionToolbar(activeBoxRef.current);
    };

    document.addEventListener('click', handleClick);
    window.addEventListener('resize', handleResizeScroll);
    document.addEventListener('scroll', handleResizeScroll, true);
    return () => {
      document.removeEventListener('click', handleClick);
      window.removeEventListener('resize', handleResizeScroll);
      document.removeEventListener('scroll', handleResizeScroll, true);
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, [toolbarState.visible]);

  useEffect(() => {
    const el = toolbarRef.current;
    if (!el) return;
    el.style.left = `${toolbarState.x}px`;
    el.style.top = `${toolbarState.y}px`;
    el.style.display = toolbarState.visible ? 'flex' : 'none';
  }, [toolbarState]);

  const activeText = () => activeBoxRef.current?.innerText?.trim() || '';

  const handleCopy = async () => {
    const text = activeText();
    if (!text) return;
    await navigator.clipboard.writeText(text);
    showToast('Copied');
  };

  const handleTranslate = async () => {
    const text = activeText();
    if (!text) return showToast('Nothing to translate');
    try {
      const res = await fetch('/api/translate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, to: 'en' }) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (activeBoxRef.current) activeBoxRef.current.innerText = data.translated;
      showToast('Translated to English');
    } catch (err: any) {
      showToast(err.message || 'Translate failed');
    }
  };

  const handleSpeak = async () => {
    const text = activeText();
    if (!text) return showToast('Nothing to speak');
    try {
      const res = await fetch('/api/speak', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
      if (!res.ok) throw new Error(`Speech failed (${res.status})`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => URL.revokeObjectURL(url);
      await audio.play();
      showToast('Speaking…');
    } catch (err: any) {
      showToast(err.message || 'Speech failed');
    }
  };

  const handleAgent = async () => {
    const text = activeText();
    if (!text) return showToast('Nothing to send');
    try {
      const res = await fetch('/api/agent/sendMessage', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (activeBoxRef.current) activeBoxRef.current.innerText = `${text}\n\n---\nAgent: ${data.reply}`;
      showToast('Agent replied');
    } catch (err: any) {
      showToast(err.message || 'Agent failed');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('boltest:project');
    navigate('/');
  };

  return (
    <div id="appLayout" className={projectName ? 'active' : ''}>
      <Sidebar
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        projectName={projectName}
        onLogout={handleLogout}
      />
      <main className="main-content">
        <Header
          onToggleMenu={() => setSidebarCollapsed((s) => !s)}
          onToggleHeader={() => {
            /* placeholder */
          }}
        />
        <div id="contentArea">
          <Suspense fallback={<div className="loading-fallback">Loading…</div>}>
            <Outlet />
          </Suspense>
        </div>
        <div id="ctx-toolbar" className="ctx-toolbar" ref={toolbarRef}>
          <button className="ctx-btn" onClick={handleTranslate}>Translate → EN</button>
          <button className="ctx-btn" onClick={handleSpeak}>Speak</button>
          <button className="ctx-btn ctx-btn-primary" onClick={handleAgent}>Send to Agent</button>
          <button className="ctx-btn" onClick={handleCopy}>Copy</button>
        </div>
        <div id="ctx-toast" className={`ctx-toast ${toastMessage ? 'show' : ''}`}>{toastMessage}</div>
      </main>
    </div>
  );
};

export default Layout;
