export interface GuideHistoryEntry {
  id: string;
  timestamp: number;
  name: string;
  guide: string;
  engine: string;
}

const HISTORY_KEY = 'wfr_history';
const MAX_ENTRIES = 30;

// ── Extract a readable name from the guide markdown ──────────────────────────
function generateName(guide: string): string {
  const headingMatch = guide.match(/^#{1,3}\s+(.+)$/m);
  if (headingMatch) {
    return headingMatch[1].replace(/[*_`#]/g, '').trim().slice(0, 70);
  }
  const firstLine = guide
    .split('\n')
    .find((l) => l.trim().length > 3)
    ?.trim()
    .replace(/^#+\s*/, '')
    .replace(/[*_`]/g, '')
    .trim() ?? '';
  return firstLine.slice(0, 70) || 'Guía sin título';
}

// ── CRUD helpers ─────────────────────────────────────────────────────────────

export function loadHistory(): GuideHistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as GuideHistoryEntry[]) : [];
  } catch {
    return [];
  }
}

export function saveToHistory(guide: string, engine: string): GuideHistoryEntry {
  const entry: GuideHistoryEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: Date.now(),
    name: generateName(guide),
    guide,
    engine,
  };
  const history = loadHistory();
  const updated = [entry, ...history].slice(0, MAX_ENTRIES);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  return entry;
}

export function deleteHistoryEntry(id: string): GuideHistoryEntry[] {
  const updated = loadHistory().filter((e) => e.id !== id);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  return updated;
}

// ── Relative time helper ─────────────────────────────────────────────────────

export function relativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `hace ${days}d`;
}

// ── Engine display helper ─────────────────────────────────────────────────────

export function engineLabel(engine: string): string {
  const map: Record<string, string> = {
    anthropic: '🟣 Claude',
    openai: '🟢 GPT-4o',
    gemini: '🔵 Gemini',
    'gemini-or': '🔷 Gemini (OR)',
    openrouter: '🔶 OpenRouter',
    compare: '⚖️ Compare',
    deepseek: '🟠 DeepSeek',
    llama: '🦙 Llama',
    kimi: '🌙 Kimi',
  };
  return map[engine] ?? `✦ ${engine}`;
}
