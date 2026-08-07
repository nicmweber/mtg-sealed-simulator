import { SET_CONFIG } from './set-config.js';

const LIVE_POOL_KEY = `${SET_CONFIG.code}_live_pool`;

/**
 * Score how well a card name matches a query.
 * Higher = better. -1 = no match.
 */
function fuzzyScore(name, query) {
  const n = name.toLowerCase();
  const q = query.toLowerCase().trim();
  if (!q) return -1;

  if (n === q) return 1000;
  if (n.startsWith(q)) return 900 - n.length;

  // Word-prefix: "bar" matches "The Barrel", "gan" matches "Gandalf, Spark Starter"
  const words = n.split(/[\s,\-']+/);
  const wordIdx = words.findIndex(w => w.startsWith(q));
  if (wordIdx !== -1) return 700 - wordIdx * 10 - n.length * 0.1;

  if (n.includes(q)) return 500 - n.indexOf(q);

  // Multi-token: every token must appear somewhere ("thor mount" -> "Thorin, Mountain-king")
  const tokens = q.split(/\s+/).filter(Boolean);
  if (tokens.length > 1 && tokens.every(t => n.includes(t))) {
    return 400 - n.length;
  }

  // Subsequence: letters appear in order ("smg" -> "Smaug")
  let i = 0;
  for (const ch of n) {
    if (ch === q[i]) i++;
    if (i === q.length) break;
  }
  if (i === q.length) return 200 - (n.length - q.length);

  return -1;
}

/**
 * Fuzzy search the card list. Returns top `limit` matches, best first.
 */
export function fuzzySearchCards(allCards, query, limit = 8) {
  if (!query || !query.trim()) return [];
  const scored = [];
  for (const card of allCards) {
    if ((card.type_line || '').includes('Basic Land')) continue;
    const score = fuzzyScore(card.name, query);
    if (score >= 0) scored.push({ card, score });
  }
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(s => s.card);
}

/**
 * Persist the live pool as an array of card ids (duplicates preserved).
 */
export function saveLivePool(cards) {
  try {
    localStorage.setItem(LIVE_POOL_KEY, JSON.stringify(cards.map(c => c.id)));
  } catch (e) {
    console.warn('Failed to save live pool:', e);
  }
}

/**
 * Restore the live pool from storage, resolving ids against the card list.
 */
export function loadLivePool(allCards) {
  try {
    const raw = localStorage.getItem(LIVE_POOL_KEY);
    if (!raw) return [];
    const ids = JSON.parse(raw);
    const byId = new Map(allCards.map(c => [c.id, c]));
    return ids.map(id => byId.get(id)).filter(Boolean);
  } catch (e) {
    console.warn('Failed to load live pool:', e);
    return [];
  }
}

export function clearLivePool() {
  localStorage.removeItem(LIVE_POOL_KEY);
}
