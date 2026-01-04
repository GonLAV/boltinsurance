// Simple in-memory cache with TTL
const cache = new Map();

function makeEntry(value, ttlSeconds) {
  const expiresAt = Date.now() + (ttlSeconds || 60) * 1000;
  return { value, expiresAt };
}

function get(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

function set(key, value, ttlSeconds = 60) {
  cache.set(key, makeEntry(value, ttlSeconds));
}

function del(key) {
  cache.delete(key);
}

function clear() {
  cache.clear();
}

module.exports = { get, set, del, clear };
