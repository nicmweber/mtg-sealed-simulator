import { GRADE_COLORS, RARITIES, renderManaSymbols, COLLEGES } from './utils.js';

/**
 * Create a card element for the grid
 */
export function renderCard(card, options = {}) {
  const { onClick, showRating = true, inDeck = false } = options;

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
      `<svg xmlns="http://www.w3.org/2000/svg" width="244" height="340" viewBox="0 0 244 340">
        <rect fill="#333" width="244" height="340" rx="12"/>
        <text fill="#aaa" font-family="Arial" font-size="14" x="122" y="170" text-anchor="middle">${card.name}</text>
      </svg>`
    );
  };
  wrapper.appendChild(img);

  // Rating badge
  if (showRating && card.rating) {
    const badge = document.createElement('span');
    badge.className = 'rating-badge';
    badge.textContent = card.rating;
    badge.style.backgroundColor = GRADE_COLORS[card.rating] || '#666';
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
    flipBtn.textContent = '🔄';
    flipBtn.title = 'Flip card';
    let showingFront = true;
    flipBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      showingFront = !showingFront;
      img.src = showingFront ? card.image_front : card.image_back;
    });
    wrapper.appendChild(flipBtn);
  }

  // Click handler
  if (onClick) {
    wrapper.addEventListener('click', () => onClick(card));
    wrapper.style.cursor = 'pointer';
  }

  return wrapper;
}

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
 */
export function showModal(card) {
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

  modal.innerHTML = `
    <div class="modal-content">
      <button class="modal-close">&times;</button>
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
              <span class="modal-rating-badge" style="background:${GRADE_COLORS[card.rating] || '#666'}">${card.rating}</span>
              <span class="modal-rating-score">Score: ${card.rating_score}/100</span>
            </div>
            <div class="modal-rarity" style="color:${RARITIES[card.rarity]?.color || '#fff'}">
              ${RARITIES[card.rarity]?.name || card.rarity}
            </div>
          </div>
          ${card.synergy_tags?.length > 0 ? `
            <div class="modal-tags">
              <strong>Tags:</strong>
              ${card.synergy_tags.map(t => `<span class="synergy-tag">${t}</span>`).join('')}
            </div>
          ` : ''}
          ${colleges.length > 0 ? `
            <div class="modal-colleges">
              <strong>College Fit:</strong> ${colleges.join(', ')}
            </div>
          ` : ''}
          ${card.keywords?.length > 0 ? `
            <div class="modal-keywords">
              <strong>Keywords:</strong> ${card.keywords.join(', ')}
            </div>
          ` : ''}
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

  document.body.appendChild(modal);
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
