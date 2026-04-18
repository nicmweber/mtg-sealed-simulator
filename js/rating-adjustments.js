import { scoreToGrade } from './card-ratings.js';
import { isCreature, getCardColleges } from './utils.js';

const OVERRIDES_KEY = 'mtg-sos-rating-overrides';

// Prerelease tier bonuses based on Reddit megathread player feedback
const TIER_BONUS = {
  lorehold: 4,      // Tier 1 — aggressive, fast
  silverquill: 4,   // Tier 1 — cohesive, fast
  prismari: 0,      // Tier 2 — situational
  witherbloom: 0,   // Tier 2 — grindy, needs support
  quandrix: -4      // Tier 3 — underperformed
};

export const GRADE_CYCLE = [
  'A+', 'A', 'A-',
  'B+', 'B', 'B-',
  'C+', 'C', 'C-',
  'D+', 'D', 'D-',
  'F'
];

/**
 * Apply prerelease-informed adjustments to card ratings.
 * Run after rateAllCards(), before applyOverrides().
 */
export function applyPrereleaseAdjustments(cards) {
  for (const card of cards) {
    if (card.type_line?.includes('Basic Land')) continue;

    let delta = 0;
    const reasons = [];

    // College tier bonuses
    const colleges = getCardColleges(card);
    if (colleges.length > 0) {
      let collegeDelta = 0;
      for (const c of colleges) {
        collegeDelta += TIER_BONUS[c] || 0;
      }
      // Average if multi-college
      collegeDelta = Math.round(collegeDelta / colleges.length);
      if (collegeDelta !== 0) {
        delta += collegeDelta;
        const topCollege = colleges[0];
        const label = topCollege.charAt(0).toUpperCase() + topCollege.slice(1);
        reasons.push(`${label} tier: ${collegeDelta > 0 ? '+' : ''}${collegeDelta}`);
      }
    }

    // Instant-speed boost
    const text = card.oracle_text || '';
    if (card.type_line?.includes('Instant')) {
      delta += 2;
      reasons.push('Instant speed: +2');
    }
    if (card.keywords?.includes('Flash') || /\bflash\b/i.test(text)) {
      delta += 2;
      reasons.push('Flash: +2');
    }

    // Cheap aggressive creatures
    if (isCreature(card) && card.cmc <= 2) {
      const power = parseInt(card.power) || 0;
      if (power >= 2) {
        delta += 2;
        reasons.push('Cheap aggro (2+ power at CMC ≤2): +2');
      }
      if (card.keywords?.includes('Haste')) {
        delta += 2;
        reasons.push('Haste on cheap creature: +2');
      }
    }

    // Apply delta
    if (delta !== 0) {
      card.rating_score = (card.rating_score_base ?? card.rating_score) + delta;
      card.rating = scoreToGrade(card.rating_score);
      card.rating_computed = card.rating;  // update computed (pre-override) grade
      card.rating_adjustment = delta;
      card.rating_adjustment_reasons = reasons;
    } else {
      card.rating_adjustment = 0;
      card.rating_adjustment_reasons = [];
    }
  }
}

/**
 * Load user overrides from localStorage
 */
export function loadOverrides() {
  try {
    const raw = localStorage.getItem(OVERRIDES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.warn('Failed to load overrides:', e);
    return {};
  }
}

/**
 * Save a user override for a card
 */
export function saveOverride(cardId, grade) {
  const overrides = loadOverrides();
  overrides[cardId] = grade;
  try {
    localStorage.setItem(OVERRIDES_KEY, JSON.stringify(overrides));
  } catch (e) {
    console.warn('Failed to save override:', e);
  }
}

/**
 * Clear a user override for a card
 */
export function clearOverride(cardId) {
  const overrides = loadOverrides();
  delete overrides[cardId];
  try {
    localStorage.setItem(OVERRIDES_KEY, JSON.stringify(overrides));
  } catch (e) {
    console.warn('Failed to clear override:', e);
  }
}

/**
 * Apply stored user overrides to the card array.
 * Run last in the init chain.
 */
export function applyOverrides(cards) {
  const overrides = loadOverrides();
  for (const card of cards) {
    if (overrides[card.id]) {
      card.rating = overrides[card.id];
      card.rating_user_override = overrides[card.id];
    } else {
      card.rating_user_override = null;
    }
  }
}

/**
 * Apply a single override immediately to a card in memory and save it.
 * Returns the new grade.
 */
export function overrideCardRating(card, newGrade) {
  card.rating = newGrade;
  card.rating_user_override = newGrade;
  saveOverride(card.id, newGrade);
  return newGrade;
}

/**
 * Clear a single card's override, reverting to computed grade.
 */
export function resetCardRating(card) {
  card.rating = card.rating_computed;
  card.rating_user_override = null;
  clearOverride(card.id);
  return card.rating;
}

/**
 * Get the next grade in the cycle
 */
export function cycleGrade(grade) {
  const idx = GRADE_CYCLE.indexOf(grade);
  if (idx === -1) return GRADE_CYCLE[0];
  return GRADE_CYCLE[(idx + 1) % GRADE_CYCLE.length];
}
