export class BaseCard {
  constructor(config = {}) {
    this.container = config.container || null;
    this.options = {
      variant: config.variant || 'default',
      elevation: config.elevation || 1,
      glass: config.glass !== false,
      ...config.options
    };
    this._mounted = false;
    this._content = null;
  }

  render() {
    throw new Error('BaseCard subclass must implement render()');
  }

  createCard(innerHtml, classes = '') {
    const card = document.createElement('div');
    card.className = `card card-${this.options.variant} ${classes}`.trim();

    if (this.options.glass) {
      card.classList.add('card-glass');
    }

    card.dataset.elevation = this.options.elevation;
    card.innerHTML = innerHtml;

    return card;
  }

  showLoading() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="card card-glass">
        <div class="card-skeleton">
          <div class="skeleton" style="width:60%;height:20px;margin-bottom:12px;border-radius:4px;"></div>
          <div class="skeleton" style="width:80%;height:14px;margin-bottom:8px;border-radius:4px;"></div>
          <div class="skeleton" style="width:40%;height:14px;border-radius:4px;"></div>
        </div>
      </div>
    `;
  }

  showError(message = 'Something went wrong') {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="card card-glass card-error">
        <div class="card-error-content">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--error)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
          <p>${this.escapeHtml(message)}</p>
          <button class="modal-btn secondary card-retry-btn" style="padding:6px 14px;font-size:0.8rem;">Retry</button>
        </div>
      </div>
    `;

    const retryBtn = this.container.querySelector('.card-retry-btn');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => this.render());
    }
  }

  showEmpty(message = 'No content') {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="card card-glass card-empty">
        <div class="card-empty-content">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.3;">
            <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/>
          </svg>
          <p>${this.escapeHtml(message)}</p>
        </div>
      </div>
    `;
  }

  mount() {
    this._mounted = true;
    if (this.container) this.container.style.display = '';
  }

  unmount() {
    this._mounted = false;
    if (this.container) this.container.style.display = 'none';
  }

  isMounted() {
    return this._mounted;
  }

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  destroy() {
    this.unmount();
    if (this.container) this.container.innerHTML = '';
  }
}

export class GlassCard extends BaseCard {
  constructor(config = {}) {
    super({ ...config, variant: 'glass' });
  }

  render() {
    if (!this.container) return;

    const card = this.createCard(`
      <div class="card-body" id="card-body-${this._uid}"></div>
    `, 'card-interactive');

    this.container.appendChild(card);
    this._content = card.querySelector('.card-body');
  }

  setContent(html) {
    if (this._content) {
      this._content.innerHTML = html;
    }
  }

  appendContent(html) {
    if (this._content) {
      this._content.insertAdjacentHTML('beforeend', html);
    }
  }
}

export class SkeletonCard extends BaseCard {
  constructor(config = {}) {
    super({ ...config, variant: 'skeleton' });
    this.lines = config.lines || 3;
    this.lineWidths = config.lineWidths || [60, 80, 40];
  }

  render() {
    if (!this.container) return;

    const lines = Array.from({ length: this.lines }, (_, i) => {
      const width = this.lineWidths[i % this.lineWidths.length];
      const isLast = i === this.lines - 1;
      return `<div class="skeleton" style="width:${width}%;height:${isLast ? 14 : 20}px;${i > 0 ? 'margin-top:10px;' : ''}border-radius:4px;"></div>`;
    }).join('');

    const card = this.createCard(`
      <div class="card-skeleton-content">
        ${lines}
      </div>
    `);

    this.container.appendChild(card);
  }
}

export class CardGrid {
  constructor(config = {}) {
    this.container = config.container || null;
    this.columns = config.columns || 4;
    this.gap = config.gap || 12;
    this.cards = [];
  }

  render() {
    if (!this.container) return;

    this.container.style.display = 'grid';
    this.container.style.gridTemplateColumns = `repeat(${this.columns}, 1fr)`;
    this.container.style.gap = `${this.gap}px`;
  }

  addCard(card) {
    if (!this.container || !card) return;

    card.render();
    if (card.container && this.container !== card.container) {
      this.container.appendChild(card.container.firstElementChild);
    }
    this.cards.push(card);
  }

  removeCard(index) {
    if (index >= 0 && index < this.cards.length) {
      const card = this.cards[index];
      card.destroy();
      this.cards.splice(index, 1);
    }
  }

  clear() {
    this.cards.forEach(c => c.destroy());
    this.cards = [];
    if (this.container) this.container.innerHTML = '';
  }

  updateColumns(columns) {
    this.columns = columns;
    if (this.container) {
      this.container.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
    }
  }

  destroy() {
    this.clear();
  }
}
