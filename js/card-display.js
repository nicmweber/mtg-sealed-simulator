import { GRADE_COLORS, RARITIES, renderManaSymbols, COLLEGES } from './utils.js';
import { cycleGrade, overrideCardRating, resetCardRating } from './rating-adjustments.js';

/**
 * Create a card element for the grid.
 * Shared between pool view and database view.
 */
export function renderCardTile(card, options = {}) {
  const { onClick, onLongPress, showRating = true, inDeck = false, onRatingCycle } = options;

  const wrapper = document.createElement('div');
  wrapper.className = `card-wrapper ${card.rarity} ${inDeck ? 'in-deck' : ''}`;
  wrapper.dataset.cardId = card.id;
  wrapper.dataset.cardName = card.name;

  // Card image
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
  wrapper.appendChild(img);

  // Rating badge (tappable to cycle)
  if (showRating && card.rating) {
    const badge = document.createElement('button');
    badge.type = 'button';
    badge.className = 'rating-badge';
    if (card.rating_user_override) badge.classList.add('user-override');
    badge.textContent = card.rating;
    badge.style.backgroundColor = GRADE_COLORS[card.rating] || '#666';
    badge.title = 'Tap to cycle grade, long-press to reset';

    // Short tap cycles grade
    let badgeLongPressTimer = null;
    let badgeLongPressed = false;

    badge.addEventListener('click', (e) => {
      e.stopPropagation();
      if (badgeLongPressed) {
        badgeLongPressed = false;
        return;
      }
      const newGrade = cycleGrade(card.rating);
      overrideCardRating(card, newGrade);
      badge.textContent = newGrade;
      badge.style.backgroundColor = GRADE_COLORS[newGrade] || '#666';
      badge.classList.add('user-override');
      if (onRatingCycle) onRatingCycle(card);
    });

    const startBadgePress = () => {
      badgeLongPressed = false;
      badgeLongPressTimer = setTimeout(() => {
        badgeLongPressed = true;
        // Reset to computed grade
        const resetGrade = resetCardRating(card);
        badge.textContent = resetGrade;
        badge.style.backgroundColor = GRADE_COLORS[resetGrade] || '#666';
        badge.classList.remove('user-override');
        if (onRatingCycle) onRatingCycle(card);
      }, 600);
    };
    const cancelBadgePress = () => { clearTimeout(badgeLongPressTimer); };

    badge.addEventListener('touchstart', startBadgePress, { passive: true });
    badge.addEventListener('touchend', cancelBadgePress);
    badge.addEventListener('touchmove', cancelBadgePress, { passive: true });
    badge.addEventListener('touchcancel', cancelBadgePress);
    badge.addEventListener('mousedown', startBadgePress);
    badge.addEventListener('mouseup', cancelBadgePress);
    badge.addEventListener('mouseleave', cancelBadgePress);

    wrapper.appendChild(badge);
  }

  // Foil indicator
  if (card.foil) {
    const foilBadge = document.createElement('span');
    foilBadge.className = 'foil-badge';
    foilBadge.textContent = 'FOIL';
    wrapper.appendChild(foilBadge);
  }

  // Promo indicator
  if (card.isPromo) {
    const promoBadge = document.createElement('span');
    promoBadge.className = 'promo-badge';
    promoBadge.textContent = 'PROMO';
    wrapper.appendChild(promoBadge);
  }

  // DFC flip button
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
    wrapper.appendChild(flipBtn);
  }

  // Long-press detection on the tile itself
  if (onLongPress) {
    let longPressTimer = null;
    let longPressed = false;
    const startPress = () => {
      longPressed = false;
      wrapper.classList.add('long-press-active');
      longPressTimer = setTimeout(() => {
        longPressed = true;
        wrapper.classList.remove('long-press-active');
        onLongPress(card);
      }, 500);
    };
    const cancelPress = () => {
      clearTimeout(longPressTimer);
      wrapper.classList.remove('long-press-active');
    };
    wrapper.addEventListener('touchstart', startPress, { passive: true });
    wrapper.addEventListener('touchend', (e) => {
      cancelPress();
      if (longPressed) { e.preventDefault(); }
    });
    wrapper.addEventListener('touchmove', cancelPress, { passive: true });
    wrapper.addEventListener('touchcancel', cancelPress);

    wrapper._getLongPressed = () => longPressed;
    wrapper._clearLongPressed = () => { longPressed = false; };
  }

  // Click handler
  if (onClick) {
    wrapper.addEventListener('click', (e) => {
      if (wrapper._getLongPressed && wrapper._getLongPressed()) {
        wrapper._clearLongPressed();
        e.preventDefault();
        return;
      }
      onClick(card);
    });
    wrapper.style.cursor = 'pointer';
  }

  return wrapper;
}

// Keep backwards compat alias
export const renderCard = renderCardTile;

/**
 * Render a grid of cards into a container
 */
export function renderCardGrid(cards, container, options = {}) {
  container.innerHTML = '';
  for (const card of cards) {
    container.appendChild(renderCard(card, options));
  }
}

/**
 * Show card detail modal
 * @param {Object} card
 * @param {Object} context - optional: { allCards, inPool, deckBuilder, onCardChange, onSynergyClick }
 */
export function showModal(card, context = {}) {
  const { allCards, inPool, deckBuilder, onCardChange, onSynergyClick } = context;

  // Remove existing modal if any
  const existing = document.getElementById('card-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'card-modal';
  modal.className = 'modal-overlay';

  const colleges = [];
  for (const [key, college] of Object.entries(COLLEGES)) {
    const cardColors = card.color_identity || card.colors || [];
    if (college.colors.some(c => cardColors.includes(c))) {
      colleges.push(college.name);
    }
  }

  // Rating breakdown
  const hasAdjustment = (card.rating_adjustment ?? 0) !== 0;
  const hasOverride = !!card.rating_user_override;

  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <button class="modal-close">&times;</button>
      </div>
      <div class="modal-body">
        <div class="modal-image-section">
          <img src="${card.image_front || ''}" alt="${card.name}" class="modal-card-image" id="modal-card-img">
          ${card.image_back ? `<button class="modal-flip-btn" id="modal-flip">Flip Card</button>` : ''}
        </div>
        <div class="modal-info-section">
          <h2 class="modal-card-name">${card.name}</h2>
          <div class="modal-mana-cost">${renderManaSymbols(card.mana_cost)}</div>
          <div class="modal-type-line">${card.type_line}</div>
          <div class="modal-oracle-text">${formatOracleText(card.oracle_text)}</div>
          ${card.power !== null ? `<div class="modal-stats">${card.power}/${card.toughness}</div>` : ''}
          <div class="modal-meta">
            <div class="modal-rating">
              <span class="modal-rating-badge ${hasOverride ? 'user-override' : ''}" style="background:${GRADE_COLORS[card.rating] || '#666'}">${card.rating}</span>
              <span class="modal-rating-score">Score: ${card.rating_score}/100</span>
            </div>
            <div class="modal-rarity" style="color:${RARITIES[card.rarity]?.color || '#fff'}">
              ${RARITIES[card.rarity]?.name || card.rarity}
            </div>
          </div>
          ${(hasAdjustment || hasOverride) ? `
            <div class="modal-rating-breakdown">
              <div class="breakdown-row"><span class="bd-label">Base:</span> <span class="bd-value">${card.rating_computed && !hasAdjustment ? card.rating_computed : scoreToBaseGrade(card)}</span></div>
              ${hasAdjustment ? `
                <div class="breakdown-row">
                  <span class="bd-label">Prerelease:</span>
                  <span class="bd-value">${card.rating_adjustment > 0 ? '+' : ''}${card.rating_adjustment} \u2192 ${card.rating_computed}</span>
                </div>
                ${card.rating_adjustment_reasons?.length > 0 ? `
                  <div class="breakdown-reasons">${card.rating_adjustment_reasons.join(' \u00B7 ')}</div>
                ` : ''}
              ` : ''}
              ${hasOverride ? `
                <div class="breakdown-row">
                  <span class="bd-label">Your override:</span>
                  <span class="bd-value">${card.rating_user_override}</span>
                  <button class="bd-reset-btn" id="btn-reset-rating">Reset</button>
                </div>
              ` : ''}
            </div>
          ` : ''}
          ${card.synergy_tags?.length > 0 ? `
            <div class="modal-tags">
              <strong>Tags:</strong>
              ${card.synergy_tags.map(t => `<span class="synergy-tag">${t}</span>`).join('')}
            </div>
          ` : ''}
          ${card.keywords?.length > 0 ? `
            <div class="modal-keywords">
              <strong>Keywords:</strong> ${card.keywords.join(', ')}
            </div>
          ` : ''}
          <div id="modal-archetype-section"></div>
          <div id="modal-synergies-section"></div>
        </div>
      </div>
    </div>
  `;

  // Close handlers
  modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });

  // DFC flip
  if (card.image_back) {
    let showingFront = true;
    modal.querySelector('#modal-flip').addEventListener('click', () => {
      showingFront = !showingFront;
      modal.querySelector('#modal-card-img').src = showingFront ? card.image_front : card.image_back;
    });
  }

  // Reset rating button
  const resetBtn = modal.querySelector('#btn-reset-rating');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      resetCardRating(card);
      modal.remove();
      showModal(card, context);  // re-open
      if (onCardChange) onCardChange(card);
    });
  }

  document.body.appendChild(modal);
}

/**
 * Get the base (pre-adjustment, pre-override) grade for a card
 */
function scoreToBaseGrade(card) {
  // rating_score_base is set by rateAllCards; scoreToGrade imported from card-ratings
  if (card.rating_score_base != null) {
    // Compute base grade from base score
    return gradeFromScore(card.rating_score_base);
  }
  return card.rating_computed || card.rating;
}

// Inline minimal score-to-grade (avoid circular import; duplicates thresholds)
function gradeFromScore(score) {
  if (score >= 75) return 'A+';
  if (score >= 65) return 'A';
  if (score >= 58) return 'A-';
  if (score >= 52) return 'B+';
  if (score >= 46) return 'B';
  if (score >= 40) return 'B-';
  if (score >= 35) return 'C+';
  if (score >= 30) return 'C';
  if (score >= 25) return 'C-';
  if (score >= 20) return 'D+';
  if (score >= 15) return 'D';
  if (score >= 10) return 'D-';
  return 'F';
}

/**
 * Format oracle text with line breaks and mana symbols
 */
function formatOracleText(text) {
  if (!text) return '<em>No rules text</em>';
  return text
    .split('\n')
    .map(line => `<p>${renderManaSymbols(line.replace(/\{/g, '{').replace(/\}/g, '}'))}</p>`)
    .join('');
}

/**
 * Render pack opening cards with animation
 */
export function renderPackCards(cards, container, delay = 80) {
  for (let i = 0; i < cards.length; i++) {
    const cardEl = renderCard(cards[i], {
      onClick: (card) => showModal(card)
    });
    cardEl.style.opacity = '0';
    cardEl.style.transform = 'translateY(20px) scale(0.9)';
    cardEl.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    container.appendChild(cardEl);

    setTimeout(() => {
      cardEl.style.opacity = '1';
      cardEl.style.transform = 'translateY(0) scale(1)';
    }, i * delay);
  }
}
