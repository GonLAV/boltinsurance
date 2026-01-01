import React, { useEffect, useMemo, useState, useRef, useCallback, useDeferredValue } from 'react';
import './UserStoriesView.css';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { storiesApi, UserStory } from '../stories.api';

// ⚡ PERFORMANCE: Progressive loading skeleton
const ProgressiveSkeleton: React.FC = () => (
  <div className="skeleton-loader">
    {Array.from({ length: 3 }).map((_, i) => (
      <div key={i} className="story-item">
        <div className="skeleton-line skeleton-id"></div>
        <div className="skeleton-line skeleton-title"></div>
        <div className="skeleton-line skeleton-meta"></div>
      </div>
    ))}
  </div>
);

// ⚡ PERFORMANCE: Enhanced skeleton loader with progress indicator
const SkeletonLoader: React.FC<{ count?: number }> = ({ count = 8 }) => (
  <div>
    <div className="loading-header">
      <div className="spinner"></div>
      <div className="loading-text">
        <div className="loading-title">Loading Your Stories...</div>
        <div className="loading-subtitle">Fetching from Azure DevOps</div>
      </div>
    </div>
    <div className="stories-list">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="story-item skeleton-loader">
          <div className="skeleton-line skeleton-id"></div>
          <div className="skeleton-line skeleton-title"></div>
          <div className="skeleton-line skeleton-meta"></div>
        </div>
      ))}
    </div>
  </div>
);

// ⚡ PERFORMANCE: Memoized story item to prevent unnecessary re-renders
const StoryItemMemo: React.FC<{ story: UserStory; onClick: () => void }> = React.memo(
  ({ story, onClick }) => (
    <div className="story-item" onClick={onClick}>
      <div className="story-id">{story.id}</div>
      <div className="story-title">{story.title}</div>
      <div className="story-meta">
        <span>{story.state}</span> | <span>{(story as any).relatedTestCases?.length ? '✓ Has Tests' : '✗ No Tests'}</span>
      </div>
    </div>
  ),
  (prev, next) => prev.story.id === next.story.id && (prev.story as any).relatedTestCases?.length === (next.story as any).relatedTestCases?.length
);

const UserStoriesView: React.FC = () => {
  const navigate = useNavigate();
  const [allStories, setAllStories] = useState<UserStory[]>([]);
  const [storiesNoTests, setStoriesNoTests] = useState<UserStory[]>([]);
  const [storiesWithTests, setStoriesWithTests] = useState<UserStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filter, setFilter] = useState<'all' | 'hasTests' | 'noTests'>('all');
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [areaPath, setAreaPath] = useState(
    localStorage.getItem('boltest:areaPath') || "Epos\\RnD\\Abigail's Team"
  );
  const [sprint, setSprint] = useState<string>(localStorage.getItem('boltest:sprint') || 'Current');
  const sprintOptions = useMemo(() => [
    'Current', '2602', '2601', '2600', '2516', '2515', '2514', '2513', '2512', '2511'
  ], []);
  const didInitFetch = useRef(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const fetchUserStories = useCallback(async () => {
    try {
      setLoading(true);
      setLoadingMore(false);
      const effectiveOrgUrl = (localStorage.getItem('boltest:orgUrl') || '').trim();
      const effectiveProject = (localStorage.getItem('boltest:project') || 'Epos').trim();
      const effectiveAreaPath = areaPath.trim();
      const selectedSprint = (localStorage.getItem('boltest:sprint') || sprint || '').trim();

      if (effectiveOrgUrl) localStorage.setItem('boltest:orgUrl', effectiveOrgUrl);
      if (effectiveProject) localStorage.setItem('boltest:project', effectiveProject);
      if (effectiveAreaPath) localStorage.setItem('boltest:areaPath', effectiveAreaPath);
      if (selectedSprint) localStorage.setItem('boltest:sprint', selectedSprint);

      const iterationPath = selectedSprint && selectedSprint !== 'Current'
        ? `${effectiveProject}\\${selectedSprint}`
        : '@CurrentIteration';

      // ⚡ Progressive load: fetch all but display immediately
      const resp = await storiesApi.getUserStories(
        effectiveOrgUrl, 
        effectiveProject, 
        effectiveAreaPath || undefined,
        iterationPath
      );
      const userStories: UserStory[] = resp?.data?.data?.userStories || [];
      
      // Process and cache immediately
      setAllStories(userStories);
      const withTestsList = userStories.filter((story: UserStory) => (story.relatedTestCases || []).length > 0);
      const noTestsList = userStories.filter((story: UserStory) => (story.relatedTestCases || []).length === 0);
      setStoriesWithTests(withTestsList);
      setStoriesNoTests(noTestsList);

      if (userStories.length === 0) {
        toast.warning(`No stories found for area path: ${effectiveAreaPath || '(all)'}`);
      } else {
        toast.success(`✓ Loaded ${userStories.length} stories`);
      }
    } catch (err: any) {
      console.error('Error fetching user stories:', err);
      const apiError = err?.response?.data?.error || err?.response?.data?.message || err?.message;
      toast.error(apiError ? String(apiError) : 'Error loading user stories');
      setAllStories([]);
      setStoriesNoTests([]);
      setStoriesWithTests([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [areaPath, sprint]);

  // Fetch on mount once
  useEffect(() => {
    if (didInitFetch.current) return;
    didInitFetch.current = true;
    fetchUserStories();
  }, [fetchUserStories]);

  // Get the appropriate stories list based on current filter
  const stories = useMemo(() => {
    switch (filter) {
      case 'noTests':
        return storiesNoTests;
      case 'hasTests':
        return storiesWithTests;
      default:
        return allStories;
    }
  }, [filter, allStories, storiesNoTests, storiesWithTests]);

  const filtered = useMemo(() => {
    return stories.filter((story) => {
      const q = deferredSearch.trim().toLowerCase();
      const matchSearch = q
        ? story.title.toLowerCase().includes(q) || story.id.toString().includes(q)
        : true;
      return matchSearch;
    });
  }, [deferredSearch, stories]);

  const handleAddTest = (storyId: number, storyTitle: string) => {
    // Navigate to create test case with pre-filled user story (state keeps form data intact)
    navigate('/app/create', { state: { userStoryId: storyId, userStoryTitle: storyTitle } });
  };

  const handleViewTests = (testCases: any[], storyId: number) => {
    const tests = (testCases || []).filter((tc) => tc && tc.id);
    if (!tests.length) {
      toast.info(`No tests linked to story ${storyId} yet.`);
      return;
    }

    if (tests.length > 1) {
      toast.info(`Opening first of ${tests.length} tests for story ${storyId}.`);
    }

    navigate(`/app/edit-test/${tests[0].id}`);
  };

  if (loading) {
    return (
      <div className="page-card tc-shell tc-wide" id="myStoriesView">
        <SkeletonLoader count={8} />
      </div>
    );
  }

  return (
    <div className="page-card tc-shell tc-wide" id="myStoriesView">
      <div className="filter-bar">
        <input
          type="text"
          className="search-box area-path-box"
          placeholder="Area path (e.g. Epos\\RnD\\Team)"
          value={areaPath}
          onChange={(e) => setAreaPath(e.target.value)}
        />
        <select
          className="search-box sprint-selector"
          value={sprint}
          onChange={(e) => setSprint(e.target.value)}
          aria-label="Select sprint iteration"
        >
          {sprintOptions.map((opt) => (
            <option key={opt} value={opt}>
              {opt === 'Current' ? 'Current Iteration' : `Sprint ${opt}`}
            </option>
          ))}
        </select>
        <button className="filter-btn" onClick={fetchUserStories}>
          <span>🔁</span> <span>Refresh</span>
        </button>
        <button 
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`} 
          onClick={() => setFilter('all')}
        >
          <span>📋</span> <span>All ({allStories.length})</span>
        </button>
        <button 
          className={`filter-btn ${filter === 'noTests' ? 'active' : ''}`} 
          onClick={() => setFilter('noTests')}
        >
          <span>❌</span> <span>No Tests ({storiesNoTests.length})</span>
        </button>
        <button 
          className={`filter-btn ${filter === 'hasTests' ? 'active' : ''}`} 
          onClick={() => setFilter('hasTests')}
        >
          <span>✅</span> <span>Has Tests ({storiesWithTests.length})</span>
        </button>
        <input
          type="text"
          className="search-box"
          placeholder="🔍 Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="user-stories-grid" id="storiesGrid">
        {filtered.length === 0 ? (
          <div className="empty-full"><p>No user stories found</p></div>
        ) : (
          filtered.map((story) => {
            const tests = (story.relatedTestCases || []).filter((tc) => tc && tc.id);
            const hasTests = tests.length > 0;
            const testCount = tests.length;
            return (
              <div
                key={story.id}
                className={`story-card ${hasTests ? 'has-tests' : 'no-tests'}`}
                data-has-tests={hasTests}
              >
                <div className="story-header">
                  <span className="story-badge">#{story.id}</span>
                  <span className="story-badge">{story.state}</span>
                </div>

                <h3 className="story-title">{story.title}</h3>

                <div className="story-meta">
                  {story.assignedTo ? <span className="story-badge">👤 {story.assignedTo}</span> : null}
                  {story.areaPath ? <span className="story-badge">📁 {story.areaPath}</span> : null}
                  <span className="story-badge">{hasTests ? `✅ ${testCount} tests` : '❌ 0 tests'}</span>
                </div>

                <div className="story-actions">
                  <button
                    className="btn-story-action"
                    onClick={() => handleAddTest(story.id, story.title)}
                  >
                    ➕ Add Test
                  </button>
                  {hasTests ? (
                    <button
                      className="btn-story-action"
                      onClick={() => handleViewTests(tests, story.id)}
                    >
                      👁️ View {testCount} Tests
                    </button>
                  ) : null}
                </div>
                {hasTests && (
                  <div className="story-tests">
                    {tests.map((tc) => (
                      <button
                        key={tc.id}
                        className="btn-story-action"
                        onClick={() => navigate(`/app/edit-test/${tc.id}`)}
                      >
                        ✏️ {tc.title || `Test #${tc.id}`}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default UserStoriesView;
