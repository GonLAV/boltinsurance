import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { testCaseApi } from '../../testCases/testCase.api';
import './TeamTestsView.css';

interface TestCase {
  id: number;
  title: string;
  state: string;
  assignedTo: string;
  createdBy?: string;
  createdDate?: string;
  stepsCount?: number;
  url?: string;
  tags?: string | string[];
}

const TeamTestsView: React.FC = () => {
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterState, setFilterState] = useState<string>('');
  const [tagFilter, setTagFilter] = useState<string>('');

  useEffect(() => {
    const fetchTestCases = async () => {
      try {
        setLoading(true);
        const resp = await testCaseApi.getTestCases();
        
        if (resp?.data?.success && resp.data.data?.testCases) {
          setTestCases(resp.data.data.testCases);
          toast.success(`Loaded ${resp.data.data.testCases.length} test cases`);
        } else {
          setTestCases([]);
        }
      } catch (err: any) {
        console.error('Error fetching test cases:', err);
        toast.error('Failed to load test cases');
        setTestCases([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTestCases();
  }, []);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    testCases.forEach((tc) => {
      const t = tc.tags;
      const list = Array.isArray(t)
        ? t
        : (t || '')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
      list.forEach((x) => set.add(x));
    });
    return Array.from(set).sort();
  }, [testCases]);

  const filtered = testCases.filter((tc) => {
    const matchSearch = search.trim()
      ? tc.title.toLowerCase().includes(search.toLowerCase()) || tc.id.toString().includes(search)
      : true;
    const matchState = filterState ? tc.state === filterState : true;
    const list = Array.isArray(tc.tags)
      ? tc.tags
      : (tc.tags || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
    const matchTag = tagFilter ? list.includes(tagFilter) : true;
    return matchSearch && matchState && matchTag;
  });

  const handleEditTest = (testCaseId: number) => {
    window.location.href = `/app/edit-test/${testCaseId}`;
  };

  const handleCopyTest = async (testCaseId: number) => {
    try {
      const resp = await testCaseApi.cloneTestCase(testCaseId);
      if (resp?.data?.success) {
        const newId = resp?.data?.data?.id;
        toast.success(`✅ Copied test case #${testCaseId} → #${newId}`);
        if (newId) {
          window.location.href = `/app/edit-test/${newId}`;
        }
      } else {
        toast.error(resp?.data?.message || 'Failed to copy test case');
      }
    } catch (err: any) {
      console.error('Copy failed', err);
      toast.error(err?.response?.data?.message || 'Failed to copy test case');
    }
  };

  return (
    <div className="page-card tc-shell tc-wide tt-root" id="teamTestsView">
      <div className="tt-header">
        <h2 className="tt-title">
          🧪 My Test Case
        </h2>
        <p className="tt-subtitle">
          {search || filterState ? (
            <>
              Found <span className="tt-accent">{filtered.length}</span> of{' '}
              <span className="tt-strong">{testCases.length}</span> test cases
              {search && ` matching "${search}"`}
              {filterState && ` with state "${filterState}"`}
            </>
          ) : (
            <>
              Total: <span className="tt-accent">{testCases.length}</span> test cases
            </>
          )}
        </p>
      </div>

      {/* Filters */}
      <div className="tt-filters">
        <div className="tt-search-wrap">
          <input
            type="text"
            placeholder="🔍 Search by title or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="tt-search-input"
          />
          <span className="tt-search-icon">
            🔍
          </span>
          {search && (
            <button
              onClick={() => setSearch('')}
              className="tt-clear-btn"
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        <select
          value={filterState}
          onChange={(e) => setFilterState(e.target.value)}
          className="tt-state-select"
          aria-label="Filter by state"
        >
          <option value="">All States</option>
          <option value="Design">Design</option>
          <option value="Ready">Ready</option>
          <option value="Active">Active</option>
          <option value="Closed">Closed</option>
        </select>

        <select
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
          className="tt-state-select"
          aria-label="Filter by tag"
        >
          <option value="">All Tags</option>
          {allTags.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        {(search || filterState) && (
          <button
            onClick={() => {
              setSearch('');
              setFilterState('');
            }}
            className="tt-reset-btn"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="tt-state-text">
          Loading test cases...
        </div>
      )}

      {/* Test Cases Grid */}
      {!loading && filtered.length === 0 && (
        <div className="tt-state-text">
          No test cases found
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="tt-grid">
          {filtered.map((tc) => (
            <div
              key={tc.id}
              className="tt-card"
            >
              {/* Header */}
              <div className="tt-card-header">
                <div>
                  <h4 className="tt-card-id">
                    #{tc.id}
                  </h4>
                  <p className="tt-card-title">
                    {tc.title}
                  </p>
                </div>
                <span
                  className={`tt-state-badge ${tc.state === 'Design' ? 'design' : tc.state === 'Ready' ? 'ready' : 'other'}`}
                >
                  {tc.state}
                </span>
              </div>

              {/* Meta */}
              <div className="tt-meta">
                <div>👤 {tc.assignedTo || 'Unassigned'}</div>
                {tc.stepsCount && <div>📋 {tc.stepsCount} steps</div>}
                {tc.createdDate && <div>📅 {new Date(tc.createdDate).toLocaleDateString()}</div>}
              </div>

              {/* Tags */}
              {(() => {
                const list = Array.isArray(tc.tags)
                  ? tc.tags
                  : (tc.tags || '')
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean);
                return list.length ? (
                  <div className="tt-tags">
                    {list.map((tag) => (
                      <span key={tag} className="tt-tag-badge">#{tag}</span>
                    ))}
                  </div>
                ) : null;
              })()}

              {/* Actions */}
              <div className="tt-actions">
                <button
                  onClick={() => handleEditTest(tc.id)}
                  className="tt-edit-btn"
                >
                  ✏️ Edit
                </button>
                <button
                  onClick={() => handleCopyTest(tc.id)}
                  className="tt-copy-btn"
                >
                  📄 Copy
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TeamTestsView;
