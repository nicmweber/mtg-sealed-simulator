// Published limited grades from Draftsim's HOB set review (Andrew Quinn, Aug 2026):
// https://draftsim.com/mtg-hob-limited-set-review/
// The article grades on a 0-10 scale. These take precedence over the heuristic
// rating engine (user tap-to-cycle overrides still win over everything).
// Cards missing from this table keep their heuristic grade.

// 0-10 → letter grade + sort score, following the article's own legend:
// 10 = format-defining bomb, 8-9 = bombs/premium, 5-7 = role-players, 0 = never maindeck.
// Scores align with scoreToGrade thresholds in card-ratings.js.
const SCALE = {
  10: { grade: 'A+', score: 80 },
  9:  { grade: 'A',  score: 70 },
  8:  { grade: 'A-', score: 60 },
  7:  { grade: 'B+', score: 54 },
  6:  { grade: 'B',  score: 48 },
  5:  { grade: 'B-', score: 43 },
  4:  { grade: 'C',  score: 32 },
  3:  { grade: 'C-', score: 27 },
  2:  { grade: 'D+', score: 22 },
  1:  { grade: 'D',  score: 17 },
  0:  { grade: 'F',  score: 5 }
};

// Card name -> Draftsim 0-10 grade (adventure cards listed by front face)
export const DRAFTSIM_RATINGS = {
  // White
  'Belladonna Took': 6,
  "Bilbo's Gambit": 1,
  'Bofur, Reliable Guardian': 4,
  'Celebrate the Mountain-king': 7,
  'Dáin, Lord of the Iron Hills': 1,
  'Dwarven Provisioner': 3,
  'Dwarven Shortsword': 4,
  'Eagle of the Great Shelf': 3,
  'The Eagles Are Coming!': 8,
  'Esgaroth Garrison': 1,
  'Fíli the Pathfinder': 8,
  'Gleaming Splendor': 0,
  'Iron Hills Blacksmith': 6,
  'Kíli the Resourceful': 8,
  'Lake-town Lookout': 3,
  'Lake-town Toymaker': 2,
  'Magnificent End': 4,
  'Moment of Glory': 1,
  "The Mountain-king's Return": 4,
  'Ori, Keeper of Songs': 2,
  'The Queen of Dale': 3,
  'Roads Go Ever, Ever On': 6,
  'Settle the Wreckage': 9,
  'Stone by Sunlight': 7,
  "Thorin's Last Stand": 2,
  'An Unexpected Party': 10,
  'Velvetwing Butterflies': 4,
  'Vow to Erebor': 1,

  // Blue
  'Bilbo, Luckwearer': 7,
  'Bilbo, Thief in the Night': 6,
  'Bilbo Baggins, Burglar': 6,
  'Confusticate and Bebother': 1,
  'Elrond, Moon-Reader': 5,
  'Elven Raft-Steerer': 5,
  "Elvenking's Harper": 2,
  "Enchanted River's Grasp": 5,
  'Fateful Discovery': 0,
  'Gandalf, Wandering Wizard': 3,
  'Great Gilded Boat': 7,
  'Lakeshore Apothecary': 1,
  'Lake-town Mariners': 4,
  'Long Lake Nuisance': 2,
  'The Lord of the Eagles': 9,
  "Master's Councillors": 4,
  'Mirkwood Meditator': 1,
  'Most Decrepit Old Bird': 4,
  "Old Fat Spider Can't See Me": 4,
  'Plunder the Trollshaws': 4,
  'Ravenhill Flock': 5,
  'Riddles in the Dark': 5,
  'Roll-Roll-Roll-Roll': 4,
  'Sound the Trumpets': 2,
  "Thranduil's Decree": 5,
  'Uncover the Moon-Letters': 2,
  'Uneasy Partings': 5,
  "Wizard's Staff": 1,

  // Black
  'Along the Crooked Way': 5,
  "Azog, Moria's Ruin": 5,
  "Bilbo's Deadly Slice": 5,
  'Crude Bent Blade': 2,
  'Desolation Prowler': 5,
  'Down, Down to Goblin-town': 4,
  'Dreaded Bat-Cloud': 4,
  'Front Porch Sentries': 4,
  'Gathering of Darkness': 4,
  'Gnashing of Teeth': 5,
  'Gollum, Riddle Master': 6,
  'Gollum, Silent Slinker': 1,
  'Gollum the Abandoned': 4,
  'Great Fierce Bee': 1,
  'Great Ugly-Looking Goblin': 4,
  'Head of the Hunt': 9,
  'Inside Information': 4,
  'The Master of Lake-town': 5,
  'Nighthowl Pursuer': 6,
  'Rage into the Valley': 5,
  'Ravening Warg': 4,
  'Reverent Howl': 3,
  'Rhovanion Rampager': 8,
  'The Sackville-Bagginses': 7,
  'Stir Up Trouble': 4,
  'Stony-Voiced Goblins': 4,
  'Supper for Spiders': 0,

  // Red
  'Balin, Loremaster': 1,
  'Bombur, Gentle Dreamer': 2,
  'Bothersome Noisemaker': 6,
  'Burn, Burn, Tree and Fern': 5,
  'Dáin Ironfoot': 7,
  'Desert Were-Worm': 4,
  'Desolation of Smaug': 3,
  'Dori, Bearer of Friends': 4,
  'Dwarven Mauler': 5,
  "Gandalf, Goblins' Bane": 8,
  'Gandalf, Spark Starter': 6,
  'Getaway Barrel': 0,
  'Glóin the Mighty': 2,
  'Goblin-town Flunkies': 4,
  'Gundabad Opportunist': 3,
  'Iron Hills Stalwart': 1,
  "Last Light of Durin's Day": 1,
  'The Misty Mountains Cold': 4,
  'Misty Mountains Raider': 3,
  'Óin the Brave': 3,
  'Pinecone Strike': 6,
  'Ragged Short Spear': 3,
  'Smaug, the Great Calamity': 4,
  'Smaug the Magnificent': 10,
  "Smaug's Fury": 1,
  'Snowslope Hunter': 7,
  'Stone-Giant of High Pass': 9,
  'Thorin, Mountain-king': 9,
  'Tidings of War': 3,

  // Green
  'Attercop': 4,
  'Bejeweled Warg': 6,
  'Beorn, Reluctant Host': 4,
  'Beorn the Fierce': 10,
  "Beorn's Hospitality": 4,
  'Boughside Wanderers': 4,
  'Cantankerous Keepers': 5,
  'Dancing from Dark to Dawn': 8,
  'Down in the Valley': 7,
  "Galion, Elvenking's Butler": 3,
  'Gigantic Big Bear': 5,
  'Guardian of the Halls': 2,
  'Little Bear': 3,
  'Mirkwood Pathmaker': 4,
  'Nasty Little Rabbit': 7,
  'The Notary Hobbits': 6,
  'Old Fat Spider': 4,
  'Ordinary Bear': 2,
  'Part in Friendship': 0,
  'Quarrel': 5,
  'Radagast of Rhosgobel': 6,
  'Through the Forest Gate': 0,
  'Troll Negotiations': 6,
  'Warg Tactics': 1,
  'Wargling': 3,
  'Wilderland Scrounger': 6,
  'Wood Elves': 6,
  'Woodland Weavemaster': 7,

  // Multicolored
  'Bard, King of Dale': 2,
  'Bard the Bowman': 4,
  "Bard's Company": 8,
  'Bifur, Melodic Rider': 4,
  'Bolg of the North': 6,
  "Bolg's Company": 4,
  'The Chief Warg': 6,
  "Chief Warg's Company": 9,
  "Dáin's Company": 6,
  'Duskwatch Hunter': 3,
  'Dwalin, Weaponmaster': 5,
  "Eagle's Rescue": 6,
  'Fearsome Goblin Pair': 5,
  'Goblin Plate Mail': 4,
  'The Great Goblin': 7,
  'Large Bear': 7,
  'Mirkwood Nurturer': 4,
  'Nori, Teller of Tales': 3,
  'Patient Instructor': 2,
  'Silvan Reveler': 6,
  'Smaug, Wicked Worm': 8,
  'Thorin Oakenshield': 4,
  'Thranduil, Sindarin Liege': 7,
  'Thranduil, the Elvenking': 2,
  "Thranduil's Company": 6,
  'Tom, Bert, and William': 9,

  // Artifacts and Colorless
  'Long-Bodied Grey Dog': 3,
  'Old Thrush': 1,
  'Troop of Ponies': 5,
  'The Arkenstone': 9,
  'The Black Arrow': 5,
  'Dwarven Mattock': 4,
  "Giant's Boulder": 2,
  'Glamdring, Foe-hammer': 0,
  'Key to the Side-Door': 1,
  'My Precious': 4,
  'Orcrist, Goblin-cleaver': 4,
  "Sting, Bilbo's Sword": 1,
  "Thrór's Map": 4,
  'Well-Worn Spatula': 3,

  // Lands
  'Elven Passage': 7,
  'Hobbit Hole': 6,
  'The Lonely Mountain': 5
};

// Draftsim graded the common dual-land cycle collectively at 4/10
const COMMON_DUAL_LAND_GRADE = 4;

/**
 * Normalize a card name for fuzzy matching (case, punctuation, curly quotes)
 */
function normalizeName(name) {
  return name
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[.,!:]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Build normalized lookup once
const NORMALIZED_RATINGS = {};
for (const [name, grade] of Object.entries(DRAFTSIM_RATINGS)) {
  NORMALIZED_RATINGS[normalizeName(name)] = grade;
}

/**
 * Apply Draftsim review grades on top of heuristic ratings.
 * Run after applyPrereleaseAdjustments, before applyOverrides.
 */
export function applyDraftsimRatings(cards) {
  let applied = 0;
  const unmatched = [];

  for (const card of cards) {
    // Match full name, then front-face name (adventures print as "A // B"),
    // then normalized versions of both
    const frontFace = card.name.split(' // ')[0];
    let n = DRAFTSIM_RATINGS[card.name] ??
            DRAFTSIM_RATINGS[frontFace] ??
            NORMALIZED_RATINGS[normalizeName(card.name)] ??
            NORMALIZED_RATINGS[normalizeName(frontFace)];

    // Cycle rule: common nonbasic dual lands rated collectively
    if (n === undefined &&
        card.rarity === 'common' &&
        card.type_line?.includes('Land') &&
        !card.type_line.includes('Basic') &&
        (card.color_identity?.length ?? 0) >= 2) {
      n = COMMON_DUAL_LAND_GRADE;
    }

    if (n === undefined || !(n in SCALE)) {
      unmatched.push(card.name);
      continue;
    }

    const { grade, score } = SCALE[n];
    card.rating = grade;
    card.rating_computed = grade;
    card.rating_score = score;
    card.rating_source = 'Draftsim';
    card.rating_draftsim = `${n}/10`;
    applied++;
  }

  console.log(`Draftsim grades applied to ${applied}/${cards.length} cards (${unmatched.length} kept heuristic grade)`);
}
