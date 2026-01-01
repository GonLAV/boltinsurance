const fs = require('fs');
const path = require('path');

const STORE_PATH = path.join(__dirname, '..', 'data', 'mirror.json');

function ensureDir() {
  const dir = path.dirname(STORE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function load() {
  try {
    if (!fs.existsSync(STORE_PATH)) return { testCases: [] };
    const raw = fs.readFileSync(STORE_PATH, 'utf8');
    const json = JSON.parse(raw || '{}');
    if (!Array.isArray(json.testCases)) json.testCases = [];
    return json;
  } catch {
    return { testCases: [] };
  }
}

function save(data) {
  ensureDir();
  fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), 'utf8');
}

function upsertTestCase(record) {
  const db = load();
  const key = record.localId || record.testCaseId;
  const idx = db.testCases.findIndex((t) => (t.localId || t.testCaseId) === key);
  const merged = { ...db.testCases[idx], ...record, updatedAt: new Date().toISOString() };
  if (idx >= 0) db.testCases[idx] = merged;
  else db.testCases.unshift(merged);
  save(db);
  return merged;
}

function findByStory(query) {
  const db = load();
  const q = String(query || '').toLowerCase();
  return db.testCases.filter((t) => {
    if (!q) return true;
    const storyIdMatch = String(t.userStoryId || '') === q;
    const storyTitleMatch = String(t.userStoryTitle || '').toLowerCase().includes(q);
    return storyIdMatch || storyTitleMatch;
  });
}

module.exports = {
  load,
  upsertTestCase,
  findByStory,
  STORE_PATH,
};
