import { COLLEGES, isCreature, isSpell, getCardColleges } from './utils.js';

/**
 * Score how well a pool fits each college archetype
 * Returns sorted array of { key, name, score, percentage, mechanic, description }
 */
export function detectCollegeAffinity(pool) {
  const results = [];

  for (const [key, college] of Object.entries(COLLEGES)) {
    let score = 0;
    let cardCount = 0;

    for (const card of pool) {
      const colors = card.color_identity || card.colors || [];
      if (colors.length === 0) continue;

      // Exact color pair match: +3
      const exactMatch = college.colors.length === 2 &&
        colors.length === 2 &&
        college.colors.every(c => colors.includes(c)) &&
        colors.every(c => college.colors.includes(c));

      if (exactMatch) {
        score += 3;
        cardCount++;
        continue;
      }

      // Has college mechanic keyword: +3
      if (card.keywords?.includes(college.mechanic)) {
        score += 3;
        cardCount++;
        continue;
      }

      // Mono-colored in one of the college's colors: +1.5
      if (colors.length === 1 && college.colors.includes(colors[0])) {
        score += 1.5;
        cardCount++;
        continue;
      }

      // Multicolor but shares at least one college color: +0.5
      if (colors.some(c => college.colors.includes(c))) {
        score += 0.5;
      }
    }

    // Bonus for college theme keywords in oracle text
    for (const card of pool) {
      const text = (card.oracle_text || '').toLowerCase();
      for (const theme of college.themes) {
        if (text.includes(theme)) {
          score += 0.3;
        }
      }
    }

    // Normalize to percentage (max reasonable score ~150 for a heavy two-color pool)
    const maxScore = pool.length * 2;
    const percentage = Math.min(100, Math.round((score / maxScore) * 100));

    results.push({
      key,
      name: college.name,
      colors: college.colors,
      mechanic: college.mechanic,
      description: college.description,
      score,
      percentage,
      cardCount
    });
  }

  return results.sort((a, b) => b.score - a.score);
}

/**
 * Find specific synergies within the pool
 * Returns array of { name, description, cards[], strength }
 */
export function findSynergies(pool) {
  const synergies = [];

  // Count card types
  const creatures = pool.filter(isCreature);
  const spells = pool.filter(isSpell);
  const removalCards = pool.filter(c => c.synergy_tags?.includes('removal'));
  const tokenCards = pool.filter(c => c.synergy_tags?.includes('tokens'));
  const counterCards = pool.filter(c => c.synergy_tags?.includes('counters'));
  const drawCards = pool.filter(c => c.synergy_tags?.includes('card-draw'));
  const lifegainCards = pool.filter(c => c.synergy_tags?.includes('lifegain'));
  const deathTriggerCards = pool.filter(c => c.synergy_tags?.includes('death-trigger'));
  const sacrificeCards = pool.filter(c => c.synergy_tags?.includes('sacrifice'));
  const etbCards = pool.filter(c => c.synergy_tags?.includes('etb'));
  const empowerCards = pool.filter(c => c.synergy_tags?.includes('empower-jace'));
  const preparedCards = pool.filter(c => c.synergy_tags?.includes('prepared') || c.layout === 'prepare');
  const surveilCards = pool.filter(c => c.synergy_tags?.includes('surveil'));
  const surveilPayoffs = pool.filter(c => c.synergy_tags?.includes('surveil-payoff'));
  const thresholdCards = pool.filter(c => c.synergy_tags?.includes('threshold'));
  const millCards = pool.filter(c => c.synergy_tags?.includes('mill'));
  const burnCards = pool.filter(c => c.synergy_tags?.includes('burn'));
  const burnPayoffs = pool.filter(c => c.synergy_tags?.includes('burn-payoff'));
  const rampCards = pool.filter(c => c.synergy_tags?.includes('ramp'));
  const treasureCards = pool.filter(c => c.synergy_tags?.includes('treasure'));
  const flashbackCards = pool.filter(c => c.keywords?.includes('Flashback'));

  // Empower Jace — the set's connective tissue
  if (empowerCards.length >= 2) {
    const jaceLands = pool.filter(c =>
      (c.oracle_text || '').includes('unless you control a planeswalker')
    );
    synergies.push({
      name: 'Empower Jace',
      description: `${empowerCards.length} Empower Jace source(s) — shared loyalty engine${jaceLands.length > 0 ? `, and your ${jaceLands.length} Annex/Commons land(s) enter untapped with a Jace out` : ''}`,
      cards: [...empowerCards.map(c => c.name), ...jaceLands.map(c => c.name)],
      strength: Math.min(10, empowerCards.length * 2 + jaceLands.length)
    });
  }

  // Surveil / scry payoffs (Fatehold)
  if (surveilCards.length >= 3 && surveilPayoffs.length >= 1) {
    synergies.push({
      name: 'Scry & Surveil (Fatehold)',
      description: `${surveilCards.length} surveil/scry source(s) feeding ${surveilPayoffs.length} payoff(s)`,
      cards: [...surveilPayoffs.map(c => c.name), ...surveilCards.slice(0, 5).map(c => c.name)],
      strength: Math.min(10, surveilCards.length + surveilPayoffs.length * 3)
    });
  }

  // Threshold / self-mill (Theorix)
  if (thresholdCards.length >= 2) {
    synergies.push({
      name: 'Threshold (Theorix)',
      description: `${thresholdCards.length} Threshold payoff(s)${millCards.length > 0 ? ` + ${millCards.length} self-mill enabler(s)` : ''}${flashbackCards.length > 0 ? ` + ${flashbackCards.length} Flashback card(s)` : ''}`,
      cards: [...thresholdCards.map(c => c.name), ...millCards.map(c => c.name), ...flashbackCards.map(c => c.name)],
      strength: Math.min(10, thresholdCards.length * 2 + millCards.length + flashbackCards.length)
    });
  }

  // Noncombat damage (Stingerquill)
  if (burnCards.length >= 2 && burnPayoffs.length >= 1) {
    synergies.push({
      name: 'Opponent Pings (Stingerquill)',
      description: `${burnCards.length} noncombat-damage source(s) unlocking ${burnPayoffs.length} payoff(s)`,
      cards: [...burnPayoffs.map(c => c.name), ...burnCards.map(c => c.name)],
      strength: Math.min(10, burnCards.length * 2 + burnPayoffs.length * 2)
    });
  }

  // Prepared package (double-faced creature-spells)
  if (preparedCards.length >= 3) {
    synergies.push({
      name: 'Prepared Package',
      description: `${preparedCards.length} prepare cards — creatures that carry repeatable spells`,
      cards: preparedCards.map(c => c.name),
      strength: Math.min(10, preparedCards.length * 2)
    });
  }

  // Heartwood / artifact ramp (Konstrari)
  if (rampCards.length >= 3) {
    const artifactPayoffs = pool.filter(c =>
      (c.oracle_text || '').match(/artifact(s)? you control/i)
    );
    synergies.push({
      name: 'Heartwood Ramp (Konstrari)',
      description: `${rampCards.length} ramp/Heartwood source(s)${artifactPayoffs.length > 0 ? ` + ${artifactPayoffs.length} artifacts-matter payoff(s)` : ''}`,
      cards: [...rampCards.map(c => c.name), ...artifactPayoffs.map(c => c.name)],
      strength: Math.min(10, rampCards.length * 2 + artifactPayoffs.length)
    });
  }

  // Treasure sub-theme
  if (treasureCards.length >= 3) {
    synergies.push({
      name: 'Treasure',
      description: `${treasureCards.length} Treasure makers — ramp, fixing, and sacrifice fodder`,
      cards: treasureCards.map(c => c.name),
      strength: Math.min(10, treasureCards.length * 2)
    });
  }

  // Spells-matter synergy
  if (spells.length >= 6) {
    const spellsPayoffs = pool.filter(c =>
      (c.oracle_text || '').match(/whenever you cast (an )?instant or sorcery|noncreature spell/i)
    );
    if (spellsPayoffs.length >= 1) {
      synergies.push({
        name: 'Spells Matter',
        description: `${spells.length} instants/sorceries with ${spellsPayoffs.length} payoff(s)`,
        cards: [...spellsPayoffs.map(c => c.name), ...spells.slice(0, 3).map(c => c.name)],
        strength: Math.min(10, spells.length + spellsPayoffs.length * 2)
      });
    }
  }

  // +1/+1 counters matter
  if (counterCards.length >= 3) {
    synergies.push({
      name: 'Counters Matter',
      description: `${counterCards.length} cards that use +1/+1 counters`,
      cards: counterCards.map(c => c.name),
      strength: Math.min(10, counterCards.length * 2)
    });
  }

  // Go-wide / tokens
  if (tokenCards.length >= 3) {
    const anthemCards = pool.filter(c => c.synergy_tags?.includes('anthem'));
    synergies.push({
      name: 'Go Wide / Tokens',
      description: `${tokenCards.length} token creators${anthemCards.length > 0 ? ` + ${anthemCards.length} anthem(s)` : ''}`,
      cards: [...tokenCards.map(c => c.name), ...anthemCards.map(c => c.name)],
      strength: Math.min(10, tokenCards.length * 2 + anthemCards.length * 3)
    });
  }

  // Graveyard / Flashback synergy
  if (flashbackCards.length >= 2) {
    const graveyardCards = pool.filter(c =>
      (c.oracle_text || '').match(/from your graveyard|mill|graveyard/i)
    );
    synergies.push({
      name: 'Graveyard Value',
      description: `${flashbackCards.length} flashback cards${graveyardCards.length > 0 ? ` + ${graveyardCards.length} graveyard enabler(s)` : ''}`,
      cards: [...flashbackCards.map(c => c.name), ...graveyardCards.slice(0, 3).map(c => c.name)],
      strength: Math.min(10, flashbackCards.length * 2 + graveyardCards.length)
    });
  }

  // Death triggers + sacrifice
  if (deathTriggerCards.length >= 2 && sacrificeCards.length >= 1) {
    synergies.push({
      name: 'Sacrifice / Death Triggers',
      description: `${deathTriggerCards.length} death triggers + ${sacrificeCards.length} sacrifice outlets`,
      cards: [...deathTriggerCards.map(c => c.name), ...sacrificeCards.map(c => c.name)],
      strength: Math.min(10, (deathTriggerCards.length + sacrificeCards.length) * 2)
    });
  }

  // Lifegain
  if (lifegainCards.length >= 3) {
    const lifegainPayoffs = pool.filter(c =>
      (c.oracle_text || '').match(/whenever you gain life/i)
    );
    synergies.push({
      name: 'Lifegain Synergy',
      description: `${lifegainCards.length} lifegain sources${lifegainPayoffs.length > 0 ? ` + ${lifegainPayoffs.length} payoff(s)` : ''}`,
      cards: [...lifegainPayoffs.map(c => c.name), ...lifegainCards.map(c => c.name)],
      strength: Math.min(10, lifegainCards.length + lifegainPayoffs.length * 3)
    });
  }

  // ETB value
  if (etbCards.length >= 4) {
    const bounceCards = pool.filter(c => c.synergy_tags?.includes('bounce'));
    synergies.push({
      name: 'ETB Value',
      description: `${etbCards.length} enter-the-battlefield effects${bounceCards.length > 0 ? ` + ${bounceCards.length} bounce spell(s) for reuse` : ''}`,
      cards: [...etbCards.slice(0, 5).map(c => c.name), ...bounceCards.map(c => c.name)],
      strength: Math.min(10, etbCards.length + bounceCards.length * 2)
    });
  }

  // Removal quality assessment (always show)
  if (removalCards.length > 0) {
    synergies.push({
      name: 'Removal Suite',
      description: `${removalCards.length} removal spell(s) — ${removalCards.length >= 5 ? 'excellent' : removalCards.length >= 3 ? 'solid' : 'light'}`,
      cards: removalCards.map(c => c.name),
      strength: Math.min(10, removalCards.length * 2)
    });
  }

  return synergies.sort((a, b) => b.strength - a.strength);
}

/**
 * Generate a build suggestion based on pool analysis
 */
export function suggestBuild(pool) {
  const affinities = detectCollegeAffinity(pool);
  const primary = affinities[0];
  const secondary = affinities[1];

  // Find bombs (highest rated cards, rare+)
  const bombs = pool
    .filter(c => (c.rarity === 'rare' || c.rarity === 'mythic') && c.rating_score >= 60)
    .sort((a, b) => b.rating_score - a.rating_score)
    .slice(0, 5);

  // Check for splash-worthy cards (powerful off-color cards)
  const primaryColors = new Set(primary.colors);
  const splashCandidates = pool
    .filter(c => {
      const colors = c.color_identity || c.colors || [];
      if (colors.length === 0) return false;
      const hasOffColor = colors.some(co => !primaryColors.has(co));
      const hasOnColor = colors.some(co => primaryColors.has(co));
      return hasOffColor && c.rating_score >= 55;
    })
    .sort((a, b) => b.rating_score - a.rating_score);

  let splash = null;
  if (splashCandidates.length >= 2) {
    // Find the most common off-color among splash candidates
    const offColorCounts = {};
    for (const card of splashCandidates) {
      const colors = card.color_identity || card.colors || [];
      for (const c of colors) {
        if (!primaryColors.has(c)) {
          offColorCounts[c] = (offColorCounts[c] || 0) + 1;
        }
      }
    }
    const bestSplash = Object.entries(offColorCounts).sort((a, b) => b[1] - a[1])[0];
    if (bestSplash && bestSplash[1] >= 2) {
      splash = {
        color: bestSplash[0],
        cards: splashCandidates.filter(c => {
          const colors = c.color_identity || c.colors || [];
          return colors.includes(bestSplash[0]);
        }).slice(0, 3)
      };
    }
  }

  // Count removal
  const removalCount = pool.filter(c => c.synergy_tags?.includes('removal')).length;

  // Suggest mana base
  const [color1, color2] = primary.colors;
  const color1Count = pool.filter(c => {
    const colors = c.color_identity || c.colors || [];
    return colors.includes(color1);
  }).length;
  const color2Count = pool.filter(c => {
    const colors = c.color_identity || c.colors || [];
    return colors.includes(color2);
  }).length;

  const total = color1Count + color2Count || 1;
  let lands1 = Math.round((color1Count / total) * 17);
  let lands2 = 17 - lands1;
  if (splash) {
    lands1 = Math.max(lands1 - 1, 6);
    lands2 = Math.max(lands2 - 1, 6);
  }

  const colorNames = { W: 'Plains', U: 'Island', B: 'Swamp', R: 'Mountain', G: 'Forest' };

  let manaBase = `${lands1} ${colorNames[color1]}, ${lands2} ${colorNames[color2]}`;
  if (splash) {
    manaBase += `, 2 ${colorNames[splash.color]}`;
  }

  return {
    primaryCollege: primary,
    secondaryCollege: secondary,
    bombs,
    splash,
    removalCount,
    manaBase,
    synergies: findSynergies(pool)
  };
}
