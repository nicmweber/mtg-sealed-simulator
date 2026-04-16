import { shuffle, pickRandom } from './utils.js';

/**
 * Generate a single Play Booster pack (14 cards)
 * Slots: 6C + 3U + 1R/M + 2 wildcard + 1 land + 1 foil
 * We skip the land slot for sealed simulation (not relevant for deckbuilding)
 */
export function generatePack(allCards) {
  const commons = allCards.filter(c => c.rarity === 'common' && !c.type_line.includes('Basic Land'));
  const uncommons = allCards.filter(c => c.rarity === 'uncommon');
  const rares = allCards.filter(c => c.rarity === 'rare');
  const mythics = allCards.filter(c => c.rarity === 'mythic');

  const usedNames = new Set();
  const pack = [];

  // Helper to pick cards avoiding duplicates within the pack
  function pick(pool, count) {
    const picked = pickRandom(pool, count, usedNames);
    for (const card of picked) {
      usedNames.add(card.name);
      pack.push({ ...card, foil: false });
    }
  }

  // Slots 1-6: 6 commons
  pick(commons, 6);

  // Slots 7-9: 3 uncommons
  pick(uncommons, 3);

  // Slot 10: rare or mythic (1-in-7 chance of mythic)
  if (Math.random() < 1 / 7 && mythics.length > 0) {
    pick(mythics, 1);
  } else {
    pick(rares, 1);
  }

  // Slots 11-12: 2 wildcards (weighted rarity)
  for (let i = 0; i < 2; i++) {
    const roll = Math.random();
    let pool;
    if (roll < 0.60) pool = commons;
    else if (roll < 0.85) pool = uncommons;
    else if (roll < 0.97) pool = rares;
    else pool = mythics;
    pick(pool, 1);
  }

  // Slot 13: Skip land (not relevant for deckbuilding simulation)

  // Slot 14: 1 foil (any rarity, cosmetic distinction only)
  const foilRoll = Math.random();
  let foilPool;
  if (foilRoll < 0.60) foilPool = commons;
  else if (foilRoll < 0.85) foilPool = uncommons;
  else if (foilRoll < 0.97) foilPool = rares;
  else foilPool = mythics;

  const foilPick = pickRandom(foilPool, 1, usedNames);
  if (foilPick.length > 0) {
    usedNames.add(foilPick[0].name);
    pack.push({ ...foilPick[0], foil: true });
  }

  return pack;
}

/**
 * Generate a full sealed pool: 6 packs + 1 promo rare/mythic
 */
export function generateSealedPool(allCards) {
  const packs = [];
  for (let i = 0; i < 6; i++) {
    packs.push(generatePack(allCards));
  }

  // Promo: random rare or mythic from the set
  const raresAndMythics = allCards.filter(c => c.rarity === 'rare' || c.rarity === 'mythic');
  const promoCard = { ...raresAndMythics[Math.floor(Math.random() * raresAndMythics.length)] };
  promoCard.isPromo = true;
  promoCard.foil = true;

  // Flatten all packs into the full pool
  const pool = packs.flat().concat([promoCard]);

  return { packs, promo: promoCard, pool };
}
