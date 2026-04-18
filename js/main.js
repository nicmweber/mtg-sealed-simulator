import { getCards } from './scryfall.js';
import { rateAllCards } from './card-ratings.js';
import { applyPrereleaseAdjustments, applyOverrides } from './rating-adjustments.js';
import { generateSealedPool } from './pack-simulator.js';
import { detectCollegeAffinity, findSynergies, suggestBuild } from './synergy.js';
import { renderCardTile, renderPackCards, showModal } from './card-display.js';
import { sortCards, filterCards } from './sorter.js';
import { DeckBuilder } from './deck-builder.js';
import { COLORS, GRADE_COLORS } from './utils.js';
import { findCardSynergies, bestArchetypeForCard, searchCards } from './card-database.js';

// ===== App State =====
let allCards = [];
let sealedPool = null;
let currentPool = [];
let currentSort = 'color';
let activeColorFilters = new Set();
let activeRarityFilter = null;
let isDeckMode = false;
let currentView = 'pool';  // 'pool' or 'database'
let dbSearchQuery = '';
let dbSearchDebounce = null;
const deckBuilder = new DeckBuilder();

// ===== Mobile Detection =====
function isMobile() {
  return window.innerWidth <= 768;
}

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
const $btnBrowse = document.getElementById('btn-browse');
const $btnOpenAll = document.getElementById('btn-open-all');
const $btnViewPool = document.getElementById('btn-view-pool');
const $hamburger = document.getElementById('btn-hamburger');
const $sideDrawer = document.getElementById('side-drawer');
const $sideDrawerOverlay = document.getElementById('side-drawer-overlay');
const $bottomSheet = document.getElementById('bottom-sheet');
const $bottomSheetOverlay = document.getElementById('bottom-sheet-overlay');
const $dbSearchContainer = document.getElementById('db-search-container');
const $dbSearchInput = document.getElementById('db-search');

// ===== Initialize =====
async function init() {
  try {
    allCards = await getCards();
    rateAllCards(allCards);
    applyPrereleaseAdjustments(allCards);
    applyOverrides(allCards);
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
  currentView = 'pool';

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
  $hamburger.classList.add('hidden');
  hideSearchBar();

  document.querySelectorAll('.pack-btn').forEach(btn => {
    btn.disabled = false;
    btn.classList.remove('opened');
  });

  $btnOpenAll.classList.remove('hidden');
  closeSideDrawer();

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

  currentPool.push(...cards);
  renderPackCards(cards, $packReveal);
  packsOpened++;

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
  currentView = 'pool';
  $packOpening.classList.add('hidden');
  $toolbar.classList.remove('hidden');
  $mainContent.classList.remove('hidden');
  $strategyPanel.classList.remove('hidden');
  $hamburger.classList.remove('hidden');
  $btnBrowse.classList.remove('hidden');
  hideSearchBar();

  deckBuilder.init(currentPool);
  deckBuilder.onChange = () => updateDisplay();

  updateDisplay();
  renderStrategy();
}

function showDatabaseView() {
  currentView = 'database';
  // Hide pack opening, show main content with database
  $packOpening.classList.add('hidden');
  $toolbar.classList.remove('hidden');
  $mainContent.classList.remove('hidden');
  $strategyPanel.classList.add('hidden');
  $hamburger.classList.add('hidden');
  showSearchBar();

  // Exit deck mode if active
  if (isDeckMode) {
    isDeckMode = false;
    $btnToggleView.textContent = 'Deck Builder';
    $btnToggleView.classList.remove('active');
    $deckPanel.classList.add('hidden');
    $mainContent.classList.remove('deck-mode');
  }

  updateDisplay();
}

function showSearchBar() {
  if ($dbSearchContainer) $dbSearchContainer.classList.remove('hidden');
}

function hideSearchBar() {
  if ($dbSearchContainer) $dbSearchContainer.classList.add('hidden');
  dbSearchQuery = '';
  if ($dbSearchInput) $dbSearchInput.value = '';
}

// ===== Synergy Highlighting =====
function highlightSynergyCards(cardNames) {
  const nameSet = new Set(cardNames);
  const cards = document.querySelectorAll('#card-grid .card-wrapper');
  cards.forEach(el => {
    const cardName = el.querySelector('img')?.alt || '';
    const matches = nameSet.has(cardName) || cardName.split(' // ').some(n => nameSet.has(n));
    if (matches) {
      el.classList.add('synergy-highlight');
      el.classList.remove('synergy-dimmed');
    } else {
      el.classList.add('synergy-dimmed');
      el.classList.remove('synergy-highlight');
    }
  });

  document.getElementById('card-grid-container').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function clearSynergyHighlight() {
  document.querySelectorAll('#card-grid .card-wrapper').forEach(el => {
    el.classList.remove('synergy-highlight', 'synergy-dimmed');
  });
}

// ===== Side Drawer (mobile strategy) =====
function openSideDrawer() {
  $sideDrawer.classList.add('open');
  $sideDrawerOverlay.classList.remove('hidden');
  requestAnimationFrame(() => $sideDrawerOverlay.classList.add('visible'));
}

function closeSideDrawer() {
  $sideDrawer.classList.remove('open');
  $sideDrawerOverlay.classList.remove('visible');
  setTimeout(() => $sideDrawerOverlay.classList.add('hidden'), 300);
}

// ===== Bottom Sheet (long-press card action) =====
let bottomSheetCard = null;

function openBottomSheet(card) {
  bottomSheetCard = card;
  document.getElementById('bottom-sheet-card-name').textContent = card.name;
  const ratingBadge = document.getElementById('bottom-sheet-card-rating');
  ratingBadge.textContent = card.rating;
  ratingBadge.style.backgroundColor = GRADE_COLORS[card.rating] || '#666';

  const inPool = currentView === 'pool';
  const inDeck = deckBuilder.deck.some(c => c.id === card.id);
  const addBtn = document.getElementById('bottom-sheet-add-deck');

  if (!inPool) {
    addBtn.innerHTML = '<span class="action-icon">+</span> Open a pool first';
    addBtn.disabled = true;
  } else {
    addBtn.disabled = false;
    if (inDeck) {
      addBtn.innerHTML = '<span class="action-icon">\u2212</span> Remove from Deck';
    } else {
      addBtn.innerHTML = '<span class="action-icon">+</span> Add to Deck';
    }
  }

  $bottomSheet.classList.add('open');
  $bottomSheetOverlay.classList.remove('hidden');
  requestAnimationFrame(() => $bottomSheetOverlay.classList.add('visible'));
}

function closeBottomSheet() {
  $bottomSheet.classList.remove('open');
  $bottomSheetOverlay.classList.remove('visible');
  setTimeout(() => $bottomSheetOverlay.classList.add('hidden'), 300);
  bottomSheetCard = null;
}

// ===== Display Updates =====
function updateDisplay() {
  let displayCards;

  if (currentView === 'database') {
    // Database view: use allCards with search + filters
    displayCards = dbSearchQuery
      ? searchCards(allCards, dbSearchQuery)
      : [...allCards];
  } else if (isDeckMode) {
    displayCards = deckBuilder.sideboard;
  } else {
    displayCards = currentPool;
  }

  // Apply color filters
  if (activeColorFilters.size > 0) {
    displayCards = filterCards(displayCards, { colors: [...activeColorFilters] });
  }

  // Apply rarity filter
  if (activeRarityFilter) {
    displayCards = filterCards(displayCards, { rarity: activeRarityFilter });
  }

  // Apply sort
  displayCards = sortCards(displayCards, currentSort);

  $poolCount.textContent = displayCards.length;

  const deckCardIds = new Set(deckBuilder.deck.map(c => c.id));
  const inPoolContext = currentView === 'pool';

  $cardGrid.innerHTML = '';
  for (const card of displayCards) {
    const inDeck = isDeckMode || currentView === 'database' ? false : deckCardIds.has(card.id);

    const tile = renderCardTile(card, {
      inDeck,
      onClick: (c) => {
        if (isDeckMode && currentView === 'pool') {
          deckBuilder.addToDeck(c.id);
        } else {
          openCardModal(c);
        }
      },
      onLongPress: isMobile() && currentView === 'pool' ? (c) => openBottomSheet(c) : null,
      onRatingCycle: (c) => {
        // Re-render card to reflect new rating
        // Since we only changed rating display, no need for full refresh
      }
    });

    $cardGrid.appendChild(tile);
  }

  if (isDeckMode && currentView === 'pool') {
    const $deckStats = document.getElementById('deck-stats');
    const $deckList = document.getElementById('deck-list');
    deckBuilder.renderStats($deckStats);
    deckBuilder.renderDeckList($deckList);
  }
}

// ===== Card Modal =====
function openCardModal(card) {
  const inPool = currentView === 'pool';

  showModal(card, {
    allCards,
    inPool,
    deckBuilder,
    onCardChange: () => updateDisplay()
  });

  // Inject the synergy/archetype sections + Add to Deck button
  setTimeout(() => {
    const modal = document.getElementById('card-modal');
    if (!modal) return;

    const infoSection = modal.querySelector('.modal-info-section');
    if (!infoSection) return;

    // Best Archetype section
    const archetypeContainer = modal.querySelector('#modal-archetype-section');
    if (archetypeContainer) {
      const archetype = bestArchetypeForCard(card);
      archetypeContainer.innerHTML = `
        <div class="modal-archetype">
          <h3>Best Archetype</h3>
          <div class="archetype-card">
            <div class="archetype-name">${archetype.name}</div>
            ${archetype.colors.map(c => `<span class="mana-symbol mana-${c.toLowerCase()}">${c}</span>`).join(' ')}
            <div class="archetype-reason">${archetype.reason}</div>
          </div>
        </div>
      `;
    }

    // Synergies section
    const synergiesContainer = modal.querySelector('#modal-synergies-section');
    if (synergiesContainer) {
      const synergies = findCardSynergies(card, allCards);
      if (synergies.length > 0) {
        synergiesContainer.innerHTML = `
          <div class="modal-synergies">
            <h3>Synergizes With</h3>
            <div class="synergy-card-grid">
              ${synergies.map(s => `
                <div class="synergy-mini-card" data-card-id="${s.card.id}">
                  <img src="${s.card.image_front || ''}" alt="${s.card.name}" loading="lazy">
                  <div class="synergy-mini-info">
                    <div class="synergy-mini-name">${s.card.name}</div>
                    <div class="synergy-mini-reason">${s.reasons.join(', ')}</div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `;

        // Wire clicks on synergy mini-cards
        synergiesContainer.querySelectorAll('.synergy-mini-card').forEach(el => {
          el.addEventListener('click', () => {
            const cardId = el.dataset.cardId;
            const targetCard = allCards.find(c => c.id === cardId);
            if (targetCard) {
              modal.remove();
              openCardModal(targetCard);
            }
          });
        });
      }
    }

    // Add to Deck button
    const inDeck = deckBuilder.deck.some(c => c.id === card.id);
    const btn = document.createElement('button');

    if (!inPool) {
      btn.className = 'modal-deck-btn disabled';
      btn.textContent = 'Open a pool to build a deck';
      btn.disabled = true;
    } else {
      btn.className = `modal-deck-btn ${inDeck ? 'in-deck' : ''}`;
      btn.textContent = inDeck ? 'Remove from Deck' : 'Add to Deck';
      btn.addEventListener('click', () => {
        deckBuilder.toggleCard(card.id);
        const nowInDeck = deckBuilder.deck.some(c => c.id === card.id);
        btn.textContent = nowInDeck ? 'Remove from Deck' : 'Add to Deck';
        btn.classList.toggle('in-deck', nowInDeck);
      });
    }

    infoSection.appendChild(btn);
  }, 0);
}

// ===== Strategy Rendering =====
function renderStrategy() {
  const affinities = detectCollegeAffinity(currentPool);
  const synergies = findSynergies(currentPool);
  const suggestion = suggestBuild(currentPool);

  const collegeHTML = affinities.map((college, i) => `
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

  const synergyHTML = synergies.length > 0 ? `
    <h3>Detected Synergies</h3>
    ${synergies.map(s => `
      <div class="synergy-item synergy-clickable" data-synergy-cards="${btoa(unescape(encodeURIComponent(JSON.stringify(s.cards))))}">
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
  ` : '';

  const suggestionHTML = `
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
      \u2014 ${suggestion.removalCount >= 5 ? 'Excellent!' : suggestion.removalCount >= 3 ? 'Solid' : 'Light, prioritize finding more'}
    </div>
    <div class="build-detail"><strong>Suggested Mana:</strong> ${suggestion.manaBase}</div>
    ${suggestion.bombs.length > 0 ? `
      <div class="build-bombs">
        <strong>Key Cards:</strong><br>
        ${suggestion.bombs.map(c => `<span class="build-bomb-card">${c.name} (${c.rating})</span>`).join('')}
      </div>
    ` : ''}
  `;

  document.getElementById('college-rankings').innerHTML = collegeHTML;
  document.getElementById('synergy-list').innerHTML = synergyHTML;
  document.getElementById('build-suggestion').innerHTML = `<div class="build-suggestion">${suggestionHTML}</div>`;

  document.getElementById('drawer-college-rankings').innerHTML = `<div class="college-rankings">${collegeHTML}</div>`;
  document.getElementById('drawer-synergy-list').innerHTML = `<div class="synergy-list">${synergyHTML}</div>`;
  document.getElementById('drawer-build-suggestion').innerHTML = `<div class="build-suggestion">${suggestionHTML}</div>`;

  wireSynergyClicks(document.getElementById('synergy-list'));
  wireSynergyClicks(document.getElementById('drawer-synergy-list'));
}

function wireSynergyClicks(container) {
  container.querySelectorAll('.synergy-clickable').forEach(el => {
    el.addEventListener('click', () => {
      const isActive = el.classList.contains('synergy-active');
      document.querySelectorAll('.synergy-active').forEach(s => s.classList.remove('synergy-active'));
      clearSynergyHighlight();

      if (!isActive) {
        el.classList.add('synergy-active');
        const cardNames = JSON.parse(decodeURIComponent(escape(atob(el.dataset.synergyCards))));
        highlightSynergyCards(cardNames);
        if (isMobile()) {
          closeSideDrawer();
        }
      }
    });
  });
}

// ===== Event Listeners =====
$btnNewPool.addEventListener('click', () => {
  packsOpened = 0;
  startNewPool();
});

document.querySelectorAll('.pack-btn').forEach(btn => {
  btn.addEventListener('click', () => openPack(btn.dataset.pack));
});

$btnOpenAll.addEventListener('click', openAllRemaining);
$btnViewPool.addEventListener('click', showPoolView);

$btnToggleView.addEventListener('click', () => {
  if (currentView === 'database') {
    showPoolView();
    return;
  }
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

// Browse (database) button
$btnBrowse.addEventListener('click', () => {
  if (currentView === 'database') {
    showPoolView();
    $btnBrowse.classList.remove('active');
  } else {
    showDatabaseView();
    $btnBrowse.classList.add('active');
  }
});

// Search input
if ($dbSearchInput) {
  $dbSearchInput.addEventListener('input', (e) => {
    clearTimeout(dbSearchDebounce);
    dbSearchDebounce = setTimeout(() => {
      dbSearchQuery = e.target.value.trim();
      updateDisplay();
    }, 150);
  });
}

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

// Rarity filter buttons
document.querySelectorAll('.rarity-filter').forEach(btn => {
  btn.addEventListener('click', () => {
    const rarity = btn.dataset.rarity;
    if (activeRarityFilter === rarity) {
      activeRarityFilter = null;
      btn.classList.remove('active');
    } else {
      document.querySelectorAll('.rarity-filter').forEach(b => b.classList.remove('active'));
      activeRarityFilter = rarity;
      btn.classList.add('active');
    }
    updateDisplay();
  });
});

// Clear filters
document.getElementById('btn-clear-filters').addEventListener('click', () => {
  activeColorFilters.clear();
  activeRarityFilter = null;
  document.querySelectorAll('.color-filter, .rarity-filter').forEach(b => b.classList.remove('active'));
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

// Strategy panel toggle (desktop)
document.getElementById('btn-toggle-strategy').addEventListener('click', () => {
  const content = document.getElementById('strategy-content');
  const btn = document.getElementById('btn-toggle-strategy');
  content.classList.toggle('collapsed');
  btn.textContent = content.classList.contains('collapsed')
    ? 'Strategy Analysis \u25B6'
    : 'Strategy Analysis \u25BC';
});

// Hamburger menu (mobile)
$hamburger.addEventListener('click', openSideDrawer);
document.getElementById('btn-close-drawer').addEventListener('click', closeSideDrawer);
$sideDrawerOverlay.addEventListener('click', closeSideDrawer);

// Bottom sheet
$bottomSheetOverlay.addEventListener('click', closeBottomSheet);
document.getElementById('bottom-sheet-add-deck').addEventListener('click', () => {
  if (bottomSheetCard && currentView === 'pool') {
    deckBuilder.toggleCard(bottomSheetCard.id);
    closeBottomSheet();
  }
});
document.getElementById('bottom-sheet-view-card').addEventListener('click', () => {
  if (bottomSheetCard) {
    const card = bottomSheetCard;
    closeBottomSheet();
    openCardModal(card);
  }
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const modal = document.getElementById('card-modal');
    if (modal) modal.remove();
    closeSideDrawer();
    closeBottomSheet();
  }
});

// Start
document.addEventListener('DOMContentLoaded', init);
