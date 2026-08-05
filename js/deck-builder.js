import { isCreature, isSpell, COLORS, suggestLands } from './utils.js';

/**
 * Deck builder state management
 */
export class DeckBuilder {
  constructor() {
    this.deck = [];
    this.sideboard = [];
    this.onChange = null; // callback when state changes
  }

  /**
   * Initialize with a sealed pool
   */
  init(pool) {
    this.deck = [];
    this.sideboard = [...pool];
    this._notify();
  }

  /**
   * Add a card to the deck from sideboard
   */
  addToDeck(cardId) {
    const idx = this.sideboard.findIndex(c => c.id === cardId);
    if (idx === -1) return;
    const card = this.sideboard.splice(idx, 1)[0];
    this.deck.push(card);
    this._notify();
  }

  /**
   * Remove a card from deck back to sideboard
   */
  removeFromDeck(cardId) {
    const idx = this.deck.findIndex(c => c.id === cardId);
    if (idx === -1) return;
    const card = this.deck.splice(idx, 1)[0];
    this.sideboard.push(card);
    this._notify();
  }

  /**
   * Toggle a card between deck and sideboard
   */
  toggleCard(cardId) {
    if (this.deck.some(c => c.id === cardId)) {
      this.removeFromDeck(cardId);
    } else {
      this.addToDeck(cardId);
    }
  }

  /**
   * Replace the current deck with the given cards (must be pool members).
   * Handles duplicate copies (same Scryfall id) one splice at a time.
   */
  setDeck(cards) {
    // Move everything back to sideboard first
    this.sideboard.push(...this.deck);
    this.deck = [];

    for (const card of cards) {
      let idx = this.sideboard.indexOf(card);
      if (idx === -1) idx = this.sideboard.findIndex(c => c.id === card.id);
      if (idx !== -1) {
        this.deck.push(this.sideboard.splice(idx, 1)[0]);
      }
    }
    this._notify();
  }

  /**
   * Get deck statistics
   */
  getStats() {
    const creatures = this.deck.filter(c => isCreature(c)).length;
    const spells = this.deck.filter(c => isSpell(c) && !isCreature(c)).length;
    const other = this.deck.length - creatures - spells;

    // Mana curve
    const manaCurve = {};
    for (let i = 0; i <= 7; i++) manaCurve[i] = 0;
    for (const card of this.deck) {
      const bucket = Math.min(Math.floor(card.cmc), 7);
      manaCurve[bucket]++;
    }

    // Color distribution
    const colorDist = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 };
    for (const card of this.deck) {
      const colors = card.colors || [];
      if (colors.length === 0) {
        colorDist.C++;
      } else {
        for (const c of colors) {
          if (colorDist.hasOwnProperty(c)) colorDist[c]++;
        }
      }
    }

    // Average CMC (excluding 0-cost)
    const nonZero = this.deck.filter(c => c.cmc > 0);
    const avgCmc = nonZero.length > 0
      ? (nonZero.reduce((sum, c) => sum + c.cmc, 0) / nonZero.length).toFixed(1)
      : '0.0';

    return {
      totalCards: this.deck.length,
      creatures,
      spells,
      other,
      manaCurve,
      colorDist,
      avgCmc,
      lands: suggestLands(this.deck)
    };
  }

  /**
   * Render the deck stats panel
   */
  renderStats(container) {
    const stats = this.getStats();
    const maxCurveCount = Math.max(...Object.values(stats.manaCurve), 1);

    const withLands = stats.totalCards + stats.lands.total;
    container.innerHTML = `
      <div class="deck-stats">
        <h3>Deck (${stats.totalCards} + ${stats.lands.total} lands = ${withLands}/40)</h3>
        <div class="deck-count-bar ${stats.totalCards < 22 ? 'too-few' : stats.totalCards > 24 ? 'too-many' : 'just-right'}">
          <div class="deck-count-fill" style="width: ${Math.min(100, (withLands / 40) * 100)}%"></div>
          <span class="deck-count-label">${stats.totalCards} spells (target ~23) + auto lands</span>
        </div>

        <div class="stats-row">
          <div class="stat">
            <span class="stat-label">Creatures</span>
            <span class="stat-value">${stats.creatures}</span>
          </div>
          <div class="stat">
            <span class="stat-label">Spells</span>
            <span class="stat-value">${stats.spells}</span>
          </div>
          <div class="stat">
            <span class="stat-label">Other</span>
            <span class="stat-value">${stats.other}</span>
          </div>
          <div class="stat">
            <span class="stat-label">Avg CMC</span>
            <span class="stat-value">${stats.avgCmc}</span>
          </div>
        </div>

        <h4>Mana Curve</h4>
        <div class="mana-curve">
          ${Object.entries(stats.manaCurve).map(([cmc, count]) => `
            <div class="curve-column">
              <div class="curve-bar-wrapper">
                <div class="curve-bar" style="height: ${(count / maxCurveCount) * 100}%">
                  ${count > 0 ? `<span class="curve-count">${count}</span>` : ''}
                </div>
              </div>
              <span class="curve-label">${cmc === '7' ? '7+' : cmc}</span>
            </div>
          `).join('')}
        </div>

        <h4>Colors</h4>
        <div class="color-dist">
          ${Object.entries(stats.colorDist)
            .filter(([_, count]) => count > 0)
            .map(([color, count]) => `
              <div class="color-pip">
                <span class="mana-symbol mana-${color.toLowerCase()}">${color}</span>
                <span>${count}</span>
              </div>
            `).join('')}
        </div>

        <h4>Auto Lands (pip-weighted)</h4>
        <div class="auto-lands">
          ${stats.lands.list.length > 0
            ? stats.lands.list.map(l => `
                <div class="auto-land-row">
                  <span class="mana-symbol mana-${l.color.toLowerCase()}">${l.color}</span>
                  <span class="auto-land-name">${l.count} ${l.name}</span>
                </div>
              `).join('')
            : '<div class="auto-land-empty">Add cards to calculate lands</div>'}
        </div>
      </div>
    `;
  }

  /**
   * Render the deck list as text
   */
  renderDeckList(container) {
    // Sort deck by type then CMC
    const sorted = [...this.deck].sort((a, b) => {
      const typeOrder = (c) => {
        if (isCreature(c)) return 0;
        if (isSpell(c)) return 1;
        return 2;
      };
      const typeDiff = typeOrder(a) - typeOrder(b);
      if (typeDiff !== 0) return typeDiff;
      return a.cmc - b.cmc;
    });

    const creatures = sorted.filter(c => isCreature(c));
    const spells = sorted.filter(c => isSpell(c) && !isCreature(c));
    const other = sorted.filter(c => !isCreature(c) && !isSpell(c));

    let html = '<div class="deck-list">';

    if (creatures.length > 0) {
      html += `<h4>Creatures (${creatures.length})</h4>`;
      html += creatures.map(c => `
        <div class="deck-list-item" data-card-id="${c.id}">
          <span class="deck-list-name">${c.name}</span>
          <span class="deck-list-cmc">${c.cmc}</span>
        </div>
      `).join('');
    }

    if (spells.length > 0) {
      html += `<h4>Spells (${spells.length})</h4>`;
      html += spells.map(c => `
        <div class="deck-list-item" data-card-id="${c.id}">
          <span class="deck-list-name">${c.name}</span>
          <span class="deck-list-cmc">${c.cmc}</span>
        </div>
      `).join('');
    }

    if (other.length > 0) {
      html += `<h4>Other (${other.length})</h4>`;
      html += other.map(c => `
        <div class="deck-list-item" data-card-id="${c.id}">
          <span class="deck-list-name">${c.name}</span>
          <span class="deck-list-cmc">${c.cmc}</span>
        </div>
      `).join('');
    }

    html += '</div>';
    container.innerHTML = html;

    // Add click handlers to remove from deck
    container.querySelectorAll('.deck-list-item').forEach(el => {
      el.addEventListener('click', () => {
        this.removeFromDeck(el.dataset.cardId);
      });
      el.title = 'Click to remove from deck';
    });
  }

  /**
   * Export deck as plain text (includes the auto-suggested basic lands)
   */
  exportText() {
    const lines = this.deck.map(c => `1 ${c.name}`);
    const lands = suggestLands(this.deck);
    if (lands.list.length > 0) {
      lines.push('');
      lines.push(...lands.list.map(l => `${l.count} ${l.name}`));
    }
    lines.push('');
    lines.push('// Sideboard');
    lines.push(...this.sideboard.map(c => `1 ${c.name}`));
    return lines.join('\n');
  }

  _notify() {
    if (this.onChange) this.onChange();
  }
}
