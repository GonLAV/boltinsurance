const fs = require('fs');
const path = require('path');

/**
 * Simple persistent disk cache with TTL and stale fallback.
 * Stores JSON payloads under data/cache keyed by SHA1 of cache key.
 */
class DiskCache {
  constructor(baseDir) {
    this.baseDir = baseDir || path.join(process.cwd(), 'data', 'cache');
    this.ensureDir(this.baseDir);
  }

  ensureDir(dir) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch {}
  }

  keyToPath(key) {
    const crypto = require('crypto');
    const hash = crypto.createHash('sha1').update(String(key)).digest('hex');
    return path.join(this.baseDir, `${hash}.json`);
  }

  get(key, ttlSeconds) {
    const file = this.keyToPath(key);
    try {
      const raw = fs.readFileSync(file, 'utf8');
      const obj = JSON.parse(raw);
      const ageMs = Date.now() - (obj.ts || 0);
      const valid = typeof ttlSeconds === 'number' ? ageMs < ttlSeconds * 1000 : true;
      return { exists: true, valid, ageMs, value: obj.value, ts: obj.ts };
    } catch {
      return { exists: false };
    }
  }

  set(key, value) {
    const file = this.keyToPath(key);
    const payload = { ts: Date.now(), value };
    try {
      this.ensureDir(this.baseDir);
      fs.writeFileSync(file, JSON.stringify(payload));
      return true;
    } catch {
      return false;
    }
  }
}

module.exports = DiskCache;
