export function getTagSuggestions(currentTags: string[]): string[] {
  const seen = new Set<string>();
  // Start with tags observed on current items
  currentTags.forEach((t) => t && seen.add(t));

  // Merge explicit suggestions if present in localStorage
  try {
    const raw = localStorage.getItem('boltest:tagSuggestions');
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        arr.forEach((t) => typeof t === 'string' && seen.add(t));
      }
    }
  } catch {
    // ignore parse errors
  }

  // Merge tag history collected from user selections
  try {
    const rawHist = localStorage.getItem('boltest:tagHistory');
    if (rawHist) {
      const arr = JSON.parse(rawHist);
      if (Array.isArray(arr)) {
        arr.forEach((t) => typeof t === 'string' && seen.add(t));
      }
    }
  } catch {
    // ignore parse errors
  }

  return Array.from(seen).sort((a, b) => a.localeCompare(b));
}

export function saveTagHistory(tag: string): void {
  if (!tag) return;
  try {
    const rawHist = localStorage.getItem('boltest:tagHistory');
    const arr: string[] = rawHist ? (JSON.parse(rawHist) || []) : [];
    if (!arr.includes(tag)) {
      arr.push(tag);
      localStorage.setItem('boltest:tagHistory', JSON.stringify(arr));
    }
  } catch {
    // ignore storage issues
  }
}
