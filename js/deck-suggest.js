import { COLLEGES, isCreature, suggestLands } from './utils.js';

const DECK_SIZE = 23;       // nonland cards in a 40-card sealed deck
const MIN_CREATURES = 13;   // sealed decks want a real creature count
const MAX_TOP_END = 4;      // cap on CMC >= 6 cards

/**
 * Build a recommended 23-card deck for one archetype from the pool.
 * Greedy by rating with a creature floor and a top-end cap.
 */
function buildDeckForArchetype(archetypeKey, archetype, pool) {
  const colorSet = new Set(archetype.colors);

  // Playables: on-color or colorless, nonland
  const candidates = pool.filter(c => {
    if ((c.type_line || '').includes('Land')) return false;
    const colors = c.color_identity || c.colors || [];
    return colors.every(col => colorSet.has(col));
  });

  const sorted = [...candidates].sort((a, b) => (b.rating_score || 0) - (a.rating_score || 0));
  const deck = sorted.slice(0, DECK_SIZE);
  const bench = sorted.slice(DECK_SIZE);

  // Enforce creature floor: swap worst noncreatures for best benched creatures
  let creatureCount = deck.filter(isCreature).length;
  if (creatureCount < MIN_CREATURES) {
    const benchCreatures = bench.filter(isCreature);
    const nonCreatures = deck
      .filter(c => !isCreature(c))
      .sort((a, b) => (a.rating_score || 0) - (b.rating_score || 0));
    for (const weak of nonCreatures) {
      if (creatureCount >= MIN_CREATURES || benchCreatures.length === 0) break;
      const replacement = benchCreatures.shift();
      deck[deck.indexOf(weak)] = replacement;
      creatureCount++;
    }
  }

  // Cap the top end: swap extra 6+ CMC cards for best benched cheap cards
  const deckIds = new Set(deck);
  const topEnd = deck
    .filter(c => c.cmc >= 6)
    .sort((a, b) => (a.rating_score || 0) - (b.rating_score || 0));
  if (topEnd.length > MAX_TOP_END) {
    const cheapBench = bench.filter(c => c.cmc <= 5 && !deckIds.has(c));
    let excess = topEnd.length - MAX_TOP_END;
    for (const heavy of topEnd) {
      if (excess === 0 || cheapBench.length === 0) break;
      const replacement = cheapBench.shift();
      deck[deck.indexOf(heavy)] = replacement;
      excess--;
    }
  }

  const avgScore = deck.length > 0
    ? deck.reduce((s, c) => s + (c.rating_score || 0), 0) / deck.length
    : 0;

  return {
    key: archetypeKey,
    name: archetype.name,
    colors: archetype.colors,
    mechanic: archetype.mechanic,
    deck: deck.sort((a, b) => a.cmc - b.cmc || a.name.localeCompare(b.name)),
    playableCount: candidates.length,
    complete: deck.length >= DECK_SIZE,
    creatures: deck.filter(isCreature).length,
    avgScore: Math.round(avgScore * 10) / 10,
    lands: suggestLands(deck)
  };
}

/**
 * Build a recommended deck for every archetype, ranked by average card quality.
 */
export function buildArchetypeDecks(pool) {
  return Object.entries(COLLEGES)
    .map(([key, arch]) => buildDeckForArchetype(key, arch, pool))
    .sort((a, b) => {
      // Incomplete decks rank below complete ones regardless of average
      if (a.complete !== b.complete) return a.complete ? -1 : 1;
      return b.avgScore - a.avgScore;
    });
}
