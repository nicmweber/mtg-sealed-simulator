// Published limited grades from Draftsim's Reality Fracture set review
// (0-10 scale): https://draftsim.com/mtg-fra-limited-set-review/
// These take precedence over the heuristic rating engine; user tap-to-cycle
// overrides always win over everything. Cards missing from this table
// (notably the land cycles, which the review didn't grade individually)
// keep their heuristic grade.

// 0-10 → letter grade + sort score, following Draftsim's legend:
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

// Card name -> Draftsim 0-10 grade (DFC/prepare cards listed by front face)
export const DRAFTSIM_RATINGS = {
  // White
  'Academic Ascent': 2,
  'Ajani Resolute': 2,
  'Blossom-Blessed Angel': 3,
  'Campus Crier': 3,
  'Danitha, Sword of Hope': 4,
  'Enlightened Confidant': 6,
  'Fateshaper Aspirant': 3,
  'Flickering Hound': 5,
  'Generous Revival': 2,
  'Germinate Recruits': 1,
  'Ghalta the Immovable': 2,
  "Gideon's Memorial": 6,
  'Graft Surgeon': 3,
  'Guiding Hydra': 9,
  'Hexhaven Battalion': 6,
  'Kindred Judgment': 7,
  'Koth of the Homestead': 4,
  'Liliana the Faultless': 7,
  'Loyal Tutor': 0,
  'Lyra, Archangel of Dawn': 8,
  'Memory Trap': 6,
  'Predictive Preparations': 3,
  'Prophesied End': 5,
  'Refute Destiny': 5,
  'Repurposed Enforcer': 5,
  'Rescue Girl, First Responder': 2,
  'Return to the Light Realms': 0,
  'Saheeli, Consul of Oversight': 7,
  'Shatterwing Pegasus': 3,
  'Surgical Precision': 4,
  'Teyo, Lightshield Expert': 6,
  'Thalia, the Survivor': 3,
  'Tomik, Orzhov Lawmage': 5,
  'Unflinching Hortimancer': 4,
  'Way of the Healer': 6,
  'Way of the Mentor': 1,
  'Yoshimaru, Beloved Companion': 4,
  'Your Fate Ends Here': 6,
  'Yuriko, Blade of the Mighty': 4,

  // Blue
  'Arni, Humble Scribe': 5,
  'Chandra, Chill of Compliance': 8,
  'Countersculpt': 4,
  'Cruel Calculations': 6,
  'Cryotheory Adept': 3,
  'Diviner of Victory': 6,
  'Divining Duelist': 3,
  'Fblthp, Impossibly Lost': 4,
  'Geist of Saint Thalia': 5,
  'Hapatra, the Desert Frost': 5,
  'Icy Reception': 4,
  'Infinite Coursework': 5,
  'Jace, Reality Sculptor': 6,
  "Jace's Machinations": 5,
  'Lyra, Tolarian Archangel': 10,
  'Mindseeker Oculus': 6,
  'Perfected Theory': 1,
  'Plan for All Outcomes': 6,
  'Precise Redaction': 4,
  'Proft, Consulting Detective': 5,
  "Protege's Awakening": 6,
  'Ruric Thar, Biomagus': 5,
  'Samut, Tyrant of Naktamun': 4,
  'Seasoned Cryomancer': 3,
  'Semester Foreseer': 5,
  'Sphinx of False Conclusions': 4,
  "Sphinx's Approach": 3,
  'Surveillance Phantasm': 4,
  'Tetsuko Umezawa, Fugitive': 5,
  'The Theorist, Jace Beleren': 7,
  "Theorist's Proxy": 3,
  'Traxos, Academy Guardian': 4,
  'Undulating Witness': 4,
  'Unsummon': 2,
  'Variable Chaser': 3,
  'Way of the Cryomancer': 5,
  'Way of the Mind Sculptor': 6,
  'Yargle, Goliath of Otaria': 2,
  'Yuriko, Hope from the Shadows': 4,

  // Black
  'Apex Witchstalker': 6,
  'Bloodline Recollector': 4,
  'Break Under Pressure': 5,
  'Cast Away Doubt': 3,
  'Danitha, Spear of Agony': 4,
  'Dark Matter Manipulator': 5,
  'Darklight Phoenix': 7,
  'Extended Absence': 6,
  'Extrapolate the Impossible': 5,
  'Gallia, Tragic Host': 6,
  'Garruk, Veiled Butcher': 7,
  'Gideon the Oathless': 5,
  'Last Gasp': 6,
  "Lich's Relic": 4,
  'Liliana the Repentant': 8,
  'Loot, the Anomaly': 5,
  'Mabel, Bitter Recluse': 6,
  'Massacre Girl, Most Wanted': 8,
  'Multiply by Zero': 5,
  'Overwrite the Multiverse': 7,
  'Proft, Sinister Mastermind': 6,
  'Rampart Hunter': 4,
  'Rank Rat': 3,
  'Rewrite Regrets': 4,
  'Rise of the Deathbringer': 5,
  'Sanctum Lurker': 5,
  'Screeching Soulbreaker': 4,
  'Silence the Echo': 6,
  'Solve for Disappointment': 3,
  'Terminal Criticism': 5,
  'Teyo, Diamondblade Mage': 5,
  'Theoretical Necromancer': 6,
  'Tinybones, Pocket Nuisance': 6,
  'Void Extrapolator': 5,
  "Vraska's Final Mercy": 7,
  'Way of the Deathbringer': 6,
  'Way of the Necromancer': 5,
  'Winter, Tormented Loner': 4,
  'Yargle, Glutton of Urborg': 5,

  // Red
  'Ajani Unrelenting': 5,
  "Ajani's Anguish": 4,
  'Arni, Renowned Champion': 5,
  'Artifist Acumen': 4,
  'Awaken the Inferno': 7,
  'Blazing Crescendo': 5,
  'Chandra, Torch of Defiance': 8,
  "Chandra's Emberling": 5,
  'Command the Stage': 6,
  'Craterclaw Colossus': 6,
  'Curse-Marred Demon': 4,
  'Draconic Visitor': 4,
  'Eardrum Rattler': 5,
  'Essence Burn': 5,
  'Face Yourself': 4,
  'Fulminous Forte': 6,
  'Gallia, the Merrymaker': 6,
  'Hallway Heckler': 3,
  'Heartstring Puller': 5,
  'Identity Echo': 5,
  'Jiang Yanggu, Alone': 4,
  'Kiora of Fire and Ashes': 6,
  'Koth, the Geomancer': 5,
  'Marwyn, the Clearcutter': 5,
  'Master of Barbs': 5,
  'No Admittance': 4,
  'Pia, Determined Rebuilder': 5,
  'Pompous Battlemage': 4,
  'Pyre Rhymer': 4,
  "Samut, Hazoret's Champion": 6,
  'Skilled Battlecarver': 4,
  'Stingcaster Mage': 5,
  'Tether Technician': 5,
  'Tetsuko Umezawa, Pursuer': 5,
  'Tomik, Izzet Sparkmage': 5,
  'Violent Echoes': 5,
  'Way of the Pyromancer': 6,
  'Way of the Warlord': 5,
  'Winter, Team Player': 5,
  'Wrath of the Bloodmane': 6,

  // Green
  'Arcane Amphisbaena': 5,
  'Bestial Incursion': 4,
  'Budding Insurgent': 3,
  'Carnivorous Cultivator': 2,
  'Compel Brutality': 3,
  'Edgar, Moonlit Sovereign': 6,
  'Fblthp, Knows the Way': 4,
  'Flourishing Grapple': 3,
  'Gardenize': 2,
  'Garruk, Curse Breaker': 7,
  'Ghalta the Unstoppable': 2,
  'Greenhouse Propagator': 5,
  'Heartwood Crafter': 4,
  'Hexhaven Invigorator': 3,
  'Hungering Puppetbeast': 5,
  "Hunter's Axe": 2,
  'Inspired Tethermage': 4,
  'Jiang Yanggu, Never Alone': 6,
  'Loot, the Nexus': 5,
  'Marwyn, the Preserver': 6,
  'Omnipresence': 1,
  'Pia, Aether Ascetic': 4,
  'Puppet Crafting': 3,
  'Restore with Empathy': 2,
  'Ruric Thar, Magecrusher': 5,
  'Simulacrum Shaper': 4,
  'Something Worth Saving': 6,
  'Sureshot Sower': 3,
  'Tarmogoyf': 8,
  "Tethermage's Advantage": 5,
  'Titanbones, Towering Heart': 4,
  'Verdant Kraken': 6,
  'Vinelasher Adept': 4,
  'Way of the Paradox': 6,
  'Way of the Wildspeaker': 7,
  'Wrecking Gecko': 3,
  'Yoshimaru, Scrappy Stray': 5,

  // Multicolored
  'Aerid Konstrari': 5,
  'Avatar of Burgeoning Echoes': 6,
  'Blessed Ghoul': 3,
  'Bloombrute': 5,
  'Charge the Sanctum': 4,
  'Clash of Elements': 5,
  'Craftwork Crusher': 6,
  'Denzilore Fatehold': 7,
  'Desperate Futurescribe': 5,
  'Edgar, Ancient Bloodlord': 8,
  'Emergency Phytomedic': 4,
  'Entrust the Spark': 6,
  'Fatehold Charm': 4,
  'Fatehold Chronologist': 5,
  'Ferocity of the Hunt': 5,
  'Frostbite Pyromental': 4,
  'Grim Repriser': 5,
  'Hapatra, the Desert Fang': 6,
  'Ingris Stingerquill': 5,
  'Karn, Gilded Guardian': 6,
  'Kiora of Salt and Sand': 6,
  'Konstrari Charm': 4,
  'Konstrari Improviser': 5,
  'Kwia Vigorbloom': 6,
  'Mabel, Valley Hero': 6,
  'Mind Meanderer': 5,
  'Null Summoner': 4,
  'Paradox Shaper': 5,
  'Primal Witchstalker': 5,
  'Proctor of Potential': 6,
  'Prudent Fateseer': 5,
  'Recursive Recruitment': 5,
  'Saheeli, Jewel of Avishkar': 7,
  'Solarium Sentry': 5,
  'Solitary Cell': 4,
  'Stingerquill Charm': 4,
  'Stingerquill Voxmancer': 6,
  'Stinging Vitriol': 6,
  'Tam, the Possibility': 5,
  "Tam's Resistance": 4,
  'Tenured Tethermage': 6,
  'Theorix Charm': 5,
  'Theorix Metamage': 6,
  'Twinned Vision': 5,
  'Twisted Fates': 5,
  'Uldaros Theorix': 6,
  'Vigorbloom Charm': 5,
  'Vigorbloom Vanguard': 5,
  'Vindictive Triumph': 6,
  'Vraska, Soul of Stone': 7,
  'Vraska, the Cutting Glare': 8,
  "Warrior's Blades": 3,
  'Whiplash Wordsmith': 5,
  'Woodwork Prodigy': 5,

  // Artifacts / Colorless
  'Emrakul, the Exigent Doom': 10,
  'Afterthought Sentry': 3,
  'Archive Arbiter': 4,
  'Codie, Ravenous Codex': 5,
  'The Echoverse Fulcrum': 6,
  'Eye of Jace': 5,
  'Karn, Argent Defender': 6,
  'Keeper of the Quiet Hour': 5,
  'Living Library': 6,
  "Medic's Kitesail": 4,
  'Murmuring Volume': 5,
  'Traxos, Scourge Eternal': 5
};

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
 * No-ops gracefully while the table is empty.
 */
export function applyDraftsimRatings(cards) {
  if (Object.keys(DRAFTSIM_RATINGS).length === 0) {
    console.log('No Draftsim review data for this set yet — using heuristic grades');
    return;
  }

  let applied = 0;
  for (const card of cards) {
    const frontFace = card.name.split(' // ')[0];
    const n = DRAFTSIM_RATINGS[card.name] ??
              DRAFTSIM_RATINGS[frontFace] ??
              NORMALIZED_RATINGS[normalizeName(card.name)] ??
              NORMALIZED_RATINGS[normalizeName(frontFace)];

    if (n === undefined || !(n in SCALE)) continue;

    const { grade, score } = SCALE[n];
    card.rating = grade;
    card.rating_computed = grade;
    card.rating_score = score;
    card.rating_source = 'Draftsim';
    card.rating_draftsim = `${n}/10`;
    applied++;
  }

  console.log(`Draftsim grades applied to ${applied}/${cards.length} cards`);
}
