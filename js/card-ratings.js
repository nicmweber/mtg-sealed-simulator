import { isCreature, isSpell } from './utils.js';

// Expected vanilla stats (power + toughness) at each CMC
const VANILLA_STATS = { 0: 1, 1: 2, 2: 4, 3: 5, 4: 7, 5: 8, 6: 10, 7: 11, 8: 12 };

// Keyword value scores for limited
const KEYWORD_VALUES = {
  'Flying': 8,
  'Deathtouch': 7,
  'First strike': 5,
  'Double strike': 10,
  'Menace': 5,
  'Lifelink': 5,
  'Ward': 4,
  'Flash': 4,
  'Trample': 4,
  'Vigilance': 3,
  'Haste': 3,
  'Reach': 2,
  'Hexproof': 6,
  'Indestructible': 8,
  'Prowess': 4
};

// Oracle text patterns and their value scores
const TEXT_PATTERNS = [
  { pattern: /destroy target (creature|permanent)/i, score: 14, tag: 'removal' },
  { pattern: /exile target (creature|permanent)/i, score: 15, tag: 'removal' },
  { pattern: /deals? \d+ damage to (any target|target creature)/i, score: 10, tag: 'removal' },
  { pattern: /target creature gets? [+-]\d+\/[+-]\d+ until/i, score: 6, tag: 'combat-trick' },
  { pattern: /return target (creature|permanent|nonland) .* to .* owner's hand/i, score: 6, tag: 'bounce' },
  { pattern: /draw (a|two|\d+) cards?/i, score: 9, tag: 'card-draw' },
  { pattern: /draw a card/i, score: 6, tag: 'card-draw' },
  { pattern: /create .* \d+\/\d+ .* token/i, score: 7, tag: 'tokens' },
  { pattern: /counter target (spell|creature spell|noncreature)/i, score: 7, tag: 'counterspell' },
  { pattern: /\+1\/\+1 counter/i, score: 4, tag: 'counters' },
  { pattern: /each opponent/i, score: 4, tag: 'multiplayer-value' },
  { pattern: /search your library/i, score: 5, tag: 'tutor' },
  { pattern: /gains? you \d+ life/i, score: 2, tag: 'lifegain' },
  { pattern: /you gain life/i, score: 2, tag: 'lifegain' },
  { pattern: /can't be blocked/i, score: 6, tag: 'evasion' },
  { pattern: /enters the battlefield/i, score: 3, tag: 'etb' },
  { pattern: /whenever .* dies/i, score: 4, tag: 'death-trigger' },
  { pattern: /whenever you cast/i, score: 4, tag: 'cast-trigger' },
  { pattern: /sacrifice/i, score: 2, tag: 'sacrifice' },
  { pattern: /equipped creature gets/i, score: 3, tag: 'equipment' },
  { pattern: /transform|prepare/i, score: 3, tag: 'transform' },
  { pattern: /all creatures get|creatures you control get/i, score: 6, tag: 'anthem' },
  { pattern: /destroy all|exile all/i, score: 12, tag: 'board-wipe' },
  { pattern: /fight/i, score: 5, tag: 'fight' }
];

/**
 * Score a card's base rarity value (0-15)
 */
function scoreRarity(card) {
  switch (card.rarity) {
    case 'mythic': return 15;
    case 'rare': return 12;
    case 'uncommon': return 8;
    case 'common': return 4;
    default: return 4;
  }
}

/**
 * Score creature stat efficiency (0-20)
 */
function scoreStats(card) {
  if (!isCreature(card)) return 10; // Non-creatures get baseline

  const power = parseInt(card.power) || 0;
  const toughness = parseInt(card.toughness) || 0;
  const cmc = Math.min(Math.max(card.cmc, 0), 8);
  const expected = VANILLA_STATS[cmc] || VANILLA_STATS[8];
  const actual = power + toughness;
  const diff = actual - expected;

  // Scale: each point above/below vanilla is worth ~3 rating points
  return Math.max(0, Math.min(20, 10 + diff * 3));
}

/**
 * Score keywords (0-20)
 */
function scoreKeywords(card) {
  let total = 0;
  for (const keyword of (card.keywords || [])) {
    total += KEYWORD_VALUES[keyword] || 0;
  }
  return Math.min(20, total);
}

/**
 * Score oracle text patterns (0-25)
 */
function scoreOracleText(card) {
  const text = card.oracle_text || '';
  let total = 0;
  const tags = new Set();

  for (const { pattern, score, tag } of TEXT_PATTERNS) {
    if (pattern.test(text)) {
      total += score;
      tags.add(tag);
    }
  }

  return { score: Math.min(25, total), tags: [...tags] };
}

/**
 * Score CMC curve position (0-10)
 */
function scoreCurve(card) {
  if (!isCreature(card) && !isSpell(card)) return 5; // lands, artifacts, etc.

  const cmc = card.cmc;
  if (cmc === 2) return 8;
  if (cmc === 3) return 7;
  if (cmc === 4) return 5;
  if (cmc === 1) return 4;
  if (cmc === 5) return 4;
  if (cmc === 6) return 2;
  if (cmc >= 7) return 1;
  if (cmc === 0) return 3;
  return 3;
}

/**
 * Score college mechanic bonus (0-10)
 */
function scoreCollegeMechanic(card) {
  const mechanics = ['Repartee', 'Flashback', 'Opus', 'Increment', 'Infusion', 'Prepared'];
  let bonus = 0;
  for (const kw of (card.keywords || [])) {
    if (mechanics.includes(kw)) {
      bonus += 5;
    }
  }
  return Math.min(10, bonus);
}

/**
 * Convert numeric score to letter grade
 */
function scoreToGrade(score) {
  if (score >= 75) return 'A+';
  if (score >= 65) return 'A';
  if (score >= 58) return 'A-';
  if (score >= 52) return 'B+';
  if (score >= 46) return 'B';
  if (score >= 40) return 'B-';
  if (score >= 35) return 'C+';
  if (score >= 30) return 'C';
  if (score >= 25) return 'C-';
  if (score >= 20) return 'D+';
  if (score >= 15) return 'D';
  if (score >= 10) return 'D-';
  return 'F';
}

/**
 * Rate a single card
 */
export function rateCard(card) {
  const rarityScore = scoreRarity(card);
  const statsScore = scoreStats(card);
  const keywordScore = scoreKeywords(card);
  const { score: textScore, tags } = scoreOracleText(card);
  const curveScore = scoreCurve(card);
  const mechanicScore = scoreCollegeMechanic(card);

  const totalScore = rarityScore + statsScore + keywordScore + textScore + curveScore + mechanicScore;

  return {
    score: totalScore,
    grade: scoreToGrade(totalScore),
    tags
  };
}

/**
 * Rate all cards in the set, mutating each card to add rating fields
 */
export function rateAllCards(cards) {
  for (const card of cards) {
    // Skip basic lands
    if (card.type_line?.includes('Basic Land')) {
      card.rating_score = 0;
      card.rating = 'F';
      card.synergy_tags = ['land'];
      continue;
    }

    const { score, grade, tags } = rateCard(card);
    card.rating_score = score;
    card.rating = grade;
    card.synergy_tags = tags;
  }
}
