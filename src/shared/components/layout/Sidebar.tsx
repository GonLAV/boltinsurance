import React from 'react';
import { NavLink } from 'react-router-dom';

type Props = {
  collapsed?: boolean;
  setCollapsed?: (c: boolean) => void;
  darkMode?: boolean;
  setDarkMode?: (d: boolean) => void;
  projectName?: string;
  onLogout?: () => void;
};

const Sidebar: React.FC<Props> = ({ collapsed, setCollapsed, darkMode, setDarkMode, projectName, onLogout }) => {
  const project = projectName || localStorage.getItem('boltest:project') || 'Project Name';

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`} id="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo"><span className="sidebar-logo-icon">🧪</span> <span className="sidebar-logo-text">BOLTEST</span></div>
        <div className="sidebar-project"><span>📁</span> <span id="sidebarProject">{project}</span></div>
      </div>

      <nav className="sidebar-nav">
        <NavLink to="/app/dashboard" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}><span className="nav-item-icon">📊</span> <span>Dashboard</span></NavLink>
        <NavLink to="/app/user-stories" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}><span className="nav-item-icon">👤</span> <span>My User Stories</span></NavLink>
        <NavLink to="/app/team-tests" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}><span className="nav-item-icon">👥</span> <span>Team Tests</span></NavLink>
        <NavLink to="/app/create" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}><span className="nav-item-icon">➕</span> <span>Create Test Case</span></NavLink>
        <NavLink to="/app/work-item" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}><span className="nav-item-icon">📌</span> <span>Create Work Item</span></NavLink>
        <NavLink to="/app/test-plans" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}><span className="nav-item-icon">📑</span> <span>Test Plans</span></NavLink>
        <NavLink to="/app/shared-parameters" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}><span className="nav-item-icon">⚙️</span> <span>Shared Parameters</span></NavLink>
        <NavLink to="/app/api" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}><span className="nav-item-icon">⚡</span> <span>GETit</span></NavLink>
      </nav>

      <div className="sidebar-footer">
        <div className="settings-row"><span className="settings-label">🌙 Dark Mode</span>
          <div className={`toggle-switch ${darkMode ? 'active' : ''}`} onClick={() => setDarkMode && setDarkMode(!darkMode)}></div>
        </div>
        <button className="btn-logout" onClick={() => onLogout && onLogout()}> <span>🚪</span> <span>Logout</span> </button>
      </div>
    </aside>
  );
};

export default Sidebar;
