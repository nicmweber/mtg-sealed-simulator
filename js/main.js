import { getCards } from './scryfall.js';
import { rateAllCards } from './card-ratings.js';
import { generateSealedPool } from './pack-simulator.js';
import { detectCollegeAffinity, findSynergies, suggestBuild } from './synergy.js';
import { renderCardGrid, renderPackCards, showModal } from './card-display.js';
import { sortCards, filterCards } from './sorter.js';
import { DeckBuilder } from './deck-builder.js';
import { COLORS, GRADE_COLORS } from './utils.js';

// ===== App State =====
let allCards = [];
let sealedPool = null;
let currentPool = [];
let currentSort = 'color';
let activeColorFilters = new Set();
let isDeckMode = false;
const deckBuilder = new DeckBuilder();

// ===== DOM References =====
const $loading = document.getElementById('loading');
const $packOpening = document.getElementById('pack-opening');
const $packReveal = document.getElementById('pack-reveal');
const $toolbar = document.getElementById('toolbar');
const $mainContent = document.getElementById('main-content');
const $cardGrid = document.getElementById('card-grid');
const $deckPanel = document.getElementById('deck-panel');
const $strategyPanel = document.getElementById('strategy-panel');
const $poolCount = document.getElementById('pool-count');
const $btnNewPool = document.getElementById('btn-new-pool');
const $btnToggleView = document.getElementById('btn-toggle-view');
const $btnOpenAll = document.getElementById('btn-open-all');
const $btnViewPool = document.getElementById('btn-view-pool');

// ===== Initialize =====
async function init() {
  try {
    allCards = await getCards();
    rateAllCards(allCards);
    console.log(`Loaded and rated ${allCards.length} cards`);

    $loading.classList.add('hidden');
    startNewPool();
  } catch (err) {
    $loading.innerHTML = `
      <p style="color: var(--red-mana);">Failed to load cards: ${err.message}</p>
      <button class="btn btn-primary" onclick="location.reload()">Retry</button>
    `;
    console.error(err);
  }
}

// ===== Pool Generation =====
function startNewPool() {
  sealedPool = generateSealedPool(allCards);
  currentPool = [];
  isDeckMode = false;

  // Reset UI
  $packOpening.classList.remove('hidden');
  $toolbar.classList.add('hidden');
  $mainContent.classList.add('hidden');
  $strategyPanel.classList.add('hidden');
  $deckPanel.classList.add('hidden');
  $mainContent.classList.remove('deck-mode');
  $btnToggleView.textContent = 'Deck Builder';
  $btnToggleView.classList.remove('active');
  $btnViewPool.classList.add('hidden');
  $packReveal.innerHTML = '';

  // Reset pack buttons
  document.querySelectorAll('.pack-btn').forEach(btn => {
    btn.disabled = false;
    btn.classList.remove('opened');
  });

  $btnOpenAll.classList.remove('hidden');

  console.log('New sealed pool generated:', sealedPool);
}

// ===== Pack Opening =====
let packsOpened = 0;

function openPack(packIndex) {
  const btn = document.querySelector(`.pack-btn[data-pack="${packIndex}"]`);
  if (!btn || btn.disabled) return;

  btn.disabled = true;
  btn.classList.add('opened');
  $packReveal.innerHTML = '';

  let cards;
  if (packIndex === 'promo') {
    cards = [sealedPool.promo];
  } else {
    cards = sealedPool.packs[parseInt(packIndex)];
  }

  // Add to current pool
  currentPool.push(...cards);
  renderPackCards(cards, $packReveal);
  packsOpened++;

  // Check if all packs opened
  const allOpened = document.querySelectorAll('.pack-btn:not(:disabled)').length === 0;
  if (allOpened) {
    $btnOpenAll.classList.add('hidden');
    $btnViewPool.classList.remove('hidden');
  }
}

function openAllRemaining() {
  const unopened = document.querySelectorAll('.pack-btn:not(:disabled)');
  for (const btn of unopened) {
    const packIndex = btn.dataset.pack;
    btn.disabled = true;
    btn.classList.add('opened');

    let cards;
    if (packIndex === 'promo') {
      cards = [sealedPool.promo];
    } else {
      cards = sealedPool.packs[parseInt(packIndex)];
    }
    currentPool.push(...cards);
  }

  $packReveal.innerHTML = '';
  renderPackCards(currentPool, $packReveal);
  $btnOpenAll.classList.add('hidden');
  $btnViewPool.classList.remove('hidden');
}

function showPoolView() {
  $packOpening.classList.add('hidden');
  $toolbar.classList.remove('hidden');
  $mainContent.classList.remove('hidden');
  $strategyPanel.classList.remove('hidden');

  // Initialize deck builder with pool
  deckBuilder.init(currentPool);
  deckBuilder.onChange = () => updateDisplay();

  updateDisplay();
  renderStrategy();
}

// ===== Synergy Highlighting =====
function highlightSynergyCards(cardNames) {
  const nameSet = new Set(cardNames);
  const cards = document.querySelectorAll('#card-grid .card-wrapper');
  cards.forEach(el => {
    const cardName = el.querySelector('img')?.alt || '';
    // Check both full name and individual DFC face names
    const matches = nameSet.has(cardName) || cardName.split(' // ').some(n => nameSet.has(n));
    if (matches) {
      el.classList.add('synergy-highlight');
      el.classList.remove('synergy-dimmed');
    } else {
      el.classList.add('synergy-dimmed');
      el.classList.remove('synergy-highlight');
    }
  });

  // Scroll the card grid into view
  document.getElementById('card-grid-container').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function clearSynergyHighlight() {
  document.querySelectorAll('#card-grid .card-wrapper').forEach(el => {
    el.classList.remove('synergy-highlight', 'synergy-dimmed');
  });
}

// ===== Display Updates =====
function updateDisplay() {
  let displayCards;

  if (isDeckMode) {
    // In deck mode, show sideboard in grid, deck in panel
    displayCards = deckBuilder.sideboard;
  } else {
    displayCards = currentPool;
  }

  // Apply filters
  if (activeColorFilters.size > 0) {
    displayCards = filterCards(displayCards, { colors: [...activeColorFilters] });
  }

  // Apply sort
  displayCards = sortCards(displayCards, currentSort);

  // Update pool count
  $poolCount.textContent = displayCards.length;

  // Render grid
  const deckCardIds = new Set(deckBuilder.deck.map(c => c.id));

  $cardGrid.innerHTML = '';
  for (const card of displayCards) {
    const inDeck = isDeckMode ? false : deckCardIds.has(card.id);
    const el = document.createElement('div');
    el.className = `card-wrapper ${card.rarity} ${inDeck ? 'in-deck' : ''}`;
    el.dataset.cardId = card.id;

    const img = document.createElement('img');
    img.src = card.image_front || '';
    img.alt = card.name;
    img.loading = 'lazy';
    img.className = 'card-image';
    img.onerror = () => {
      img.src = 'data:image/svg+xml,' + encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="244" height="340" viewBox="0 0 244 340"><rect fill="#333" width="244" height="340" rx="12"/><text fill="#aaa" font-family="Arial" font-size="14" x="122" y="170" text-anchor="middle">${card.name}</text></svg>`
      );
    };
    el.appendChild(img);

    // Rating badge
    if (card.rating) {
      const badge = document.createElement('span');
      badge.className = 'rating-badge';
      badge.textContent = card.rating;
      badge.style.backgroundColor = GRADE_COLORS[card.rating] || '#666';
      el.appendChild(badge);
    }

    // Foil badge
    if (card.foil) {
      const foil = document.createElement('span');
      foil.className = 'foil-badge';
      foil.textContent = 'FOIL';
      el.appendChild(foil);
    }

    // Promo badge
    if (card.isPromo) {
      const promo = document.createElement('span');
      promo.className = 'promo-badge';
      promo.textContent = 'PROMO';
      el.appendChild(promo);
    }

    // DFC flip
    if (card.image_back) {
      const flipBtn = document.createElement('button');
      flipBtn.className = 'flip-btn';
      flipBtn.textContent = '\u{1F504}';
      flipBtn.title = 'Flip card';
      let showingFront = true;
      flipBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        showingFront = !showingFront;
        img.src = showingFront ? card.image_front : card.image_back;
      });
      el.appendChild(flipBtn);
    }

    // Click: deck mode = toggle in/out of deck, pool mode = show modal
    el.style.cursor = 'pointer';
    el.addEventListener('click', () => {
      if (isDeckMode) {
        deckBuilder.addToDeck(card.id);
      } else {
        showModal(card);
      }
    });

    $cardGrid.appendChild(el);
  }

  // Update deck panel if in deck mode
  if (isDeckMode) {
    const $deckStats = document.getElementById('deck-stats');
    const $deckList = document.getElementById('deck-list');
    deckBuilder.renderStats($deckStats);
    deckBuilder.renderDeckList($deckList);
  }
}

// ===== Strategy Rendering =====
function renderStrategy() {
  const affinities = detectCollegeAffinity(currentPool);
  const synergies = findSynergies(currentPool);
  const suggestion = suggestBuild(currentPool);

  // College rankings
  const $collegeRankings = document.getElementById('college-rankings');
  $collegeRankings.innerHTML = affinities.map((college, i) => `
    <div class="college-card ${i === 0 ? 'top-pick' : ''}">
      <div class="college-name">${i === 0 ? '\u2B50 ' : ''}${college.name}</div>
      <div class="college-colors">
        ${college.colors.map(c => `<span class="mana-symbol mana-${c.toLowerCase()}">${c}</span>`).join('')}
      </div>
      <div class="college-bar">
        <div class="college-bar-fill" style="width: ${college.percentage}%"></div>
      </div>
      <div class="college-percentage">${college.percentage}% fit (${college.cardCount} cards)</div>
      <div class="college-mechanic">${college.mechanic}</div>
    </div>
  `).join('');

  // Synergies
  const $synergyList = document.getElementById('synergy-list');
  if (synergies.length > 0) {
    $synergyList.innerHTML = `
      <h3>Detected Synergies</h3>
      ${synergies.map(s => `
        <div class="synergy-item synergy-clickable" data-synergy-cards="${btoa(JSON.stringify(s.cards))}">
          <div class="synergy-item-name">
            ${s.name}
            <span class="synergy-strength">
              <span class="synergy-strength-fill" style="width: ${s.strength * 10}%"></span>
            </span>
          </div>
          <div class="synergy-item-desc">${s.description}</div>
          <div class="synergy-item-cards">${s.cards.slice(0, 6).join(', ')}${s.cards.length > 6 ? '...' : ''}</div>
        </div>
      `).join('')}
    `;

    // Wire synergy highlight click handlers
    $synergyList.querySelectorAll('.synergy-clickable').forEach(el => {
      el.addEventListener('click', () => {
        const isActive = el.classList.contains('synergy-active');
        // Clear all active synergies
        $synergyList.querySelectorAll('.synergy-active').forEach(s => s.classList.remove('synergy-active'));
        clearSynergyHighlight();

        if (!isActive) {
          el.classList.add('synergy-active');
          const cardNames = JSON.parse(atob(el.dataset.synergyCards));
          highlightSynergyCards(cardNames);
        }
      });
    });
  }

  // Build suggestion
  const $buildSuggestion = document.getElementById('build-suggestion');
  $buildSuggestion.innerHTML = `
    <h3>Recommended Build</h3>
    <div class="build-detail">
      <strong>Primary:</strong> ${suggestion.primaryCollege.name}
      (${suggestion.primaryCollege.colors.map(c => COLORS[c]?.name).join('/')})
    </div>
    ${suggestion.splash ? `
      <div class="build-detail">
        <strong>Splash:</strong> ${COLORS[suggestion.splash.color]?.name || suggestion.splash.color}
        for ${suggestion.splash.cards.map(c => c.name).join(', ')}
      </div>
    ` : ''}
    <div class="build-detail"><strong>Removal:</strong> ${suggestion.removalCount} spell(s)
      — ${suggestion.removalCount >= 5 ? 'Excellent!' : suggestion.removalCount >= 3 ? 'Solid' : 'Light, prioritize finding more'}
    </div>
    <div class="build-detail"><strong>Suggested Mana:</strong> ${suggestion.manaBase}</div>
    ${suggestion.bombs.length > 0 ? `
      <div class="build-bombs">
        <strong>Key Cards:</strong><br>
        ${suggestion.bombs.map(c => `<span class="build-bomb-card">${c.name} (${c.rating})</span>`).join('')}
      </div>
    ` : ''}
  `;
}

// ===== Event Listeners =====
// New Pool
$btnNewPool.addEventListener('click', () => {
  packsOpened = 0;
  startNewPool();
});

// Pack buttons
document.querySelectorAll('.pack-btn').forEach(btn => {
  btn.addEventListener('click', () => openPack(btn.dataset.pack));
});

// Open all
$btnOpenAll.addEventListener('click', openAllRemaining);

// View pool
$btnViewPool.addEventListener('click', showPoolView);

// Toggle deck builder
$btnToggleView.addEventListener('click', () => {
  isDeckMode = !isDeckMode;
  $btnToggleView.textContent = isDeckMode ? 'Pool View' : 'Deck Builder';
  $btnToggleView.classList.toggle('active', isDeckMode);

  if (isDeckMode) {
    $deckPanel.classList.remove('hidden');
    $mainContent.classList.add('deck-mode');
  } else {
    $deckPanel.classList.add('hidden');
    $mainContent.classList.remove('deck-mode');
  }

  updateDisplay();
});

// Sort buttons
document.querySelectorAll('.sort-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentSort = btn.dataset.sort;
    updateDisplay();
  });
});

// Color filter buttons
document.querySelectorAll('.color-filter').forEach(btn => {
  btn.addEventListener('click', () => {
    const color = btn.dataset.color;
    if (activeColorFilters.has(color)) {
      activeColorFilters.delete(color);
      btn.classList.remove('active');
    } else {
      activeColorFilters.add(color);
      btn.classList.add('active');
    }
    updateDisplay();
  });
});

// Clear filters
document.getElementById('btn-clear-filters').addEventListener('click', () => {
  activeColorFilters.clear();
  document.querySelectorAll('.color-filter').forEach(b => b.classList.remove('active'));
  updateDisplay();
});

// Export deck
document.getElementById('btn-export-deck').addEventListener('click', () => {
  const text = deckBuilder.exportText();
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById('btn-export-deck');
    btn.textContent = 'Copied!';
    setTimeout(() => { btn.textContent = 'Copy Deck List'; }, 2000);
  });
});

// Strategy panel toggle
document.getElementById('btn-toggle-strategy').addEventListener('click', () => {
  const content = document.getElementById('strategy-content');
  const btn = document.getElementById('btn-toggle-strategy');
  content.classList.toggle('collapsed');
  btn.textContent = content.classList.contains('collapsed')
    ? 'Strategy Analysis \u25B6'
    : 'Strategy Analysis \u25BC';
});

// Keyboard shortcut: Escape closes modal
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const modal = document.getElementById('card-modal');
    if (modal) modal.remove();
  }
});

// ===== Start the app =====
document.addEventListener('DOMContentLoaded', init);
