import { SET_CONFIG } from './set-config.js';

// Archetype definitions come from the active set configuration.
// (Historic name COLLEGES kept so downstream consumers don't all need renaming.)
export const COLLEGES = SET_CONFIG.archetypes;

// MTG color definitions
export const COLORS = {
  W: { name: 'White', hex: '#F9FAF4', darkHex: '#F0E68C', symbol: '{W}', order: 0 },
  U: { name: 'Blue', hex: '#0E68AB', darkHex: '#0E68AB', symbol: '{U}', order: 1 },
  B: { name: 'Black', hex: '#150B00', darkHex: '#A069A0', symbol: '{B}', order: 2 },
  R: { name: 'Red', hex: '#D3202A', darkHex: '#D3202A', symbol: '{R}', order: 3 },
  G: { name: 'Green', hex: '#00733E', darkHex: '#00733E', symbol: '{G}', order: 4 }
};

export const COLOR_ORDER = ['W', 'U', 'B', 'R', 'G'];

// Rarity definitions
export const RARITIES = {
  mythic: { name: 'Mythic Rare', order: 0, color: '#D35400', shortName: 'M' },
  rare: { name: 'Rare', order: 1, color: '#C9A83C', shortName: 'R' },
  uncommon: { name: 'Uncommon', order: 2, color: '#A8B5C0', shortName: 'U' },
  common: { name: 'Common', order: 3, color: '#1A1A1A', shortName: 'C' }
};

// Grade color mapping for rating badges
export const GRADE_COLORS = {
  'A+': '#1B5E20', 'A': '#2E7D32', 'A-': '#388E3C',
  'B+': '#1565C0', 'B': '#1976D2', 'B-': '#1E88E5',
  'C+': '#F57F17', 'C': '#F9A825', 'C-': '#FBC02D',
  'D+': '#BF360C', 'D': '#D84315', 'D-': '#E64A19',
  'F': '#B71C1C'
};

// Mana symbol regex patterns (includes hybrid symbols like {W/U})
const MANA_SYMBOL_RE = /\{([WUBRGCX0-9/]+)\}/g;

/**
 * Parse mana cost string into array of symbols
 * e.g. "{2}{G}{U}" => ["2", "G", "U"]
 */
export function parseManaSymbols(manaCost) {
  if (!manaCost) return [];
  const symbols = [];
  let match;
  const re = new RegExp(MANA_SYMBOL_RE.source, 'g');
  while ((match = re.exec(manaCost)) !== null) {
    symbols.push(match[1]);
  }
  return symbols;
}

/**
 * Render mana symbols as styled spans
 */
export function renderManaSymbols(manaCost) {
  if (!manaCost) return '';
  return manaCost.replace(/\{([^}]+)\}/g, (_, symbol) => {
    const cls = `mana-symbol mana-${symbol.toLowerCase()}`;
    return `<span class="${cls}">${symbol}</span>`;
  });
}

/**
 * Get the color category for sorting
 * Returns: 'W', 'U', 'B', 'R', 'G', 'multi', 'colorless'
 */
export function getColorCategory(colors) {
  if (!colors || colors.length === 0) return 'colorless';
  if (colors.length > 1) return 'multi';
  return colors[0];
}

/**
 * Get sort order for color categories
 */
export function getColorSortOrder(colors) {
  const cat = getColorCategory(colors);
  if (cat === 'colorless') return 6;
  if (cat === 'multi') return 5;
  return COLORS[cat]?.order ?? 6;
}

/**
 * Find which colleges a card belongs to based on color identity
 */
export function getCardColleges(card) {
  const colleges = [];
  for (const [key, college] of Object.entries(COLLEGES)) {
    const cardColors = card.color_identity || card.colors || [];
    const matchesColors = college.colors.every(c => cardColors.includes(c));
    const hasOnlyCollegeColors = cardColors.every(c => college.colors.includes(c));

    if (matchesColors || (cardColors.length > 0 && hasOnlyCollegeColors && cardColors.length <= 2)) {
      colleges.push(key);
    }

    // Also check the archetype's mechanic — by keyword, or by oracle text for
    // mechanics Scryfall doesn't list in `keywords` (via mechanicPattern)
    const hasMechanic = card.keywords?.includes(college.mechanic) ||
      (college.mechanicPattern && college.mechanicPattern.test(card.oracle_text || ''));
    if (hasMechanic && !colleges.includes(key)) {
      colleges.push(key);
    }
  }
  return colleges;
}

/**
 * Check if a card is a creature
 */
export function isCreature(card) {
  return card.type_line?.toLowerCase().includes('creature') ?? false;
}

/**
 * Check if a card is an instant or sorcery
 */
export function isSpell(card) {
  const type = card.type_line?.toLowerCase() ?? '';
  return type.includes('instant') || type.includes('sorcery');
}

/**
 * Shuffle an array in place (Fisher-Yates)
 */
export function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Pick n random items from array without replacement
 */
export function pickRandom(arr, n, exclude = new Set()) {
  const available = arr.filter(item => !exclude.has(item.name));
  shuffle(available);
  return available.slice(0, n);
}

// Basic land name per color
export const LAND_NAMES = { W: 'Plains', U: 'Island', B: 'Swamp', R: 'Mountain', G: 'Forest' };

/**
 * Count colored mana pips across a list of cards.
 * Hybrid symbols like {W/U} contribute 0.5 to each color.
 * Returns { W: n, U: n, B: n, R: n, G: n }
 */
export function countColoredPips(cards) {
  const pips = { W: 0, U: 0, B: 0, R: 0, G: 0 };
  for (const card of cards) {
    for (const symbol of parseManaSymbols(card.mana_cost)) {
      if (symbol.includes('/')) {
        const parts = symbol.split('/').filter(p => pips.hasOwnProperty(p));
        for (const p of parts) pips[p] += 1 / parts.length;
      } else if (pips.hasOwnProperty(symbol)) {
        pips[symbol] += 1;
      }
    }
  }
  return pips;
}

/**
 * Suggest a basic-land mana base for a deck of nonland cards.
 * - Land count: 40 minus deck size when the deck is close to complete,
 *   otherwise a curve-based target (16 low curve / 17 normal / 18 high).
 * - Distribution: proportional to colored pips, minimum 2 of any color
 *   with at least one pip (splash coverage).
 * Returns { total, counts: {W:n,...}, list: [{color, name, count}], text }
 */
export function suggestLands(deck) {
  const nonland = deck.filter(c => !(c.type_line || '').includes('Land'));
  const pips = countColoredPips(nonland);
  const totalPips = Object.values(pips).reduce((a, b) => a + b, 0);

  // Curve-based target
  const withCost = nonland.filter(c => c.cmc > 0);
  const avgCmc = withCost.length > 0
    ? withCost.reduce((s, c) => s + c.cmc, 0) / withCost.length
    : 3;
  const curveTarget = avgCmc <= 2.4 ? 16 : avgCmc >= 3.4 ? 18 : 17;

  // If deck is near-complete, fill exactly to 40; otherwise use curve target
  const total = (nonland.length >= 20 && nonland.length <= 26)
    ? Math.max(14, Math.min(20, 40 - deck.length))
    : curveTarget;

  const counts = { W: 0, U: 0, B: 0, R: 0, G: 0 };
  if (totalPips > 0) {
    // Proportional allocation
    const colors = COLOR_ORDER.filter(c => pips[c] > 0);
    let allocated = 0;
    for (const c of colors) {
      counts[c] = Math.max(2, Math.round((pips[c] / totalPips) * total));
      allocated += counts[c];
    }
    // Fix rounding drift: trim/add from the color with the most lands / most pips
    while (allocated !== total && colors.length > 0) {
      const sorted = [...colors].sort((a, b) => counts[b] - counts[a]);
      if (allocated > total) {
        const donor = sorted.find(c => counts[c] > 2) || sorted[0];
        counts[donor]--;
        allocated--;
      } else {
        counts[sorted[0]]++;
        allocated++;
      }
    }
  }

  const list = COLOR_ORDER
    .filter(c => counts[c] > 0)
    .map(c => ({ color: c, name: LAND_NAMES[c], count: counts[c] }));

  return {
    total,
    counts,
    list,
    text: list.map(l => `${l.count} ${l.name}`).join(', ') || 'No colored pips yet'
  };
}
