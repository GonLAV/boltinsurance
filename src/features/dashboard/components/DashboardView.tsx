import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { MyTaskItem, storiesApi } from '../../stories/stories.api';
import './DashboardView.css';

// ⚡ PERFORMANCE: Memoized task item component to prevent re-renders
const TaskItemMemo: React.FC<{ task: MyTaskItem; onClick: (task: MyTaskItem) => void }> = React.memo(
  ({ task, onClick }) => (
    <div key={task.id} className="task-item" onClick={() => onClick(task)}>
      <div className="task-header">
        <span className="task-id">{task.id}</span>
        <span className={`task-state state-${task.state.toLowerCase()}`}>{task.state}</span>
      </div>
      <div className="task-title">{task.title}</div>
      {task.bugs && task.bugs.length > 0 && (
        <div className="child-bugs">
          <strong>Bugs ({task.bugs.length}):</strong>
          {task.bugs.map((bug) => (
            <div key={bug.id} className="bug-item">
              #{bug.id}: {bug.title}
            </div>
          ))}
        </div>
      )}
    </div>
  ),
  (prev, next) => prev.task.id === next.task.id && prev.task.state === next.task.state
);

const DashboardView: React.FC = () => {
  const [tasks, setTasks] = useState<MyTaskItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [areaPath, setAreaPath] = useState(
    localStorage.getItem('boltest:areaPath') || "Epos\\RnD\\Abigail's Team"
  );
  const teams = useMemo(() => [
    "Epos\\RnD\\Abigail's Team",
    'Epos\\RnD\\Keren\'s Team',
    'Epos\\RnD\\Pavlo\'s Team',
    'Epos\\RnD\\Rina\'s Team',
    'Epos\\RnD\\Dmytro\'s Team',
    'Epos\\Professional Services',
    'Epos\\Product Teams',
    'Epos\\Infrastructure & Support'
  ], []);
  const [sprint, setSprint] = useState<string>(localStorage.getItem('boltest:sprint') || 'Current');
  const sprintOptions = useMemo(() => [
    'Current', 'Sprint 2601', 'Sprint 2600', 'Sprint 2516', 'Sprint 2515', 'Sprint 2514', 'Sprint 2513', 'Sprint 2512', 'Sprint 2511'
  ], []);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>(['New', 'Active', 'Closed']);
  const [bugFilter, setBugFilter] = useState<'all' | 'with-bugs' | 'without-bugs'>('all');

  const loadMyTasks = useCallback(async () => {
    try {
      setLoading(true);
      const effectiveAreaPath = areaPath.trim();
      if (effectiveAreaPath) localStorage.setItem('boltest:areaPath', effectiveAreaPath);

      const orgUrl = (localStorage.getItem('boltest:orgUrl') || '').trim();
      const project = (localStorage.getItem('boltest:project') || 'Epos').trim();

      const selectedSprint = (localStorage.getItem('boltest:sprint') || sprint || '').trim();
      const iterationPath = selectedSprint && selectedSprint !== 'Current' && effectiveAreaPath
        ? `${effectiveAreaPath}\\${selectedSprint}`
        : undefined;

      const resp = await storiesApi.getMyTasksWithChildBugs(
        orgUrl,
        project,
        effectiveAreaPath || undefined,
        iterationPath
      );
      const serverTasks: MyTaskItem[] = resp?.data?.data?.tasks || [];
      setTasks(serverTasks);
      toast.success(`Loaded ${serverTasks.length} tasks for @Me`);
    } catch (err: any) {
      console.error('mytasks fetch failed', err);
      toast.error('Failed to load my tasks');
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [areaPath, sprint]);

  useEffect(() => {
    loadMyTasks();
  }, [loadMyTasks]);

  const filteredTasks = useMemo(() => {
    let result = tasks.filter((t) => {
      // Status filter
      if (!statusFilter.includes(t.state)) return false;
      // Bug filter
      const hasBugs = (t.bugs || []).length > 0;
      if (bugFilter === 'with-bugs' && !hasBugs) return false;
      if (bugFilter === 'without-bugs' && hasBugs) return false;
      return true;
    });
    // Search filter
    const q = search.trim().toLowerCase();
    if (!q) return result;
    return result.filter((t) => {
      const bugHit = (t.bugs || []).some((b) =>
        (b.title || '').toLowerCase().includes(q) || (b.id ? b.id.toString().includes(q) : false)
      );
      return (
        (t.title || '').toLowerCase().includes(q) ||
        t.id.toString().includes(q) ||
        ((t.assignedTo?.displayName || t.assignedTo || '') + '').toLowerCase().includes(q) ||
        bugHit
      );
    });
  }, [search, tasks, statusFilter, bugFilter]);

  const headline = useMemo(() => {
    const bugCount = tasks.reduce((acc, t) => acc + ((t.bugs || []).length || 0), 0);
    return `Found ${tasks.length} tasks · ${bugCount} child bugs`;
  }, [tasks]);

  return (
    <div className="page-card tc-shell tc-wide" id="dashboardView">
      <div className="filter-bar">
        <select
          value={areaPath}
          onChange={(e) => {
            setAreaPath(e.target.value);
            localStorage.setItem('boltest:areaPath', e.target.value);
          }}
          className="search-box dash-area-input"
          title="Team"
        >
          {teams.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
          <option value="">(Custom… type below)</option>
        </select>
        <input
          type="text"
          placeholder="Area path (optional filter)"
          value={areaPath}
          onChange={(e) => setAreaPath(e.target.value)}
          className="search-box dash-area-input"
        />
        <button className="filter-btn" onClick={loadMyTasks} disabled={loading}>
          <span>{loading ? '⏳' : '🔁'}</span> <span>Refresh My Tasks</span>
        </button>
        <select
          value={sprint}
          onChange={(e) => {
            setSprint(e.target.value);
            localStorage.setItem('boltest:sprint', e.target.value);
          }}
          className="search-box"
          title="Sprint"
        >
          {sprintOptions.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <input
          type="text"
          className="search-box"
          placeholder="🔍 Search tasks, bugs, or owner"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="filter-bar dash-mt-8">
        <div className="dash-filter-group">
          <label className="dash-filter-label">Status:</label>
          {['New', 'Active', 'Closed'].map((status) => (
            <label key={status} className="dash-checkbox-label">
              <input
                type="checkbox"
                checked={statusFilter.includes(status)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setStatusFilter([...statusFilter, status]);
                  } else {
                    setStatusFilter(statusFilter.filter((s) => s !== status));
                  }
                }}
              />
              {status}
            </label>
          ))}
        </div>
        <div className="dash-filter-group">
          <label className="dash-filter-label">Bugs:</label>
          {['All', 'With Bugs', 'Without Bugs'].map((option, idx) => {
            const value = idx === 0 ? 'all' : idx === 1 ? 'with-bugs' : 'without-bugs';
            return (
              <label key={value} className="dash-radio-label">
                <input
                  type="radio"
                  name="bugFilter"
                  checked={bugFilter === value}
                  onChange={() => setBugFilter(value as any)}
                />
                {option}
              </label>
            );
          })}
        </div>
      </div>

      <div className="recent-section dash-mt-16">
        <div className="section-title dash-section-title-row">
          <span>📌 My Tasks (Assigned to Me)</span>
          <span className="dash-headline">{headline}</span>
        </div>
        {loading ? (
          <div className="dash-loading">Loading...</div>
        ) : (
          <div className="user-stories-grid" id="dashboardTasksGrid">
            {filteredTasks.length === 0 ? (
              <div className="dash-empty">
                <p>No tasks match your filter</p>
              </div>
            ) : (
              filteredTasks.map((task) => (
                <div key={task.id} className="story-card">
                  <div className="story-header">
                    <span className="story-id">{task.id}</span>
                    <span className="story-badge">{task.state}</span>
                  </div>
                  <h3 className="story-title">{task.title}</h3>
                  <div className="story-meta">
                    <span className="story-badge">👤 <span>{(task as any).assignedTo?.displayName || (task as any).assignedTo || 'Unassigned'}</span></span>
                    <span className="story-badge">🐞 <span>{(task.bugs || []).length} bugs</span></span>
                  </div>

                  {(task.bugs || []).length > 0 && (
                    <div className="dash-child-group">
                      <div className="dash-child-title">Child Bugs</div>
                      <div className="dash-child-list">
                        {(task.bugs || []).map((b: any) => (
                          <div key={b.id} className="dash-child-row">
                            <span className="story-badge">{b.id}</span>
                            <span className="dash-child-text">{b.title}</span>
                            <span className="story-badge">{b.state}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ⚡ PERFORMANCE: Memoize the entire component to prevent unnecessary re-renders
export default React.memo(DashboardView);
