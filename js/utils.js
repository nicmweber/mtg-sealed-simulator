// College definitions for Secrets of Strixhaven
export const COLLEGES = {
  silverquill: {
    name: 'Silverquill',
    colors: ['W', 'B'],
    mechanic: 'Repartee',
    themes: ['aggro', 'tempo', 'evasion', 'flying'],
    icon: 'WB',
    description: 'White/Black — Tempo and evasion with Repartee'
  },
  lorehold: {
    name: 'Lorehold',
    colors: ['R', 'W'],
    mechanic: 'Flashback',
    themes: ['graveyard', 'value', 'go-wide', 'tokens'],
    icon: 'RW',
    description: 'Red/White — Graveyard value with Flashback'
  },
  prismari: {
    name: 'Prismari',
    colors: ['U', 'R'],
    mechanic: 'Opus',
    themes: ['spells-matter', 'big-mana', 'copying', 'instants', 'sorceries'],
    icon: 'UR',
    description: 'Blue/Red — Spells-matter with Opus'
  },
  quandrix: {
    name: 'Quandrix',
    colors: ['G', 'U'],
    mechanic: 'Increment',
    themes: ['counters', 'ramp', 'card-draw', '+1/+1'],
    icon: 'GU',
    description: 'Green/Blue — Counters and growth with Increment'
  },
  witherbloom: {
    name: 'Witherbloom',
    colors: ['B', 'G'],
    mechanic: 'Infusion',
    themes: ['lifegain', 'sacrifice', 'graveyard', 'death-triggers'],
    icon: 'BG',
    description: 'Black/Green — Life manipulation with Infusion'
  }
};

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

// Mana symbol regex patterns
const MANA_SYMBOL_RE = /\{([WUBRGCX0-9]+)\}/g;

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

    // Also check if the card has the college's mechanic keyword
    if (card.keywords?.includes(college.mechanic)) {
      if (!colleges.includes(key)) colleges.push(key);
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
