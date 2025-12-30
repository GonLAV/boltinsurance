import axios, { AxiosHeaders } from 'axios';

export const determineApiBase = () => {
  if ((process.env as any).REACT_APP_API_URL) return (process.env as any).REACT_APP_API_URL;
  if (typeof window === 'undefined') return '';

  // Use explicit backend URL for local development
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:5000';
  }

  try {
    const host = window.location.hostname; // e.g. bug-free-pancake-...-3000.app.github.dev
    const match = host.match(/^(.*)-(\d+)\.app\.github\.dev$/);
    if (match) {
      // Keep backend and frontend ports aligned (see backend PORT)
      const baseHost = `${match[1]}-5001.app.github.dev`;
      const protocol = window.location.protocol;
      return `${protocol}//${baseHost}`;
    }
  } catch (e) {
    // fallthrough
  }

  // fallback to empty -> relative requests
  return '';
};

export const API_BASE = determineApiBase();

// Axios instance configured once for the app
export const apiClient = axios.create({ baseURL: API_BASE || '' });

// Debug logging only in development to avoid noisy consoles and leaking headers
const isDev = process.env.NODE_ENV === 'development';
if (isDev) {
  console.log('[DEBUG] axios baseURL =', apiClient.defaults.baseURL || '(relative)');
}

// Interceptors to add auth header and (optionally) log outbound requests
apiClient.interceptors.request.use((req) => {
  try {
    // Attach Authorization header from localStorage token if present
    const token = typeof window !== 'undefined' ? localStorage.getItem('boltest:token') : null;
    if (token) {
      if (!req.headers) req.headers = {} as any;
      req.headers['Authorization'] = `Bearer ${token}`;
    }

    // Attach TFS/ADO targeting headers for backend API calls
    // (keeps data sync aligned with the org/project/PAT selected at login)
    const url = (req.url || '').toString();
    const isBackendApiCall = url.startsWith('/api/');
    if (isBackendApiCall) {
      const orgUrl = localStorage.getItem('boltest:orgUrl');
      const project = localStorage.getItem('boltest:project');

      // Axios v1 uses AxiosHeaders; direct bracket access can be unreliable.
      if (!req.headers) req.headers = new AxiosHeaders();
      const headersAny = req.headers as any;
      const getHeader = (name: string) => (typeof headersAny.get === 'function' ? headersAny.get(name) : headersAny[name]);
      const setHeader = (name: string, value: string) => {
        if (typeof headersAny.set === 'function') headersAny.set(name, value);
        else headersAny[name] = value;
      };

      if (orgUrl && !getHeader('x-orgurl') && !getHeader('X-OrgUrl')) {
        setHeader('x-orgurl', orgUrl);
      }
      if (project && !getHeader('x-project') && !getHeader('X-Project')) {
        setHeader('x-project', project);
      }
      
      // Debug: show what credentials are being used
      if (isDev && req.url === '/api/attachments') {
        console.log('[DEBUG] Attachment upload credentials:', {
          orgUrl: orgUrl ? `${orgUrl.substring(0, 40)}...` : 'MISSING',
          project: project || 'MISSING'
        });
      }
    }

    if (isDev) {
      console.log(`[DEBUG] ${req.method?.toUpperCase()} ${req.baseURL || ''}${req.url}`, {
        headers: req.headers,
        data: req.data
      });
    }
  } catch (e) { /* ignore */ }
  return req;
});

apiClient.interceptors.response.use((res) => {
  try {
    if (isDev) {
      console.log('[DEBUG] response', res.status, res.config.url, res.data?.success);
    }
  } catch (e) { /* ignore */ }
  return res;
}, (err) => {
  try {
    if (isDev) {
      console.warn('[DEBUG] response error', err?.response?.status, err?.config?.url, err?.response?.data);
    }
  } catch (e) { /* ignore */ }
  return Promise.reject(err);
});

export default apiClient;

// Simple GET caching helper with TTL (in-memory + localStorage)
type CacheEntry = { ts: number; data: any };
const memCache = new Map<string, CacheEntry>();

const lsKey = 'boltest:apiCache';
const readLsCache = (): Record<string, CacheEntry> => {
  try {
    const raw = localStorage.getItem(lsKey);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};
const writeLsCache = (obj: Record<string, CacheEntry>) => {
  try { localStorage.setItem(lsKey, JSON.stringify(obj)); } catch {}
};

const buildKey = (url: string, opts?: any) => {
  const params = opts?.params ? JSON.stringify(opts.params) : '';
  const headers = opts?.headers ? JSON.stringify(opts.headers) : '';
  return `${API_BASE}|${url}|${params}|${headers}`;
};

export const cachedGet = async (url: string, opts?: any, ttlMs: number = 60_000) => {
  const key = buildKey(url, opts);
  const now = Date.now();
  const fromMem = memCache.get(key);
  if (fromMem && now - fromMem.ts < ttlMs) {
    return { data: fromMem.data, status: 200, config: { url, method: 'GET' } };
  }
  const lsCache = readLsCache();
  const fromLs = lsCache[key];
  if (fromLs && now - fromLs.ts < ttlMs) {
    memCache.set(key, fromLs);
    return { data: fromLs.data, status: 200, config: { url, method: 'GET' } };
  }
  const res = await apiClient.get(url, opts);
  const entry: CacheEntry = { ts: now, data: res.data };
  memCache.set(key, entry);
  lsCache[key] = entry;
  writeLsCache(lsCache);
  return res;
};
