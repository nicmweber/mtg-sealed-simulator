import { getColorSortOrder, RARITIES } from './utils.js';

/**
 * Sort cards by the specified mode
 * Returns a new sorted array (does not mutate)
 */
export function sortCards(cards, mode) {
  const sorted = [...cards];

  switch (mode) {
    case 'color':
      sorted.sort((a, b) => {
        const colorDiff = getColorSortOrder(a.colors) - getColorSortOrder(b.colors);
        if (colorDiff !== 0) return colorDiff;
        return a.cmc - b.cmc;
      });
      break;

    case 'cmc':
      sorted.sort((a, b) => {
        const cmcDiff = a.cmc - b.cmc;
        if (cmcDiff !== 0) return cmcDiff;
        return a.name.localeCompare(b.name);
      });
      break;

    case 'rarity':
      sorted.sort((a, b) => {
        const rarA = RARITIES[a.rarity]?.order ?? 99;
        const rarB = RARITIES[b.rarity]?.order ?? 99;
        if (rarA !== rarB) return rarA - rarB;
        return b.rating_score - a.rating_score;
      });
      break;

    case 'rating':
      sorted.sort((a, b) => {
        const ratingDiff = (b.rating_score || 0) - (a.rating_score || 0);
        if (ratingDiff !== 0) return ratingDiff;
        return a.name.localeCompare(b.name);
      });
      break;

    case 'name':
      sorted.sort((a, b) => a.name.localeCompare(b.name));
      break;

    default:
      break;
  }

  return sorted;
}

/**
 * Filter cards by criteria
 * filters: { colors: string[], rarity: string, type: string }
 * All filters are optional; omitted = no filter for that dimension
 */
export function filterCards(cards, filters = {}) {
  return cards.filter(card => {
    // Color filter: card must include at least one of the selected colors
    if (filters.colors && filters.colors.length > 0) {
      const cardColors = card.color_identity || card.colors || [];
      if (cardColors.length === 0) {
        // Colorless cards: show if 'C' is in filter, otherwise hide
        if (!filters.colors.includes('C')) return false;
      } else {
        const hasMatchingColor = cardColors.some(c => filters.colors.includes(c));
        if (!hasMatchingColor) return false;
      }
    }

    // Rarity filter
    if (filters.rarity && card.rarity !== filters.rarity) {
      return false;
    }

    // Type filter
    if (filters.type) {
      const typeLine = (card.type_line || '').toLowerCase();
      if (!typeLine.includes(filters.type.toLowerCase())) {
        return false;
      }
    }

    return true;
  });
}
