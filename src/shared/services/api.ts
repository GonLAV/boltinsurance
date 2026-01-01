import axios, { AxiosInstance, AxiosError } from 'axios';
import { toast } from 'react-toastify';

// ⚡ PERFORMANCE: Simple in-memory cache for GET requests
class RequestCache {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private ttl = 600000; // 10 minutes - aggressive caching for fast repeat visits

  get(key: string) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  set(key: string, data: any) {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  clear() {
    this.cache.clear();
  }
}

const requestCache = new RequestCache();

// Axios instance with health check & offline handling
export const api: AxiosInstance = axios.create({
  baseURL: process.env.REACT_APP_API_BASE || 'http://localhost:5000',
  timeout: 60000, // 60s timeout for large data fetches from Azure DevOps
  withCredentials: true,
});

// ⚡ PERFORMANCE: Request caching interceptor for GET requests
api.interceptors.request.use((config) => {
  if (config.method?.toUpperCase() === 'GET') {
    const cached = requestCache.get(config.url || '');
    if (cached) {
      return Promise.reject({ cached, config });
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    // ⚡ Cache successful GET responses
    if (response.config.method?.toUpperCase() === 'GET') {
      requestCache.set(response.config.url || '', response.data);
    }
    return response;
  },
  (error: any) => {
    // ⚡ Return cached data if available on error
    if (error.cached) {
      return Promise.resolve({ ...error.config, data: error.cached });
    }
    throw error;
  }
);

let isOffline = false;
let retryQueue: Array<() => void> = [];

// Health check - verify backend is alive
export async function checkHealth(): Promise<boolean> {
  try {
    const res = await axios.get('http://localhost:5000/api/health', { timeout: 3000 });
    return res.status === 200;
  } catch {
    return false;
  }
}

// Global response interceptor for offline handling
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Network error = connection refused, no response from server
    if (!error.response) {
      isOffline = true;
      
      // Show offline banner once
      if (!sessionStorage.getItem('offline-banner-shown')) {
        toast.error('⚠️ API offline. Retrying...', {
          autoClose: false,
          closeButton: true,
        });
        sessionStorage.setItem('offline-banner-shown', 'true');
      }

      // Queue the retry
      retryQueue.push(() => {
        // Retry this request after server is back
        return api(error.config!);
      });

      // Poll for recovery
      pollHealthCheck();
    }

    return Promise.reject(error);
  }
);

// Poll backend health & retry queued requests
let healthCheckTimer: NodeJS.Timeout | null = null;

export function pollHealthCheck() {
  if (healthCheckTimer) return; // Already polling

  healthCheckTimer = setInterval(async () => {
    const isHealthy = await checkHealth();
    
    if (isHealthy && isOffline) {
      isOffline = false;
      sessionStorage.removeItem('offline-banner-shown');
      toast.success('✅ API back online!');

      // Flush queued retries
      const queue = retryQueue;
      retryQueue = [];
      queue.forEach(fn => fn());

      // Stop polling
      if (healthCheckTimer) {
        clearInterval(healthCheckTimer);
        healthCheckTimer = null;
      }
    }
  }, 2000); // Check every 2 seconds
}

export function getOfflineStatus() {
  return isOffline;
}

export default api;
