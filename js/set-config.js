// ===== Set Configuration =====
// Everything set-specific lives here. To port the simulator to a new set,
// update this file (and re-check pack structure in pack-simulator.js).

export const SET_CONFIG = {
  code: 'fra',
  name: 'Reality Fracture',
  subtitle: 'Sealed Simulator',

  // Cache freshness: spoiler season is active (~62% of the set revealed,
  // prerelease Sept 25 - Oct 1), so refetch often.
  cacheTtlHours: 6,

  // Cards above this collector number are the bonus sheet (#195-280,
  // alternate-version legends) and basics — excluded from sealed pool
  // generation. The Browse database still shows everything.
  mainSetMaxCollector: 194,

  // Ten playable 2-color archetypes: five named Hexhaven-school factions on
  // the allied pairs (full signpost packages) plus five supported enemy
  // pairs (dual land + scattered gold cards, no signposts).
  // mechanicPattern drives detection where Scryfall keywords don't
  // (Heartwood, noncombat-damage); display uses `mechanic`.
  archetypes: {
    fatehold: {
      name: 'Fatehold',
      colors: ['W', 'U'],
      mechanic: 'Surveil',
      mechanicPattern: /whenever you scry or surveil/i,
      themes: ['surveil', 'scry', 'cadet', '+1/+1 counter', 'token'],
      description: 'White/Blue — scry/surveil payoffs, Cadet tokens, go-wide counters'
    },
    theorix: {
      name: 'Theorix',
      colors: ['U', 'B'],
      mechanic: 'Threshold',
      mechanicPattern: /threshold/i,
      themes: ['mill', 'graveyard', 'threshold', 'flashback'],
      description: 'Blue/Black — self-mill and graveyard value with Threshold'
    },
    stingerquill: {
      name: 'Stingerquill',
      colors: ['B', 'R'],
      mechanic: 'Prowess',
      mechanicPattern: /noncombat damage/i,
      themes: ['noncombat damage', 'damage to target opponent', 'prowess', 'graveyard'],
      description: 'Black/Red — aggro-burn; noncombat damage pings unlock payoffs'
    },
    konstrari: {
      name: 'Konstrari',
      colors: ['R', 'G'],
      mechanic: 'Heartwood',
      mechanicPattern: /heartwood/i,
      themes: ['artifact', 'heartwood', 'ramp', 'treasure'],
      description: 'Red/Green — Heartwood artifact ramp and artifacts-matter'
    },
    vigorbloom: {
      name: 'Vigorbloom',
      colors: ['G', 'W'],
      mechanic: 'Counters + Life',
      mechanicPattern: null,
      themes: ['+1/+1 counter', 'gain life', 'lifegain'],
      description: 'Green/White — +1/+1 counters with lifegain payoffs'
    },
    // Secondary (enemy-pair) archetypes — supported, no signpost cycle
    attrition: {
      name: "Liliana's Attrition",
      colors: ['W', 'B'],
      mechanic: 'Sacrifice',
      mechanicPattern: null,
      themes: ['sacrifice', 'dies', 'graveyard'],
      description: 'White/Black — sacrifice and attrition value'
    },
    prowessUR: {
      name: "Chandra's Prowess",
      colors: ['U', 'R'],
      mechanic: 'Spells',
      mechanicPattern: null,
      themes: ['instant', 'sorcery', 'prowess', 'noncreature spell'],
      description: 'Blue/Red — spells-matter tempo'
    },
    bestiary: {
      name: "Garruk's Bestiary",
      colors: ['B', 'G'],
      mechanic: 'Big Creatures',
      mechanicPattern: null,
      themes: ['deathtouch', 'trample', 'fight'],
      description: 'Black/Green — big deathtouch/trample creatures'
    },
    army: {
      name: "Ajani's Army",
      colors: ['R', 'W'],
      mechanic: 'Counters Aggro',
      mechanicPattern: null,
      themes: ['+1/+1 counter', 'attack'],
      description: 'Red/White — aggressive +1/+1 counters'
    },
    mastery: {
      name: "Jace's Mastery",
      colors: ['G', 'U'],
      mechanic: 'Empower Jace',
      mechanicPattern: /empower jace/i,
      themes: ['planeswalker', 'jace', 'loyalty', 'surveil'],
      description: 'Green/Blue — planeswalker loyalty and Empower Jace'
    }
  },

  // Prerelease tier bonuses. No event data exists yet for Reality Fracture —
  // start neutral; tune here once prerelease reports land, or use
  // tap-to-cycle overrides on individual cards at the event.
  tierBonus: {
    fatehold: 0, theorix: 0, stingerquill: 0, konstrari: 0, vigorbloom: 0,
    attrition: 0, prowessUR: 0, bestiary: 0, army: 0, mastery: 0
  }
};

// Derived storage keys — namespaced by set so switching sets never serves stale data
export const CACHE_KEY = `${SET_CONFIG.code}_cards`;
export const CACHE_TIMESTAMP_KEY = `${SET_CONFIG.code}_cards_timestamp`;
export const OVERRIDES_KEY = `mtg-${SET_CONFIG.code}-rating-overrides`;
export const SEARCH_URL = `https://api.scryfall.com/cards/search?q=set:${SET_CONFIG.code}`;
