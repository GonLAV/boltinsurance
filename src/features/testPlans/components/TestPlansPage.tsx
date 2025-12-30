import React, { useEffect, useMemo, useState } from 'react';
import { testPlansApi, TestPlan, TestSuite, SuiteEntry, TestPoint } from '../testPlans.api';
import { testSuitesApi } from '../../testSuites/testSuites.api';
import './TestPlansPage.css';

type LocalTestCase = {
  id: string;
  title: string;
  assignedTo?: string;
  priority: 'High' | 'Medium' | 'Low';
  status: 'Ready' | 'Active' | 'Passed' | 'Failed' | 'NotRun';
  parentSuiteId: number | null;
  order: number;
};

const buildTree = (suites: TestSuite[]): TestSuite[] => {
  const byId = new Map<number, TestSuite>();
  suites.forEach((s) => byId.set(s.id, { ...s, children: [] }));

  const roots: TestSuite[] = [];
  suites.forEach((suite) => {
    const parentId = suite.parentSuite?.id;
    if (parentId && byId.has(parentId)) {
      byId.get(parentId)!.children!.push(byId.get(suite.id)!);
    } else {
      roots.push(byId.get(suite.id)!);
    }
  });

  return roots.length ? roots : suites.map((s) => ({ ...s, children: [] }));
};

const TestPlansPage: React.FC = () => {
  const [org, setOrg] = useState(localStorage.getItem('boltest:org') || '');
  const [project, setProject] = useState(localStorage.getItem('boltest:project') || '');
  const [backendKey, setBackendKey] = useState(localStorage.getItem('boltest:backendKey') || '');

  const [plans, setPlans] = useState<TestPlan[]>([]);
  const [suites, setSuites] = useState<TestSuite[]>([]);
  const [testCases, setTestCases] = useState<LocalTestCase[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [selectedSuiteId, setSelectedSuiteId] = useState<number | null>(null);
  const [expandedSuites, setExpandedSuites] = useState<Set<number>>(new Set());
  const [activeTab, setActiveTab] = useState<'define' | 'execute' | 'chart'>('define');
  const [searchTerm, setSearchTerm] = useState('');

  const [loadingPlans, setLoadingPlans] = useState(false);
  const [loadingSuites, setLoadingSuites] = useState(false);
  const [loadingCases, setLoadingCases] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [showSuiteModal, setShowSuiteModal] = useState(false);
  const [showCaseModal, setShowCaseModal] = useState(false);
  const [showAddExistingModal, setShowAddExistingModal] = useState(false);
  const [existingCaseIds, setExistingCaseIds] = useState('');
  const [addingExisting, setAddingExisting] = useState(false);

  // Execute tab state
  const [runName, setRunName] = useState(() => `Manual Run - ${new Date().toLocaleString()}`);
  const [activeRunId, setActiveRunId] = useState<number | null>(null);
  const [submittingResults, setSubmittingResults] = useState(false);
  const [outcomes, setOutcomes] = useState<Record<string, 'Passed' | 'Failed' | 'Blocked' | null>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [focusedCaseId, setFocusedCaseId] = useState<string | null>(null);
  const [pointByCase, setPointByCase] = useState<Record<string, { id: number; outcome?: string }>>({});
  const [showFailedOnly, setShowFailedOnly] = useState(false);

  const [suiteForm, setSuiteForm] = useState({ name: '', suiteType: 'static', parentId: '', description: '' });
  const [caseForm, setCaseForm] = useState({
    title: '',
    suiteId: '',
    priority: 'Medium',
    assignedTo: '',
    steps: '',
    description: ''
  });

  useEffect(() => {
    localStorage.setItem('boltest:org', org);
  }, [org]);

  useEffect(() => {
    localStorage.setItem('boltest:project', project);
  }, [project]);

  useEffect(() => {
    if (backendKey) {
      localStorage.setItem('boltest:backendKey', backendKey);
    } else {
      localStorage.removeItem('boltest:backendKey');
    }
  }, [backendKey]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(id);
  }, [toast]);

  const loadPlans = async () => {
    if (!org || !project) {
      setError('Organization URL and Project are required');
      return;
    }
    setError(null);
    setLoadingPlans(true);
    setPlans([]);
    setSuites([]);
    setTestCases([]);
    setSelectedPlanId(null);
    setSelectedSuiteId(null);
    setExpandedSuites(new Set());

    try {
      const res = await testPlansApi.getPlans({ org, project, backendKey: backendKey || undefined });
      const value = res.data?.data?.value || res.data?.data || res.data?.plans || [];
      setPlans(value);
      if (value.length) {
        const first = value[0];
        setSelectedPlanId(first.id);
        await loadSuites(first.id, { suppressPlanReset: true });
      }
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Failed to load test plans';
      setError(message);
    } finally {
      setLoadingPlans(false);
    }
  };

  const loadSuites = async (planId: number, opts?: { suppressPlanReset?: boolean }) => {
    if (!org || !project) {
      setError('Organization URL and Project are required');
      return;
    }
    setError(null);
    setLoadingSuites(true);
    setSuites([]);
    setExpandedSuites(new Set());
    if (!opts?.suppressPlanReset) {
      setSelectedPlanId(planId);
      setSelectedSuiteId(null);
    }

    try {
      const res = await testPlansApi.getSuites({ org, project, planId, backendKey: backendKey || undefined });
      const value = res.data?.data?.value || res.data?.data || res.data?.suites || [];
      setSuites(value);
      if (value.length) {
        const rootIds = value
          .filter((s: TestSuite) => !s.parentSuite?.id)
          .map((s: TestSuite) => s.id);
        setExpandedSuites(new Set(rootIds));
      }
      // If a suite is already selected, refresh its entries after suites load
      if (opts?.suppressPlanReset && selectedSuiteId) {
        await loadSuiteEntries(selectedSuiteId);
      }
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Failed to load test suites';
      setError(message);
    } finally {
      setLoadingSuites(false);
    }
  };

  const toggleSuite = (id: number) => {
    setExpandedSuites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectSuite = (id: number) => {
    setSelectedSuiteId(id);
    // Load entries for the selected suite
    loadSuiteEntries(id);
  };

  const loadSuiteEntries = async (suiteId: number) => {
    if (!org || !project) {
      setError('Organization URL and Project are required');
      return;
    }
    setLoadingCases(true);
    setError(null);
    try {
      const res = await testPlansApi.getSuiteEntries({
        org,
        project,
        suiteId,
        suiteEntryType: 'testCase',
        backendKey: backendKey || undefined
      });
      const entries: SuiteEntry[] = res.data?.data?.value || res.data?.data || res.data?.entries || [];
      const mapped: LocalTestCase[] = (entries || [])
        .map((e: SuiteEntry, idx: number) => {
          const testCaseId = e?.testCase?.id ?? e?.id;
          if (!testCaseId) return null;
          const title = (e?.testCase as any)?.name || `Test Case #${testCaseId}`;
          const order = e?.sequenceNumber || idx + 1;
          return {
            id: String(testCaseId),
            title,
            assignedTo: undefined,
            priority: 'Medium',
            status: 'Ready',
            parentSuiteId: suiteId,
            order
          } as LocalTestCase;
        })
        .filter(Boolean) as LocalTestCase[];
      setTestCases(mapped);
      // Fetch test points for this plan/suite to map case -> point and latest outcome
      if (selectedPlanId) {
        try {
          const tpRes = await testPlansApi.getTestPoints({
            org,
            project,
            planId: selectedPlanId,
            suiteId,
            includePointDetails: true,
            backendKey: backendKey || undefined
          });
          const points: TestPoint[] = tpRes.data?.data?.value || tpRes.data?.data || tpRes.data?.points || [];
          const map: Record<string, { id: number; outcome?: string }> = {};
          (points || []).forEach((p) => {
            const cId = p?.testCase?.id ? String(p.testCase.id) : undefined;
            if (!cId) return;
            if (!map[cId]) {
              map[cId] = { id: p.id, outcome: p.outcome };
            }
          });
          setPointByCase(map);
        } catch (tpErr: any) {
          setToast(tpErr?.response?.data?.message || 'Failed to load test points');
          setPointByCase({});
        }
      } else {
        setPointByCase({});
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load suite entries');
      setTestCases([]);
    } finally {
      setLoadingCases(false);
    }
  };

  const saveSuite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!suiteForm.name.trim()) {
      setToast('Suite name is required');
      return;
    }
    const newId = Number(Date.now());
    const parentId = suiteForm.parentId ? Number(suiteForm.parentId) : undefined;
    const parentSuite = parentId ? suites.find((s) => s.id === parentId) || null : null;
    const newSuite: TestSuite = {
      id: newId,
      name: suiteForm.name.trim(),
      suiteType: suiteForm.suiteType,
      parentSuite,
      children: []
    };
    setSuites((prev) => [...prev, newSuite]);
    setExpandedSuites((prev) => new Set([...Array.from(prev), parentId || newId].filter(Boolean) as number[]));
    setSuiteForm({ name: '', suiteType: 'static', parentId: '', description: '' });
    setShowSuiteModal(false);
    setToast('Test suite added locally');
  };

  const saveTestCase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseForm.title.trim() || !caseForm.suiteId) {
      setToast('Title and suite are required');
      return;
    }
    const suiteIdNum = Number(caseForm.suiteId);
    const nextOrder = testCases.filter((tc) => tc.parentSuiteId === suiteIdNum).length + 1;
    const newCase: LocalTestCase = {
      id: `TC-${Date.now()}`,
      title: caseForm.title.trim(),
      assignedTo: caseForm.assignedTo.trim() || undefined,
      priority: caseForm.priority as LocalTestCase['priority'],
      status: 'Ready',
      parentSuiteId: suiteIdNum,
      order: nextOrder
    };
    setTestCases((prev) => [...prev, newCase]);
    setCaseForm({ title: '', suiteId: '', priority: 'Medium', assignedTo: '', steps: '', description: '' });
    setShowCaseModal(false);
    setSelectedSuiteId((current) => current ?? suiteIdNum);
    setToast('Test case added locally');
  };

  const handleAddExistingCases = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlanId || !selectedSuiteId) {
      setToast('Please select a plan and suite first');
      return;
    }

    const ids = existingCaseIds
      .split(/[,\s]+/)
      .map((x) => Number(x.trim()))
      .filter((n) => !Number.isNaN(n) && n > 0);

    if (ids.length === 0) {
      setToast('Please enter at least one valid Test Case ID');
      return;
    }

    try {
      setAddingExisting(true);
      const res = await testSuitesApi.addCases({
        planId: selectedPlanId,
        suiteId: selectedSuiteId,
        testCaseIds: ids,
      });

      if (res.data?.success) {
        setToast(`Successfully added ${ids.length} test case(s)`);
        setExistingCaseIds('');
        setShowAddExistingModal(false);
        // Refresh suites to show updated counts
        await loadSuites(selectedPlanId, { suppressPlanReset: true });
      } else {
        setToast(res.data?.message || 'Failed to add test cases');
      }
    } catch (err: any) {
      setToast(err?.response?.data?.message || 'Error adding test cases');
    } finally {
      setAddingExisting(false);
    }
  };

  const suiteTree = useMemo(() => buildTree(suites), [suites]);
  const selectedSuite = useMemo(
    () => suites.find((s) => s.id === selectedSuiteId) || null,
    [suites, selectedSuiteId]
  );
  const selectedPlan = useMemo(
    () => plans.find((p) => p.id === selectedPlanId) || null,
    [plans, selectedPlanId]
  );

  const filteredCases = useMemo(() => {
    const pool = selectedSuiteId
      ? testCases.filter((tc) => tc.parentSuiteId === selectedSuiteId)
      : testCases;
    if (!searchTerm.trim()) return pool;
    const term = searchTerm.toLowerCase();
    return pool.filter((tc) => tc.title.toLowerCase().includes(term) || tc.id.toLowerCase().includes(term));
  }, [searchTerm, selectedSuiteId, testCases]);

  useEffect(() => {
    if (activeTab === 'execute' && selectedSuiteId && testCases.length === 0) {
      loadSuiteEntries(selectedSuiteId);
    }
  }, [activeTab]);

  const startRun = async () => {
    if (!org || !project) {
      setError('Organization URL and Project are required');
      return;
    }
    if (!selectedPlanId) {
      setToast('Select a plan first');
      return;
    }
    try {
      const res = await testPlansApi.createRun({
        org,
        project,
        name: runName || `Manual Run - ${new Date().toLocaleString()}`,
        planId: selectedPlanId,
        backendKey: backendKey || undefined
      });
      const id = res.data?.data?.id || res.data?.id;
      if (id) {
        setActiveRunId(Number(id));
        setToast('Run created');
      } else {
        setError(res.data?.message || 'Failed to create run');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to create run');
    }
  };

  const setOutcome = (caseId: string, value: 'Passed' | 'Failed' | 'Blocked' | null) => {
    setOutcomes((prev) => ({ ...prev, [caseId]: value }));
  };

  const submitResults = async () => {
    if (!activeRunId) {
      setToast('Create a run first');
      return;
    }
    const entries = Object.entries(outcomes).filter(([, v]) => v);
    if (entries.length === 0) {
      setToast('No outcomes selected');
      return;
    }
    setSubmittingResults(true);
    try {
      for (const [caseId, outcome] of entries as [string, 'Passed' | 'Failed' | 'Blocked'][]) {
        const point = pointByCase[caseId];
        await testPlansApi.addRunResult({
          org,
          project,
          runId: activeRunId,
          outcome: outcome,
          comment: notes[caseId],
          testCaseId: point ? undefined : Number(caseId),
          testPointId: point?.id,
          backendKey: backendKey || undefined
        });
      }
      setToast('Results submitted');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to submit results');
    } finally {
      setSubmittingResults(false);
    }
  };

  // Build execute list (respecting failed-only filter)
  const executeCases = useMemo(() => {
    if (!showFailedOnly) return filteredCases;
    return filteredCases.filter((c) => (pointByCase[c.id]?.outcome || '').toLowerCase() === 'failed');
  }, [filteredCases, pointByCase, showFailedOnly]);

  // Keyboard shortcuts for Execute tab
  useEffect(() => {
    if (activeTab !== 'execute') return;
    const onKey = (e: KeyboardEvent) => {
      if (!executeCases.length) return;
      // Determine index of focused row
      const idx = focusedCaseId
        ? executeCases.findIndex((c) => c.id === focusedCaseId)
        : 0;
      let nextIdx = idx < 0 ? 0 : idx;
      const key = e.key.toLowerCase();
      if (key === 'p') {
        const id = executeCases[nextIdx]?.id; if (id) setOutcome(id, 'Passed');
      } else if (key === 'f') {
        const id = executeCases[nextIdx]?.id; if (id) setOutcome(id, 'Failed');
      } else if (key === 'b') {
        const id = executeCases[nextIdx]?.id; if (id) setOutcome(id, 'Blocked');
      } else if (key === 'r') {
        const id = executeCases[nextIdx]?.id; if (id) setOutcome(id, null);
      } else if (e.key === 'ArrowDown') {
        nextIdx = Math.min(executeCases.length - 1, (idx < 0 ? -1 : idx) + 1);
        setFocusedCaseId(executeCases[nextIdx]?.id || null);
        e.preventDefault();
      } else if (e.key === 'ArrowUp') {
        nextIdx = Math.max(0, (idx < 0 ? 0 : idx) - 1);
        setFocusedCaseId(executeCases[nextIdx]?.id || null);
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeTab, executeCases, focusedCaseId]);

  const counters = useMemo(() => {
    const total = executeCases.length;
    let passed = 0, failed = 0, blocked = 0, notrun = 0;
    executeCases.forEach((c) => {
      const v = outcomes[c.id];
      if (v === 'Passed') passed++;
      else if (v === 'Failed') failed++;
      else if (v === 'Blocked') blocked++;
      else notrun++;
    });
    return { total, passed, failed, blocked, notrun };
  }, [executeCases, outcomes]);

  return (
    <div className="tp-app">
      <div className="top-bar">
        <div className="logo">
          <div className="logo-icon">⚡</div>
          <span id="project-name">{project || 'DevOps Project'}</span>
        </div>
        <div className="top-nav-menu">
          <button className="top-nav-item">Overview</button>
          <button className="top-nav-item">Boards</button>
          <button className="top-nav-item">Repos</button>
          <button className="top-nav-item">Pipelines</button>
          <button className="top-nav-item active">Test Plans</button>
          <button className="top-nav-item">Artifacts</button>
        </div>
        <div className="user-menu">
          <div className="user-avatar">TP</div>
          <span id="team-name" className="tp-team-name">Test Team</span>
        </div>
      </div>

      <div className="main-layout">
        <aside className="sidebar">
          <div className="sidebar-section">
            <div className="sidebar-section-title">Navigation</div>
            <button className="sidebar-item">
              <span className="sidebar-icon">📊</span>
              <span>Dashboard</span>
            </button>
            <button className="sidebar-item">
              <span className="sidebar-icon">📋</span>
              <span>Boards</span>
            </button>
            <button className="sidebar-item">
              <span className="sidebar-icon">💾</span>
              <span>Repos</span>
            </button>
            <button className="sidebar-item">
              <span className="sidebar-icon">🔄</span>
              <span>Pipelines</span>
            </button>
            <button className="sidebar-item active">
              <span className="sidebar-icon">✅</span>
              <span>Test Plans</span>
            </button>
            <button className="sidebar-item">
              <span className="sidebar-icon">📦</span>
              <span>Artifacts</span>
            </button>
          </div>
          <div className="sidebar-section">
            <div className="sidebar-section-title">Settings</div>
            <button className="sidebar-item">
              <span className="sidebar-icon">⚙️</span>
              <span>Project Settings</span>
            </button>
            <button className="sidebar-item">
              <span className="sidebar-icon">👥</span>
              <span>Team Settings</span>
            </button>
          </div>
        </aside>

        <section className="content-area">
          <div className="breadcrumb">
            <span className="breadcrumb-item">Test Plans</span>
            <span className="breadcrumb-separator">›</span>
            <span className="breadcrumb-item current">{selectedPlan?.name || 'Select plan'}</span>
          </div>

          <div className="page-header">
            <div>
              <h1 className="page-title">{selectedPlan?.name || 'Test Plan Management'}</h1>
              <p className="page-subtitle">Manage and execute test cases with Azure DevOps data.</p>
            </div>
            <div className="tp-connect">
              <div className="tp-connect-row">
                <label className="tp-label">Organization URL</label>
                <input
                  value={org}
                  onChange={(e) => setOrg(e.target.value)}
                  placeholder="https://dev.azure.com/your-org"
                />
              </div>
              <div className="tp-connect-row">
                <label className="tp-label">Project</label>
                <input value={project} onChange={(e) => setProject(e.target.value)} placeholder="Project name" />
              </div>
              <div className="tp-connect-row">
                <label className="tp-label">Backend Key</label>
                <input
                  value={backendKey}
                  onChange={(e) => setBackendKey(e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <button type="button" className="btn btn-primary" onClick={loadPlans} disabled={loadingPlans}>
                {loadingPlans ? 'Loading…' : 'Load Plans'}
              </button>
            </div>
          </div>

          <div className="tabs-container">
            <button className={`tab ${activeTab === 'define' ? 'active' : ''}`} onClick={() => setActiveTab('define')}>
              Define
            </button>
            <button className={`tab ${activeTab === 'execute' ? 'active' : ''}`} onClick={() => setActiveTab('execute')}>
              Execute
            </button>
            <button className={`tab ${activeTab === 'chart' ? 'active' : ''}`} onClick={() => setActiveTab('chart')}>
              Chart
            </button>
          </div>

          {error && <div className="tp-inline-error">{error}</div>}

          {activeTab === 'define' && (
            <div className="tab-content">
              <div className="split-view">
                <div className="split-left">
                  <div className="toolbar">
                    <div className="toolbar-left">
                      <button className="btn btn-primary" onClick={() => setShowSuiteModal(true)}>
                        <span>➕</span>
                        <span>New Suite</span>
                      </button>
                    </div>
                    <div className="toolbar-right">
                      {(loadingSuites || loadingCases) && (
                        <span className="muted">{loadingSuites ? 'Loading suites…' : 'Loading cases…'}</span>
                      )}
                    </div>
                  </div>

                  <div className="suites-list">
                    {!suiteTree.length && !loadingSuites && (
                      <div className="empty-state tp-empty-pad">
                        <div className="empty-icon">📁</div>
                        <p className="empty-title">No Test Suites</p>
                        <p className="empty-text">Load a plan and add suites</p>
                      </div>
                    )}

                    {suiteTree.map((suite) => {
                      const renderNode = (node: TestSuite, depth = 0) => {
                        const childSuites = node.children || [];
                        const hasChildren = childSuites.length > 0;
                        const isExpanded = expandedSuites.has(node.id);
                        const isSelected = selectedSuiteId === node.id;
                        const testCaseCount = testCases.filter((tc) => tc.parentSuiteId === node.id).length;
                        return (
                          <React.Fragment key={node.id}>
                            <div
                              className={`suite-item suite-depth-${depth} ${isSelected ? 'selected' : ''}`}
                              onClick={() => selectSuite(node.id)}
                            >
                              <input
                                type="checkbox"
                                className="suite-checkbox"
                                aria-label="Select suite"
                                onClick={(ev) => ev.stopPropagation()}
                              />
                              {hasChildren ? (
                                <span
                                  className={`suite-expand ${isExpanded ? 'expanded' : ''}`}
                                  onClick={(ev) => {
                                    ev.stopPropagation();
                                    toggleSuite(node.id);
                                  }}
                                >
                                  ▶
                                </span>
                              ) : (
                                <span className="suite-spacer" />
                              )}
                              <span className="suite-icon">📁</span>
                              <span className="suite-name">{node.name}</span>
                              <span className="suite-count">{node.testCaseCount ?? testCaseCount ?? 0}</span>
                            </div>
                            {hasChildren && isExpanded && childSuites.map((child) => renderNode(child, depth + 1))}
                          </React.Fragment>
                        );
                      };
                      return renderNode(suite);
                    })}
                  </div>
                </div>

                <div className="split-right">
                  <div className="toolbar">
                    <div className="toolbar-left">
                      <button className="btn btn-primary" onClick={() => setShowCaseModal(true)} disabled={!selectedSuiteId}>
                        <span>➕</span>
                        <span>New Test Case</span>
                      </button>
                      <button className="btn" onClick={() => setShowAddExistingModal(true)} disabled={!selectedSuiteId}>
                        <span>📥</span>
                        <span>Add Existing</span>
                      </button>
                      <button className="btn" disabled>
                        <span>📤</span>
                        <span>Export</span>
                      </button>
                    </div>
                    <div className="toolbar-right">
                      <input
                        type="text"
                        className="search-box"
                        placeholder="Search test cases..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                      <button
                        className="btn btn-icon"
                        title="Refresh"
                        onClick={() => selectedPlanId && loadSuites(selectedPlanId)}
                        disabled={!selectedPlanId}
                      >
                        <span>🔄</span>
                      </button>
                    </div>
                  </div>

                  <div className="table-container">
                    <table className="test-table">
                      <thead>
                        <tr>
                          <th className="checkbox-cell">
                            <input type="checkbox" className="suite-checkbox" aria-label="Select all test cases" />
                          </th>
                          <th className="sortable">Title</th>
                          <th className="order-cell sortable">Order</th>
                          <th className="id-cell">Test Case ID</th>
                          <th className="assigned-cell">Assigned To</th>
                          <th>Priority</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {!filteredCases.length && (
                          <tr>
                            <td colSpan={8}>
                              <div className="empty-state tp-empty-pad">
                                <div className="empty-icon">📝</div>
                                <p className="empty-title">No Test Cases</p>
                                <p className="empty-text">
                                  {selectedSuite ? 'Add test cases to this suite' : 'Select a suite or create test cases'}
                                </p>
                              </div>
                            </td>
                          </tr>
                        )}

                        {filteredCases.map((tc) => {
                          const initials = tc.assignedTo
                            ? tc.assignedTo
                                .split(' ')
                                .map((n) => n[0])
                                .join('')
                                .slice(0, 2)
                                .toUpperCase()
                            : '?';
                          return (
                            <tr key={tc.id}>
                              <td className="checkbox-cell">
                                <input type="checkbox" className="suite-checkbox" aria-label={`Select test case ${tc.id}`} />
                              </td>
                              <td>{tc.title}</td>
                              <td className="order-cell">{tc.order || '-'}</td>
                              <td className="id-cell">{tc.id}</td>
                              <td className="assigned-cell">
                                {tc.assignedTo ? (
                                  <div className="user-tag">
                                    <div className="user-tag-avatar">{initials}</div>
                                    <span>{tc.assignedTo}</span>
                                  </div>
                                ) : (
                                  <span className="tp-unassigned">Unassigned</span>
                                )}
                              </td>
                              <td>
                                <span className={`priority-badge priority-${tc.priority.toLowerCase()}`}>{tc.priority}</span>
                              </td>
                              <td>
                                <span className={`status-badge status-${tc.status.toLowerCase()}`}>{tc.status}</span>
                              </td>
                              <td className="actions">
                                <button className="action-btn" title="Run Test" onClick={() => setToast('Run is not wired yet')}>
                                  ▶️
                                </button>
                                <button className="action-btn" title="Edit" onClick={() => setToast('Edit is not wired yet')}>
                                  ✏️
                                </button>
                                <button
                                  className="action-btn"
                                  title="Delete"
                                  onClick={() =>
                                    setTestCases((prev) => prev.filter((item) => item.id !== tc.id))
                                  }
                                >
                                  🗑️
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'execute' && (
            <div className="tab-content">
              <div className="toolbar">
                <div className="toolbar-left">
                  <input
                    className="form-input"
                    style={{ maxWidth: 360 }}
                    value={runName}
                    onChange={(e) => setRunName(e.target.value)}
                    placeholder="Manual Run name"
                  />
                  <button className="btn btn-primary" onClick={startRun} disabled={!selectedPlanId || !!activeRunId}>
                    {activeRunId ? 'Run Created' : 'Start Run'}
                  </button>
                  <button className="btn" onClick={() => setOutcomes((prev) => {
                    const next = { ...prev };
                    executeCases.forEach(c => next[c.id] = 'Passed');
                    return next;
                  })} disabled={!executeCases.length}>Mark All Pass</button>
                  <button className="btn" onClick={() => setOutcomes((prev) => {
                    const next = { ...prev };
                    executeCases.forEach(c => next[c.id] = 'Failed');
                    return next;
                  })} disabled={!executeCases.length}>Mark All Fail</button>
                </div>
                <div className="toolbar-right">
                  {activeRunId && (
                    <span className="muted" style={{ marginRight: 12 }}>Run #{activeRunId}</span>
                  )}
                  <label className="muted">
                    <input type="checkbox"
                      checked={showFailedOnly}
                      onChange={(e) => setShowFailedOnly(e.target.checked)}
                      disabled={!Object.keys(pointByCase).length}
                    />
                    Failed-only
                  </label>
                  <span className="muted" style={{ marginRight: 12 }}>
                    P:{counters.passed} F:{counters.failed} B:{counters.blocked} N:{counters.notrun} / {counters.total}
                  </span>
                  <button className="btn btn-primary" onClick={submitResults} disabled={!activeRunId || submittingResults}>
                    {submittingResults ? 'Submitting…' : 'Submit Results'}
                  </button>
                </div>
              </div>

              <div className="table-container">
                <table className="test-table">
                  <thead>
                    <tr>
                      <th>Case</th>
                      <th className="id-cell">ID</th>
                      <th>Status</th>
                      <th>Notes</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!filteredCases.length && (
                      <tr>
                        <td colSpan={5}>
                          <div className="empty-state tp-empty-pad">
                            <div className="empty-icon">🧪</div>
                            <p className="empty-title">No cases to execute</p>
                            <p className="empty-text">Select a suite with test cases.</p>
                          </div>
                        </td>
                      </tr>
                    )}
                    {executeCases.map((tc) => (
                      <tr key={`exec-${tc.id}`} className={focusedCaseId === tc.id ? 'selected' : ''} onClick={() => setFocusedCaseId(tc.id)}>
                        <td>{tc.title}</td>
                        <td className="id-cell">{tc.id}{pointByCase[tc.id] ? <span className="muted"> (P{pointByCase[tc.id].id})</span> : null}</td>
                        <td>
                          {outcomes[tc.id] ? (
                            <span className={`status-badge status-${(outcomes[tc.id] || '').toLowerCase()}`}>{outcomes[tc.id]}</span>
                          ) : (
                            <span className="status-badge status-notrun">Not Run</span>
                          )}
                        </td>
                        <td>
                          <input
                            className="form-input"
                            placeholder="Optional notes"
                            value={notes[tc.id] || ''}
                            onChange={(e) => setNotes((prev) => ({ ...prev, [tc.id]: e.target.value }))}
                          />
                        </td>
                        <td className="actions">
                          <button className="action-btn" title="Pass" onClick={() => setOutcome(tc.id, 'Passed')}>✅</button>
                          <button className="action-btn" title="Fail" onClick={() => setOutcome(tc.id, 'Failed')}>❌</button>
                          <button className="action-btn" title="Blocked" onClick={() => setOutcome(tc.id, 'Blocked')}>⛔</button>
                          <button className="action-btn" title="Reset" onClick={() => setOutcome(tc.id, null)}>↩️</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'chart' && (
            <div className="tab-placeholder">Chart view - Analytics and reports</div>
          )}
        </section>
      </div>

      <div className={`modal-overlay ${showSuiteModal ? 'active' : ''}`}>
        <div className="modal">
          <div className="modal-header">
            <h2 className="modal-title">Create New Test Suite</h2>
            <button className="modal-close" onClick={() => setShowSuiteModal(false)}>
              ×
            </button>
          </div>
          <form onSubmit={saveSuite}>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">
                  Suite Name <span className="required">*</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={suiteForm.name}
                  onChange={(e) => setSuiteForm((prev) => ({ ...prev, name: e.target.value }))}
                  required
                  placeholder="Login Regression"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Suite Type</label>
                <select
                  className="form-select"
                  aria-label="Suite Type"
                  title="Suite Type"
                  value={suiteForm.suiteType}
                  onChange={(e) => setSuiteForm((prev) => ({ ...prev, suiteType: e.target.value }))}
                >
                  <option value="static">Static Suite</option>
                  <option value="requirement">Requirement-based Suite</option>
                  <option value="query">Query-based Suite</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Parent Suite</label>
                <select
                  className="form-select"
                  aria-label="Parent Suite"
                  title="Parent Suite"
                  value={suiteForm.parentId}
                  onChange={(e) => setSuiteForm((prev) => ({ ...prev, parentId: e.target.value }))}
                >
                  <option value="">Root Level</option>
                  {suites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-textarea"
                  value={suiteForm.description}
                  onChange={(e) => setSuiteForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the scope for this suite"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn" onClick={() => setShowSuiteModal(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                <span>Create Suite</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className={`modal-overlay ${showCaseModal ? 'active' : ''}`}>
        <div className="modal">
          <div className="modal-header">
            <h2 className="modal-title">Create New Test Case</h2>
            <button className="modal-close" onClick={() => setShowCaseModal(false)}>
              ×
            </button>
          </div>
          <form onSubmit={saveTestCase}>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">
                  Title <span className="required">*</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={caseForm.title}
                  onChange={(e) => setCaseForm((prev) => ({ ...prev, title: e.target.value }))}
                  required
                  placeholder="Login with valid credentials"
                />
              </div>
              <div className="form-group">
                <label className="form-label">
                  Test Suite <span className="required">*</span>
                </label>
                <select
                  className="form-select"
                  aria-label="Test Suite"
                  title="Test Suite"
                  value={caseForm.suiteId}
                  onChange={(e) => setCaseForm((prev) => ({ ...prev, suiteId: e.target.value }))}
                  required
                >
                  <option value="">Select Suite...</option>
                  {suites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Priority</label>
                <select
                  className="form-select"
                  aria-label="Priority"
                  title="Priority"
                  value={caseForm.priority}
                  onChange={(e) => setCaseForm((prev) => ({ ...prev, priority: e.target.value }))}
                >
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Assigned To</label>
                <input
                  type="text"
                  className="form-input"
                  value={caseForm.assignedTo}
                  onChange={(e) => setCaseForm((prev) => ({ ...prev, assignedTo: e.target.value }))}
                  placeholder="Tester name"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Test Steps</label>
                <textarea
                  className="form-textarea"
                  value={caseForm.steps}
                  onChange={(e) => setCaseForm((prev) => ({ ...prev, steps: e.target.value }))}
                  placeholder={'1. Navigate to login\n2. Enter user\n3. Enter password\n4. Click login'}
                />
                <div className="form-hint">Enter test steps, one per line</div>
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-textarea"
                  value={caseForm.description}
                  onChange={(e) => setCaseForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Detailed test case notes"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn" onClick={() => setShowCaseModal(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                <span>Create Test Case</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className={`modal-overlay ${showAddExistingModal ? 'active' : ''}`}>
        <div className="modal">
          <div className="modal-header">
            <h2 className="modal-title">Add Existing Test Cases</h2>
            <button className="modal-close" onClick={() => setShowAddExistingModal(false)}>
              ×
            </button>
          </div>
          <form onSubmit={handleAddExistingCases}>
            <div className="modal-body">
              <div className="tp-banner info tp-banner-mb16">
                <strong>Target Suite:</strong> {selectedSuite?.name}
              </div>
              <div className="form-group">
                <label className="form-label">
                  Test Case IDs <span className="required">*</span>
                </label>
                <textarea
                  className="form-textarea"
                  value={existingCaseIds}
                  onChange={(e) => setExistingCaseIds(e.target.value)}
                  placeholder="Enter IDs separated by commas or spaces (e.g. 101, 102, 105)"
                  rows={5}
                  required
                />
                <p className="muted muted-hint">
                  These test cases will be linked to the current suite in Azure DevOps.
                </p>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn" onClick={() => setShowAddExistingModal(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={addingExisting}>
                <span>{addingExisting ? 'Adding...' : 'Add to Suite'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {toast && <div className="tp-toast">{toast}</div>}
    </div>
  );
};

export default TestPlansPage;
