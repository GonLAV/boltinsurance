import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios, { AxiosResponse } from 'axios';
import { apiClient } from '../../shared/services/apiClient';
import './getit.css';

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

type HeaderRow = { id: number; key: string; value: string };
type ParamRow = { id: number; key: string; value: string; enabled: boolean };

type RequestRun = {
  id: string;
  name: string;
  method: string;
  url: string;
  status?: number;
  duration?: number;
  verdict?: 'PASS' | 'WARN' | 'FAIL';
};

type ResponseView = {
  status: number;
  duration: number;
  headers: Record<string, string>;
  data: any;
  statusText?: string;
};

type EnvVarRow = { id: number; key: string; value: string; enabled: boolean };

type TestResult = { id: string; ok: boolean; label: string; detail?: string };

type TestReport = {
  verdict: 'PASS' | 'WARN' | 'FAIL';
  results: TestResult[];
  extracted: Record<string, string>;
};

type RunSnapshot = {
  request: {
    method: string;
    url: string;
    headers: HeaderRow[];
    params: ParamRow[];
    body: string;
  };
  response: ResponseView | null;
  errorText: string | null;
  report: TestReport | null;
};

const sampleDsl = [
  'assert:',
  '  status: 200',
  '  time: < 500ms',
  '  json:',
  '    token: exists',
  '    user.id: number',
  'extract:',
  '  token -> {{authToken}}',
  ''
].join('\n');

const initialHeaders: HeaderRow[] = [];

const initialParams: ParamRow[] = [];

const ENV_STORAGE_KEY = 'getit:env';
const TESTS_STORAGE_KEY = 'getit:tests';
const SNAPSHOT_STORAGE_KEY = 'getit:snapshots';

const safeJsonParse = <T,>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const AZURE_DEVOPS_HOST_MARKERS = ['dev.azure.com', '.visualstudio.com', '.tfs.', 'tlvtfs03'];

const isAzureDevOpsUrl = (value: string): boolean => {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    const host = parsed.hostname.toLowerCase();
    const path = parsed.pathname.toLowerCase();
    const matchesHost = AZURE_DEVOPS_HOST_MARKERS.some((marker) => host.includes(marker));
    return matchesHost || path.includes('/_apis/');
  } catch {
    return false;
  }
};

const asMs = (value: string): number | null => {
  const raw = value.trim().toLowerCase();
  if (!raw) return null;
  const match = raw.match(/^([0-9]+(?:\.[0-9]+)?)\s*(ms|s)?$/);
  if (!match) return null;
  const num = Number(match[1]);
  const unit = match[2] || 'ms';
  if (!Number.isFinite(num)) return null;
  return unit === 's' ? Math.round(num * 1000) : Math.round(num);
};

const getByPath = (obj: any, path: string): any => {
  if (!path) return undefined;
  const parts = path.split('.').filter(Boolean);
  let cur: any = obj;
  for (const part of parts) {
    if (cur === null || cur === undefined) return undefined;
    const m = part.match(/^(.*?)\[(\d+)\]$/);
    if (m) {
      const key = m[1];
      const idx = Number(m[2]);
      cur = key ? cur?.[key] : cur;
      if (!Array.isArray(cur)) return undefined;
      cur = cur[idx];
    } else {
      cur = cur?.[part];
    }
  }
  return cur;
};

const stringifyValue = (v: any): string => {
  if (v === null) return 'null';
  if (v === undefined) return '';
  if (typeof v === 'string') return v;
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
};

const normalizeHeaders = (headers: any): Record<string, string> => {
  const normalized: Record<string, string> = {};
  Object.entries(headers || {}).forEach(([key, value]) => {
    if (Array.isArray(value)) normalized[key] = value.join(', ');
    else if (value === undefined || value === null) normalized[key] = '';
    else normalized[key] = String(value);
  });
  return normalized;
};

const computeVerdict = (results: TestResult[]): 'PASS' | 'WARN' | 'FAIL' => {
  if (!results.length) return 'WARN';
  return results.every((r) => r.ok) ? 'PASS' : 'FAIL';
};

const GETitView: React.FC = () => {
  const [method, setMethod] = useState('GET');
  const [url, setUrl] = useState('http://localhost:5000/api/health');
  const [headers, setHeaders] = useState<HeaderRow[]>(initialHeaders);
  const [params, setParams] = useState<ParamRow[]>(initialParams);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [response, setResponse] = useState<ResponseView | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [history, setHistory] = useState<RequestRun[]>([]);
  const [activeTab, setActiveTab] = useState<'params' | 'headers' | 'body' | 'auth' | 'tests'>('params');
  const [responseTab, setResponseTab] = useState<'pretty' | 'raw' | 'headers' | 'timeline'>('pretty');
  const [activeRunId, setActiveRunId] = useState<string | null>(null);

  const [envVars, setEnvVars] = useState<EnvVarRow[]>(() => {
    const fromStorage = safeJsonParse<EnvVarRow[]>(localStorage.getItem(ENV_STORAGE_KEY), []);
    if (fromStorage.length) return fromStorage;
    return [
      { id: Date.now(), key: 'baseUrl', value: 'http://localhost:5000', enabled: true },
      { id: Date.now() + 1, key: 'authToken', value: localStorage.getItem('boltest:token') || '', enabled: true }
    ];
  });

  const [testsDsl, setTestsDsl] = useState<string>(() => {
    return localStorage.getItem(TESTS_STORAGE_KEY) || sampleDsl;
  });

  const [lastReport, setLastReport] = useState<TestReport | null>(null);
  const [snapshots, setSnapshots] = useState<Record<string, RunSnapshot>>(() => {
    return safeJsonParse<Record<string, RunSnapshot>>(localStorage.getItem(SNAPSHOT_STORAGE_KEY), {});
  });

  const envMap = useMemo(() => {
    const map: Record<string, string> = {};
    envVars
      .filter((v) => v.enabled && v.key)
      .forEach((v) => {
        map[v.key.trim()] = v.value;
      });
    return map;
  }, [envVars]);

  const interpolate = useCallback(
    (input: string): string => {
      if (!input) return input;
      return input.replace(/{{\s*([\w.-]+)\s*}}/g, (_m, name: string) => {
        const v = envMap[name];
        return v === undefined ? '' : String(v);
      });
    },
    [envMap]
  );

  const client = useMemo(() => {
    const effectiveUrl = interpolate(url);
    return effectiveUrl.startsWith('http') ? axios : apiClient;
  }, [url, interpolate]);

  useEffect(() => {
    localStorage.setItem(ENV_STORAGE_KEY, JSON.stringify(envVars));
  }, [envVars]);

  useEffect(() => {
    localStorage.setItem(TESTS_STORAGE_KEY, testsDsl);
  }, [testsDsl]);

  useEffect(() => {
    localStorage.setItem(SNAPSHOT_STORAGE_KEY, JSON.stringify(snapshots));
  }, [snapshots]);

  const addHeaderRow = () => {
    setHeaders((rows) => [...rows, { id: Date.now(), key: '', value: '' }]);
  };

  const updateHeaderRow = (id: number, field: 'key' | 'value', value: string) => {
    setHeaders((rows) => rows.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  };

  const removeHeaderRow = (id: number) => {
    setHeaders((rows) => rows.filter((row) => row.id !== id));
  };

  const addParamRow = () => {
    setParams((rows) => [...rows, { id: Date.now(), key: '', value: '', enabled: true }]);
  };

  const updateParamRow = (id: number, field: 'key' | 'value' | 'enabled', value: string | boolean) => {
    setParams((rows) => rows.map((row) => (row.id === id ? { ...row, [field]: value as any } : row)));
  };

  const removeParamRow = (id: number) => {
    setParams((rows) => rows.filter((row) => row.id !== id));
  };

  const addEnvRow = () => {
    setEnvVars((rows) => [...rows, { id: Date.now(), key: '', value: '', enabled: true }]);
  };

  const updateEnvRow = (id: number, field: 'key' | 'value' | 'enabled', value: string | boolean) => {
    setEnvVars((rows) => rows.map((row) => (row.id === id ? { ...row, [field]: value as any } : row)));
  };

  const removeEnvRow = (id: number) => {
    setEnvVars((rows) => rows.filter((row) => row.id !== id));
  };

  const upsertHeader = (key: string, value: string) => {
    const k = key.trim();
    if (!k) return;
    setHeaders((rows) => {
      const existing = rows.find((r) => r.key.trim().toLowerCase() === k.toLowerCase());
      if (existing) {
        return rows.map((r) => (r.id === existing.id ? { ...r, value } : r));
      }
      return [...rows, { id: Date.now(), key: k, value }];
    });
  };

  const getEnvValue = (key: string): string => {
    return envMap[key] || '';
  };

  const parseBody = () => {
    const interpolated = interpolate(body);
    const trimmed = interpolated.trim();
    if (!trimmed) return undefined;
    try {
      return JSON.parse(trimmed);
    } catch {
      return interpolated;
    }
  };

  const buildUrlWithParams = () => {
    const enabledParams = params.filter((p) => p.enabled && p.key);
    const base = interpolate(url);
    if (enabledParams.length === 0) return base;
    try {
      const urlObj = new URL(base, base.startsWith('http') ? undefined : window.location.origin);
      enabledParams.forEach((p) => urlObj.searchParams.set(interpolate(p.key), interpolate(p.value)));
      return urlObj.toString();
    } catch {
      return base;
    }
  };

  const parseTests = (dsl: string) => {
    const lines = dsl.split(/\r?\n/);
    let section: 'none' | 'assert' | 'extract' = 'none';
    let inJson = false;
    const asserts: { kind: string; data: any }[] = [];
    const extracts: { path: string; varName: string }[] = [];

    for (const rawLine of lines) {
      const line = rawLine.replace(/\t/g, '  ');
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      if (/^assert:\s*$/i.test(trimmed)) {
        section = 'assert';
        inJson = false;
        continue;
      }
      if (/^extract:\s*$/i.test(trimmed)) {
        section = 'extract';
        inJson = false;
        continue;
      }

      if (section === 'assert') {
        if (/^json:\s*$/i.test(trimmed)) {
          inJson = true;
          continue;
        }

        if (!inJson) {
          const mStatus = trimmed.match(/^status\s*:\s*(\d{3})\s*$/i);
          if (mStatus) {
            asserts.push({ kind: 'status', data: { expected: Number(mStatus[1]) } });
            continue;
          }
          const mTime = trimmed.match(/^time\s*:\s*<\s*(.+)$/i);
          if (mTime) {
            const ms = asMs(mTime[1]);
            if (ms !== null) asserts.push({ kind: 'time', data: { ltMs: ms } });
            continue;
          }
        }

        if (inJson) {
          const idx = trimmed.indexOf(':');
          if (idx > 0) {
            const path = trimmed.slice(0, idx).trim();
            const rule = trimmed.slice(idx + 1).trim();
            asserts.push({ kind: 'json', data: { path, rule } });
          }
        }
      }

      if (section === 'extract') {
        const m = trimmed.match(/^(.+?)\s*->\s*{{\s*([\w.-]+)\s*}}\s*$/);
        if (m) {
          extracts.push({ path: m[1].trim(), varName: m[2].trim() });
        }
      }
    }

    return { asserts, extracts };
  };

  const evaluateTests = (res: ResponseView, dsl: string): TestReport => {
    const { asserts, extracts } = parseTests(dsl);
    const results: TestResult[] = [];
    const extracted: Record<string, string> = {};

    for (const a of asserts) {
      if (a.kind === 'status') {
        const expected = a.data.expected as number;
        const ok = res.status === expected;
        results.push({
          id: `status:${expected}`,
          ok,
          label: `status = ${expected}`,
          detail: ok ? undefined : `got ${res.status}`
        });
      }

      if (a.kind === 'time') {
        const ltMs = a.data.ltMs as number;
        const ok = res.duration < ltMs;
        results.push({
          id: `time:<${ltMs}`,
          ok,
          label: `time < ${ltMs}ms`,
          detail: ok ? undefined : `got ${res.duration}ms`
        });
      }

      if (a.kind === 'json') {
        const { path, rule } = a.data as { path: string; rule: string };
        const value = getByPath(res.data, path);
        const r = rule.toLowerCase();
        if (r === 'exists') {
          const ok = value !== undefined;
          results.push({ id: `json:${path}:exists`, ok, label: `${path}: exists`, detail: ok ? undefined : 'missing' });
        } else if (r === 'number') {
          const ok = typeof value === 'number' && Number.isFinite(value);
          results.push({ id: `json:${path}:number`, ok, label: `${path}: number`, detail: ok ? undefined : `got ${typeof value}` });
        } else if (r === 'string') {
          const ok = typeof value === 'string';
          results.push({ id: `json:${path}:string`, ok, label: `${path}: string`, detail: ok ? undefined : `got ${typeof value}` });
        } else if (r === 'boolean') {
          const ok = typeof value === 'boolean';
          results.push({ id: `json:${path}:boolean`, ok, label: `${path}: boolean`, detail: ok ? undefined : `got ${typeof value}` });
        } else {
          // Default: equals literal
          let expected: any = rule;
          try {
            expected = JSON.parse(rule);
          } catch {
            expected = rule;
          }
          const ok = stringifyValue(value) === stringifyValue(expected);
          results.push({
            id: `json:${path}:equals`,
            ok,
            label: `${path}: equals ${stringifyValue(expected)}`,
            detail: ok ? undefined : `got ${stringifyValue(value)}`
          });
        }
      }
    }

    // Extract variables
    for (const ex of extracts) {
      const value = getByPath(res.data, ex.path);
      const stringVal = stringifyValue(value);
      extracted[ex.varName] = stringVal;
    }

    const verdict = computeVerdict(results);
    return { verdict, results, extracted };
  };

  const sendRequest = async () => {
    setSending(true);
    setErrorText(null);
    setResponse(null);
    const start = performance.now();
    const runId = `${Date.now()}`;
    const resolvedUrl = buildUrlWithParams();
    const isAbsoluteUrl = resolvedUrl.startsWith('http');

    if (isAbsoluteUrl && isAzureDevOpsUrl(resolvedUrl)) {
      const warning = 'Azure DevOps/TFS endpoints must go through the backend (e.g. /api/ado/) so the server can add the PAT. This tool will not call them directly.';
      setErrorText(warning);
      setLastReport(null);
      setSnapshots((prev) => ({
        ...prev,
        [runId]: {
          request: { method, url, headers, params, body },
          response: null,
          errorText: warning,
          report: null
        }
      }));
      setSending(false);
      return;
    }

    const headerObj: Record<string, string> = {};
    headers
      .filter((h) => h.key)
      .forEach((h) => {
        headerObj[interpolate(h.key)] = interpolate(h.value);
      });

    const config: any = {
      method,
      url: resolvedUrl,
      headers: headerObj,
      validateStatus: () => true
    };

    if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
      config.data = parseBody();
    }

    try {
      const res: AxiosResponse = await client.request(config);
      const duration = Math.round(performance.now() - start);

      const responseView: ResponseView = {
        status: res.status,
        duration,
        headers: normalizeHeaders(res.headers),
        data: res.data,
        statusText: res.statusText
      };

      const report = evaluateTests(responseView, testsDsl);
      setLastReport(report);

      // Persist extracted vars back into env
      if (Object.keys(report.extracted).length) {
        setEnvVars((rows) => {
          const next = [...rows];
          for (const [k, v] of Object.entries(report.extracted)) {
            const existing = next.find((r) => r.key.trim() === k);
            if (existing) {
              existing.value = v;
              existing.enabled = true;
            } else {
              next.push({ id: Date.now() + Math.floor(Math.random() * 1000), key: k, value: v, enabled: true });
            }
          }
          return next;
        });
      }

      const newRun: RequestRun = {
        id: runId,
        name: `${method} ${resolvedUrl}`,
        method,
        url: resolvedUrl,
        status: res.status,
        duration,
        verdict: report.verdict
      };

      setActiveRunId(runId);
      setHistory((prev) => [newRun, ...prev].slice(0, 12));
      setResponse(responseView);

      setSnapshots((prev) => ({
        ...prev,
        [runId]: {
          request: { method, url, headers, params, body },
          response: responseView,
          errorText: null,
          report
        }
      }));
    } catch (err: any) {
      setActiveRunId(runId);
      const failureRun: RequestRun = {
        id: runId,
        name: `${method} ${resolvedUrl}`,
        method,
        url: resolvedUrl,
        verdict: 'FAIL'
      };
      setHistory((prev) => [failureRun, ...prev].slice(0, 12));
      setErrorText(err?.message || 'Request failed');
      setLastReport(null);
      setSnapshots((prev) => ({
        ...prev,
        [runId]: {
          request: { method, url, headers, params, body },
          response: null,
          errorText: err?.message || 'Request failed',
          report: null
        }
      }));
    } finally {
      setSending(false);
    }
  };

  const renderResponseBody = (data: any) => {
    if (data === null || data === undefined) return '∅ empty';
    if (typeof data === 'object') {
      try {
        return JSON.stringify(data, null, 2);
      } catch {
        return String(data);
      }
    }
    return String(data);
  };

  const resetComposer = () => {
    setMethod('GET');
    setUrl('http://localhost:5000/api/health');
    setHeaders(initialHeaders);
    setParams(initialParams);
    setBody('');
    setResponse(null);
    setErrorText(null);
    setActiveTab('params');
    setResponseTab('pretty');
    setActiveRunId(null);
    setLastReport(null);
  };

  const verdictClass = history.find((h) => h.id === activeRunId)?.verdict || (lastReport?.verdict ?? 'WARN');
  const verdictLabel = verdictClass === 'PASS' ? 'PASS' : verdictClass === 'FAIL' ? 'FAIL' : 'WARN';

  const restoreRun = (runId: string) => {
    const snap = snapshots[runId];
    if (!snap) return;
    setMethod(snap.request.method);
    setUrl(snap.request.url);
    setHeaders(snap.request.headers);
    setParams(snap.request.params);
    setBody(snap.request.body);
    setResponse(snap.response);
    setErrorText(snap.errorText);
    setLastReport(snap.report);
  };

  return (
    <div className="getit-shell">
      <div className="top-nav">
        <div className="logo">GETit</div>
        <nav className="nav-items">
          <span className="nav-item active">Composer</span>
          <span className="nav-item">Collections</span>
          <span className="nav-item">History</span>
          <span className="nav-item">Environments</span>
          <span className="nav-item">TFS Integration</span>
        </nav>
        <div className="nav-actions">
          <div className="status-indicator" />
          <span>Connected</span>
        </div>
      </div>

      <div className="main-container">
        <aside className="sidebar">
          <div className="sidebar-header">
            <div className="sidebar-title">Requests</div>
            <button className="new-request-btn" onClick={resetComposer}>
              <span>+</span>
              <span>New Request</span>
            </button>
          </div>
          <div className="request-list">
            {history.length === 0 && (
              <div className="muted getit-muted-pad">
                No runs yet. Execute to populate history.
              </div>
            )}
            {history.map((run) => (
              <div
                key={run.id}
                className={`request-item ${activeRunId === run.id ? 'active' : ''}`}
                onClick={() => {
                  setActiveRunId(run.id);
                  restoreRun(run.id);
                }}
              >
                <span className={`method-badge method-${run.method.toLowerCase()}`}>{run.method}</span>
                <span className="request-name">{run.name}</span>
                <span className="verdict-icon">{run.verdict === 'PASS' ? '✔' : run.verdict === 'FAIL' ? '✖' : '⚠'}</span>
              </div>
            ))}
          </div>
        </aside>

        <main className="content-area">
          <section className="request-builder">
            <div className="url-bar">
              <div className="url-input-container">
                <select
                  className="method-selector"
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  aria-label="HTTP method"
                >
                  {METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  className="url-input"
                  placeholder="{{baseUrl}}/api/v1/users/login"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
                <button className="send-btn" onClick={sendRequest} disabled={sending}>
                  {sending ? (
                    <span className="loading" />
                  ) : (
                    'Send'
                  )}
                </button>
              </div>
            </div>

            <div className="tabs-container">
              {['params', 'headers', 'body', 'auth', 'tests'].map((tab) => (
                <button
                  key={tab}
                  className={`tab ${activeTab === tab ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab as any)}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            <div className="tab-content">
              {activeTab === 'params' && (
                <div>
                  {params.map((row) => (
                    <div className="param-row" key={row.id}>
                      <div className="checkbox-cell">
                        <input
                          type="checkbox"
                          className="custom-checkbox"
                          checked={row.enabled}
                          onChange={(e) => updateParamRow(row.id, 'enabled', e.target.checked)}
                          aria-label="Enable param"
                        />
                      </div>
                      <input
                        className="param-input"
                        placeholder="Key"
                        value={row.key}
                        onChange={(e) => updateParamRow(row.id, 'key', e.target.value)}
                      />
                      <input
                        className="param-input"
                        placeholder="Value"
                        value={row.value}
                        onChange={(e) => updateParamRow(row.id, 'value', e.target.value)}
                      />
                      <button className="delete-btn" onClick={() => removeParamRow(row.id)}>
                        ×
                      </button>
                    </div>
                  ))}
                  <button className="new-request-btn getit-mt-8" onClick={addParamRow}>
                    <span>+</span> <span>Add Param</span>
                  </button>
                </div>
              )}

              {activeTab === 'headers' && (
                <div>
                  {headers.map((row) => (
                    <div className="param-row" key={row.id}>
                      <div />
                      <input
                        className="param-input"
                        placeholder="Key"
                        value={row.key}
                        onChange={(e) => updateHeaderRow(row.id, 'key', e.target.value)}
                      />
                      <input
                        className="param-input"
                        placeholder="Value"
                        value={row.value}
                        onChange={(e) => updateHeaderRow(row.id, 'value', e.target.value)}
                      />
                      <button className="delete-btn" onClick={() => removeHeaderRow(row.id)}>
                        ×
                      </button>
                    </div>
                  ))}
                  <button className="new-request-btn getit-mt-8" onClick={addHeaderRow}>
                    <span>+</span> <span>Add Header</span>
                  </button>
                </div>
              )}

              {activeTab === 'body' && (
                <div>
                  {method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS' ? (
                    <textarea
                      className="json-viewer getit-json-body"
                      placeholder={`{\n  "email": "user@example.com",\n  "password": "***"\n}`}
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                    />
                  ) : (
                    <div className="muted">Body disabled for this method.</div>
                  )}
                </div>
              )}

              {activeTab === 'auth' && (
                <div>
                  <div className="getit-section-title">Environment</div>
                  <div className="muted getit-muted-pad">
                    Use variables anywhere: <span className="mini-pill">{'{{baseUrl}}'}</span>, <span className="mini-pill">{'{{authToken}}'}</span>. They work in URL, headers, params, and body.
                  </div>

                  {envVars.map((row) => (
                    <div className="param-row" key={row.id}>
                      <div className="checkbox-cell">
                        <input
                          type="checkbox"
                          className="custom-checkbox"
                          checked={row.enabled}
                          onChange={(e) => updateEnvRow(row.id, 'enabled', e.target.checked)}
                          aria-label="Enable env var"
                        />
                      </div>
                      <input
                        className="param-input"
                        placeholder="Key (e.g. baseUrl)"
                        value={row.key}
                        onChange={(e) => updateEnvRow(row.id, 'key', e.target.value)}
                      />
                      <input
                        className="param-input"
                        placeholder="Value"
                        value={row.value}
                        onChange={(e) => updateEnvRow(row.id, 'value', e.target.value)}
                      />
                      <button className="delete-btn" onClick={() => removeEnvRow(row.id)}>
                        ×
                      </button>
                    </div>
                  ))}

                  <button className="new-request-btn getit-mt-8" onClick={addEnvRow}>
                    <span>+</span> <span>Add Variable</span>
                  </button>

                  <div className="getit-section-title getit-mt-8">Auth presets</div>
                  <div className="getit-auth-row">
                    <input
                      className="param-input"
                      placeholder="Bearer token (or use {{authToken}})"
                      value={getEnvValue('authToken')}
                      onChange={(e) => {
                        const next = e.target.value;
                        setEnvVars((rows) => {
                          const existing = rows.find((r) => r.key.trim() === 'authToken');
                          if (existing) return rows.map((r) => (r.id === existing.id ? { ...r, value: next, enabled: true } : r));
                          return [...rows, { id: Date.now(), key: 'authToken', value: next, enabled: true }];
                        });
                      }}
                    />
                    <button
                      className="send-btn getit-compact-btn"
                      type="button"
                      onClick={() => upsertHeader('Authorization', `Bearer ${getEnvValue('authToken')}`)}
                    >
                      Apply
                    </button>
                  </div>
                  <div className="muted getit-muted-pad">
                    Applies <span className="mini-pill">Authorization</span> header using your token.
                  </div>
                </div>
              )}

              {activeTab === 'tests' && (
                <div>
                  <div className="getit-section-title">Tests (DSL)</div>
                  <div className="muted getit-muted-pad">
                    Assertions run after every request. Extractions write back into variables like <span className="mini-pill">{'{{authToken}}'}</span>.
                  </div>
                  <textarea
                    className="json-viewer getit-json-body"
                    value={testsDsl}
                    onChange={(e) => setTestsDsl(e.target.value)}
                    aria-label="Tests DSL"
                    placeholder={sampleDsl}
                    spellCheck={false}
                  />

                  {lastReport && (
                    <div className="getit-report">
                      <div className="getit-report-header">
                        <span className={`mini-pill verdict-${lastReport.verdict.toLowerCase()}`}>{lastReport.verdict}</span>
                        <span className="muted">{lastReport.results.filter((r) => r.ok).length}/{lastReport.results.length} passed</span>
                      </div>
                      <div className="getit-report-grid">
                        {lastReport.results.map((r) => (
                          <div key={r.id} className={`getit-report-row ${r.ok ? 'ok' : 'bad'}`}>
                            <span className="getit-report-icon">{r.ok ? '✔' : '✖'}</span>
                            <span className="getit-report-label">{r.label}</span>
                            <span className="getit-report-detail">{r.detail || ''}</span>
                          </div>
                        ))}
                      </div>

                      {Object.keys(lastReport.extracted).length > 0 && (
                        <div className="getit-extract">
                          <div className="getit-section-title">Extracted</div>
                          <pre className="json-viewer">{JSON.stringify(lastReport.extracted, null, 2)}</pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>

          <section className="response-inspector">
            <div className="response-header">
              <span className="response-title">Response</span>
              {response && <span className="response-status">{response.status} {response.statusText || ''}</span>}
              {response && <span className="response-time">● {response.duration} ms</span>}
              {errorText && <span className="response-status error">Error</span>}
              <div className={`verdict-badge verdict-${verdictLabel.toLowerCase()}`}>
                <span>{verdictLabel}</span>
              </div>
            </div>

            <div className="response-tabs">
              {['pretty', 'raw', 'headers', 'timeline'].map((tab) => (
                <button
                  key={tab}
                  className={`tab ${responseTab === tab ? 'active' : ''}`}
                  onClick={() => setResponseTab(tab as any)}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            <div className="response-content">
              {!response && !errorText && <div className="empty-state">Awaiting first response</div>}
              {errorText && <div className="muted getit-error-text">{errorText}</div>}
              {response && (
                <>
                  {responseTab === 'pretty' && (
                    <div className="json-viewer">{renderResponseBody(response.data)}</div>
                  )}
                  {responseTab === 'raw' && (
                    <div className="json-viewer">{String(response.data)}</div>
                  )}
                  {responseTab === 'headers' && (
                    <div className="json-viewer">{JSON.stringify(response.headers, null, 2)}</div>
                  )}
                  {responseTab === 'timeline' && (
                    <div className="json-viewer">
                      {JSON.stringify(
                        {
                          url: buildUrlWithParams(),
                          method,
                          status: response.status,
                          durationMs: response.duration,
                          verdict: verdictLabel,
                          assertions: lastReport?.results || [],
                          extracted: lastReport?.extracted || {}
                        },
                        null,
                        2
                      )}
                    </div>
                  )}

                  <div className="ai-explanation">
                    <div className="ai-sparkle">✨</div>
                    <div>
                      <div className="ai-title">AI Explanation</div>
                      <div className="ai-text">
                        {'Request executed. Assertions ran and variables were updated from your extraction rules. Use {{baseUrl}} and extracted tokens to chain requests like a workflow.'}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default GETitView;
