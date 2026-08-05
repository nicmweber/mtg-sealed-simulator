// ===== Set Configuration =====
// Everything set-specific lives here. To port the simulator to a new set,
// update this file (and re-check pack structure in pack-simulator.js).

export const SET_CONFIG = {
  code: 'hob',
  name: 'The Hobbit',
  subtitle: 'Sealed Simulator',

  // Cache freshness: spoiler season is active (set not fully revealed),
  // so refetch more often than the old 24h.
  cacheTtlHours: 6,

  // The five supported 2-color factions. Same shape the old COLLEGES table used
  // (name, colors, mechanic, themes, description) so all consumers keep working.
  // mechanicPattern exists because Scryfall's `keywords` array does NOT include
  // the brand-new mechanics (Storied, recruit) — we fall back to oracle text.
  archetypes: {
    laketown: {
      name: 'Lake-town',
      colors: ['W', 'U'],
      mechanic: 'Recruit',
      mechanicPattern: /\brecruits?\b/i,
      themes: ['token', 'soldier', 'human', 'draw', 'discard'],
      description: 'White/Blue — Humans & Soldiers going wide with Recruit tokens'
    },
    ironhills: {
      name: 'Iron Hills',
      colors: ['R', 'W'],
      mechanic: 'Storied',
      mechanicPattern: /storied|enduring story/i,
      themes: ['equipment', 'artifact', 'legendary', 'saga', 'dwarf', 'hone'],
      description: 'Red/White — Dwarves with Equipment, hone counters, and Storied'
    },
    goblintown: {
      name: 'Goblin-town',
      colors: ['B', 'R'],
      mechanic: 'Amass',
      mechanicPattern: /amass/i,
      themes: ['amass', 'goblin', 'sacrifice', 'treasure', 'army'],
      description: 'Black/Red — Goblin aggro with Amass and sacrifice'
    },
    mirkwood: {
      name: 'Mirkwood',
      colors: ['B', 'G'],
      mechanic: 'Ferocious',
      mechanicPattern: /ferocious/i,
      themes: ['power 4', 'wolf', 'spider', 'troll', 'sacrifice', 'graveyard'],
      description: 'Black/Green — big Ferocious creatures and grindy value'
    },
    elvenking: {
      name: "Elvenking's Halls",
      colors: ['G', 'U'],
      mechanic: 'Landfall',
      mechanicPattern: /landfall/i,
      themes: ['landfall', 'land', 'elf', 'ramp', 'additional land'],
      description: 'Green/Blue — Elves with Landfall, ramp, and extra land drops'
    }
  },

  // Prerelease tier bonuses. NO event data exists yet for The Hobbit —
  // start neutral and use tap-to-cycle overrides at the event, or update
  // these once early prerelease reports come in.
  tierBonus: {
    laketown: 0,
    ironhills: 0,
    goblintown: 0,
    mirkwood: 0,
    elvenking: 0
  }
};

// Derived storage keys — namespaced by set so switching sets never serves stale data
export const CACHE_KEY = `${SET_CONFIG.code}_cards`;
export const CACHE_TIMESTAMP_KEY = `${SET_CONFIG.code}_cards_timestamp`;
export const OVERRIDES_KEY = `mtg-${SET_CONFIG.code}-rating-overrides`;
export const SEARCH_URL = `https://api.scryfall.com/cards/search?q=set:${SET_CONFIG.code}`;
