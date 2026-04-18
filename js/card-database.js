import { COLLEGES, isCreature, isSpell } from './utils.js';

// Tag-pair synergy table: when target has tag A, partners with tag B synergize
const TAG_SYNERGIES = {
  'death-trigger': ['sacrifice', 'tokens'],
  'sacrifice': ['death-trigger', 'etb', 'tokens'],
  'tokens': ['anthem', 'sacrifice'],
  'etb': ['bounce', 'tokens'],
  'bounce': ['etb', 'cast-trigger'],
  'cast-trigger': ['bounce'],
  'lifegain': ['lifegain'],
  'counters': ['counters'],
  'card-draw': ['cast-trigger'],
  'equipment': ['evasion'],
  'combat-trick': ['evasion', 'fight'],
  'removal': [],     // removal is always welcome, but doesn't pair with specific tags
  'anthem': ['tokens'],
  'fight': ['combat-trick'],
  'tutor': ['card-draw']
};

// Friendly reason labels for each tag
const TAG_REASONS = {
  'death-trigger': 'Death-trigger payoff',
  'sacrifice': 'Sacrifice outlet',
  'tokens': 'Token fodder / support',
  'etb': 'ETB effect',
  'bounce': 'Bounce / replay',
  'cast-trigger': 'Spells-matter enabler',
  'lifegain': 'Lifegain support',
  'counters': '+1/+1 counter synergy',
  'card-draw': 'Card draw',
  'equipment': 'Equipment target',
  'combat-trick': 'Combat trick',
  'removal': 'Removal',
  'anthem': 'Anthem',
  'fight': 'Fight effect',
  'tutor': 'Tutor'
};

// College → archetype theme tags
const COLLEGE_TAG_AFFINITY = {
  silverquill: ['tokens', 'anthem', 'evasion', 'combat-trick'],
  lorehold: ['tokens', 'anthem', 'death-trigger', 'card-draw'],
  prismari: ['cast-trigger', 'card-draw', 'bounce', 'counterspell'],
  quandrix: ['counters', 'card-draw', 'tokens'],
  witherbloom: ['death-trigger', 'sacrifice', 'lifegain', 'card-draw']
};

/**
 * Check if card's color identity is compatible with target's colors
 * Returns: 2 (full match), 1 (shares color), -2 (fully off-color), 0 (colorless)
 */
function colorCompatibility(target, partner) {
  const targetColors = target.color_identity || target.colors || [];
  const partnerColors = partner.color_identity || partner.colors || [];

  if (partnerColors.length === 0) return 0;  // colorless works anywhere
  if (targetColors.length === 0) return 0;

  const shared = partnerColors.filter(c => targetColors.includes(c));
  if (shared.length === partnerColors.length) return 2;  // partner fully on-color
  if (shared.length > 0) return 1;                       // shares at least one
  return -2;                                              // fully off-color
}

/**
 * Find cards in allCards that synergize with the target card.
 * Returns top 8 sorted by synergy score.
 */
export function findCardSynergies(targetCard, allCards) {
  if (!targetCard.synergy_tags || targetCard.synergy_tags.length === 0) {
    return findCardSynergiesByText(targetCard, allCards);
  }

  const results = [];
  const text = (targetCard.oracle_text || '').toLowerCase();

  for (const partner of allCards) {
    if (partner.id === targetCard.id) continue;
    if (partner.type_line?.includes('Basic Land')) continue;

    let score = 0;
    const reasons = new Set();

    // Tag-pair matches
    for (const targetTag of targetCard.synergy_tags) {
      const compatibleTags = TAG_SYNERGIES[targetTag] || [];
      for (const compatTag of compatibleTags) {
        if (partner.synergy_tags?.includes(compatTag)) {
          score += 3;
          reasons.add(TAG_REASONS[compatTag] || compatTag);
        }
      }
    }

    // Text bridges
    if (/whenever a creature dies|whenever .* dies/i.test(text) &&
        partner.synergy_tags?.includes('sacrifice')) {
      score += 5;
      reasons.add('Sacrifice outlet for death-triggers');
    }
    if (/whenever you cast (an )?instant or sorcery/i.test(text) && isSpell(partner)) {
      score += 5;
      reasons.add('Spells-matter trigger');
    }
    if (/create .* token/i.test(text) && partner.synergy_tags?.includes('anthem')) {
      score += 4;
      reasons.add('Anthem for your tokens');
    }
    if (/whenever you gain life/i.test(text) && partner.synergy_tags?.includes('lifegain')) {
      score += 5;
      reasons.add('Lifegain trigger');
    }
    if (/\+1\/\+1 counter/i.test(text) && partner.synergy_tags?.includes('counters')) {
      score += 4;
      reasons.add('+1/+1 counter synergy');
    }

    // Color compatibility
    const colorScore = colorCompatibility(targetCard, partner);
    score += colorScore;

    // Rating bonus — prefer strong partners
    score += Math.max(0, (partner.rating_score - 40) / 20);

    if (score >= 3 && reasons.size > 0) {
      results.push({
        card: partner,
        score,
        reasons: [...reasons].slice(0, 2)  // max 2 reasons per card
      });
    }
  }

  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
}

/**
 * Fallback: find synergies for a card with no tags, by color identity + rarity
 */
function findCardSynergiesByText(targetCard, allCards) {
  const targetColors = targetCard.color_identity || targetCard.colors || [];
  if (targetColors.length === 0) return [];

  const results = allCards
    .filter(c => c.id !== targetCard.id && !c.type_line?.includes('Basic Land'))
    .map(c => {
      const colorScore = colorCompatibility(targetCard, c);
      if (colorScore < 1) return null;
      return {
        card: c,
        score: colorScore + Math.max(0, (c.rating_score - 40) / 20),
        reasons: ['Color match']
      };
    })
    .filter(Boolean);

  return results.sort((a, b) => b.score - a.score).slice(0, 8);
}

/**
 * Determine which college a card best fits.
 * Returns { collegeKey, name, colors, score, reason }
 */
export function bestArchetypeForCard(card) {
  const cardColors = card.color_identity || card.colors || [];

  // Colorless / artifact
  if (cardColors.length === 0) {
    return {
      collegeKey: 'splash',
      name: 'Splashable',
      colors: [],
      score: 0,
      reason: 'Colorless cards fit into any archetype.'
    };
  }

  const collegeScores = {};
  const reasons = {};

  for (const [key, college] of Object.entries(COLLEGES)) {
    let score = 0;
    const reasonParts = [];

    // Exact 2-color match
    const exactMatch = cardColors.length === 2 &&
      college.colors.every(c => cardColors.includes(c)) &&
      cardColors.every(c => college.colors.includes(c));
    if (exactMatch) {
      score += 10;
      reasonParts.push(`Exact ${college.colors.join('/')} color match`);
    }

    // Has college mechanic
    if (card.keywords?.includes(college.mechanic)) {
      score += 8;
      reasonParts.push(`has ${college.mechanic} mechanic`);
    }

    // Synergy tag affinity
    const affTags = COLLEGE_TAG_AFFINITY[key] || [];
    const matchedTags = (card.synergy_tags || []).filter(t => affTags.includes(t));
    if (matchedTags.length > 0) {
      score += 5 * matchedTags.length;
      reasonParts.push(`${matchedTags.join(', ')} fits ${college.name}`);
    }

    // Mono-color in college colors
    if (cardColors.length === 1 && college.colors.includes(cardColors[0])) {
      score += 4;
      reasonParts.push('mono-color in college');
    }

    // Theme keywords in oracle text
    const text = (card.oracle_text || '').toLowerCase();
    const themeMatches = (college.themes || []).filter(t => text.includes(t));
    if (themeMatches.length > 0) {
      score += 3 * themeMatches.length;
      reasonParts.push(`theme keywords: ${themeMatches.join(', ')}`);
    }

    collegeScores[key] = score;
    reasons[key] = reasonParts;
  }

  // Find the top college
  const topKey = Object.entries(collegeScores).sort((a, b) => b[1] - a[1])[0][0];
  const topCollege = COLLEGES[topKey];
  const topScore = collegeScores[topKey];
  const topReasons = reasons[topKey];

  return {
    collegeKey: topKey,
    name: topCollege.name,
    colors: topCollege.colors,
    score: topScore,
    reason: topReasons.length > 0
      ? topReasons.join('; ') + '.'
      : `${topCollege.name} (${topCollege.colors.join('/')}): best color fit.`
  };
}

/**
 * Substring search on name + oracle text, case-insensitive.
 */
export function searchCards(allCards, query) {
  if (!query) return [...allCards];
  const q = query.toLowerCase();
  return allCards.filter(card => {
    if (card.name.toLowerCase().includes(q)) return true;
    if ((card.oracle_text || '').toLowerCase().includes(q)) return true;
    if ((card.type_line || '').toLowerCase().includes(q)) return true;
    return false;
  });
}
