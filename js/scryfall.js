const CACHE_KEY = 'sos_cards';
const CACHE_TIMESTAMP_KEY = 'sos_cards_timestamp';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const SEARCH_URL = 'https://api.scryfall.com/cards/search?q=set:sos';

/**
 * Trim a Scryfall card object to essential fields
 */
function trimCard(card) {
  const trimmed = {
    id: card.id,
    oracle_id: card.oracle_id,
    name: card.name,
    mana_cost: card.mana_cost || '',
    cmc: card.cmc || 0,
    colors: card.colors || [],
    color_identity: card.color_identity || [],
    rarity: card.rarity,
    type_line: card.type_line || '',
    oracle_text: card.oracle_text || '',
    power: card.power || null,
    toughness: card.toughness || null,
    keywords: card.keywords || [],
    layout: card.layout,
    collector_number: card.collector_number,
    image_front: null,
    image_back: null,
    card_faces: null
  };

  // Handle images
  if (card.image_uris) {
    trimmed.image_front = card.image_uris.normal;
  }

  // Handle double-faced cards (prepare layout)
  if (card.card_faces && card.card_faces.length > 0) {
    trimmed.card_faces = card.card_faces.map(face => ({
      name: face.name,
      mana_cost: face.mana_cost || '',
      type_line: face.type_line || '',
      oracle_text: face.oracle_text || '',
      power: face.power || null,
      toughness: face.toughness || null
    }));

    // For DFC cards, get images from card_faces if top-level is missing
    if (!trimmed.image_front && card.card_faces[0].image_uris) {
      trimmed.image_front = card.card_faces[0].image_uris.normal;
    }
    if (card.card_faces[1]?.image_uris) {
      trimmed.image_back = card.card_faces[1].image_uris.normal;
    }

    // Derive back face URL from front if not available
    if (trimmed.image_front && !trimmed.image_back && card.layout === 'prepare') {
      trimmed.image_back = trimmed.image_front.replace('/front/', '/back/');
    }

    // For DFC, combine oracle text if top-level is empty
    if (!trimmed.oracle_text && trimmed.card_faces) {
      trimmed.oracle_text = trimmed.card_faces.map(f => f.oracle_text).filter(Boolean).join('\n---\n');
    }
    // Use front face mana cost if top-level is empty
    if (!trimmed.mana_cost && trimmed.card_faces[0]) {
      trimmed.mana_cost = trimmed.card_faces[0].mana_cost;
    }
    // Use front face colors if top-level is empty
    if (trimmed.colors.length === 0 && card.card_faces[0]?.colors) {
      trimmed.colors = card.card_faces[0].colors;
    }
  }

  return trimmed;
}

/**
 * Fetch all cards from Scryfall for the SOS set
 */
async function fetchFromAPI() {
  const allCards = [];
  let url = SEARCH_URL;

  while (url) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Scryfall API error: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    allCards.push(...data.data.map(trimCard));

    if (data.has_more && data.next_page) {
      // Respect Scryfall rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
      url = data.next_page;
    } else {
      url = null;
    }
  }

  return allCards;
}

/**
 * Get all SOS cards, using cache if available
 */
export async function getCards() {
  // Check cache
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);

    if (cached && timestamp) {
      const age = Date.now() - parseInt(timestamp, 10);
      if (age < CACHE_TTL) {
        const cards = JSON.parse(cached);
        console.log(`Loaded ${cards.length} cards from cache (${Math.round(age / 60000)}min old)`);
        return cards;
      }
    }
  } catch (e) {
    console.warn('Cache read failed, fetching fresh:', e);
  }

  // Fetch from API
  console.log('Fetching cards from Scryfall...');
  const cards = await fetchFromAPI();
  console.log(`Fetched ${cards.length} cards from Scryfall`);

  // Cache the results
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cards));
    localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
  } catch (e) {
    console.warn('Cache write failed:', e);
  }

  return cards;
}

/**
 * Clear the card cache (useful for debugging)
 */
export function clearCache() {
  localStorage.removeItem(CACHE_KEY);
  localStorage.removeItem(CACHE_TIMESTAMP_KEY);
  console.log('Card cache cleared');
}
