export class SearchEngine {
  constructor(config = {}) {
    this.engines = {
      google: {
        name: 'Google',
        url: 'https://www.google.com/search',
        param: 'q',
        icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>`
      },
      bing: {
        name: 'Bing',
        url: 'https://www.bing.com/search',
        param: 'q',
        icon: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 1L2 3v10l4 2V1z" fill="#008373"/><path d="M6 1l8 3v8l-4 2V7L6 5V1z" fill="#50E6FF"/></svg>`
      },
      duckduckgo: {
        name: 'DuckDuckGo',
        url: 'https://duckduckgo.com/',
        param: 'q',
        icon: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" fill="#DE5833"/><path d="M8 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" fill="#fff"/></svg>`
      }
    };

    this.currentEngine = config.defaultEngine || 'google';
    this.onSearch = config.onSearch || null;
  }

  getCurrentEngine() {
    return this.engines[this.currentEngine];
  }

  getEngines() {
    return this.engines;
  }

  setEngine(engineId) {
    if (this.engines[engineId]) {
      this.currentEngine = engineId;
      return true;
    }
    return false;
  }

  search(query) {
    if (!query || !query.trim()) return;

    const engine = this.engines[this.currentEngine];
    const url = `${engine.url}?${engine.param}=${encodeURIComponent(query.trim())}`;

    if (this.onSearch) {
      this.onSearch(query, this.currentEngine);
    }

    window.location.href = url;
  }

  getSuggestions(query) {
    return new Promise((resolve, reject) => {
      if (!query || query.length < 2) {
        resolve([]);
        return;
      }

      const url = `https://suggestqueries.google.com/complete/search?client=chrome&q=${encodeURIComponent(query)}`;

      const script = document.createElement('script');
      const callbackName = `jsonp_${Date.now()}`;

      window[callbackName] = (data) => {
        delete window[callbackName];
        document.body.removeChild(script);
        if (data && data[1]) {
          resolve(data[1]);
        } else {
          resolve([]);
        }
      };

      script.src = `${url}&callback=${callbackName}`;
      script.onerror = () => {
        delete window[callbackName];
        document.body.removeChild(script);
        resolve([]);
      };
      document.body.appendChild(script);

      setTimeout(() => {
        if (window[callbackName]) {
          window[callbackName](null);
        }
      }, 3000);
    });
  }
}

export class SearchUI {
  constructor(config = {}) {
    this.container = config.container || document.body;
    this.searchEngine = config.searchEngine || new SearchEngine();
    this.suggestionTimeout = null;
    this.selectedSuggestionIndex = -1;
    this.currentSuggestions = [];
  }

  render() {
    const wrapper = document.createElement('div');
    wrapper.className = 'search-bar-wrapper';

    wrapper.innerHTML = `
      <input type="text" class="search-bar" placeholder="Search Google or type a URL..." autocomplete="off" spellcheck="false" autofocus>
      <span class="search-icon">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
      </span>
      <button class="search-clear-btn" title="Clear search">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
      <button class="search-engine-btn" title="Change search engine">
        ${this.searchEngine.getCurrentEngine().icon}
      </button>
      <div class="search-suggestions"></div>
    `;

    this.container.appendChild(wrapper);
    this.bindEvents();
  }

  bindEvents() {
    this.input = this.container.querySelector('.search-bar');
    this.clearBtn = this.container.querySelector('.search-clear-btn');
    this.engineBtn = this.container.querySelector('.search-engine-btn');
    this.suggestionsContainer = this.container.querySelector('.search-suggestions');

    this.input.addEventListener('input', () => this.handleInput());
    this.input.addEventListener('keydown', (e) => this.handleKeydown(e));
    this.input.addEventListener('focus', () => this.handleFocus());
    this.input.addEventListener('blur', () => {
      setTimeout(() => this.hideSuggestions(), 200);
    });

    this.clearBtn.addEventListener('click', () => this.clearSearch());

    this.engineBtn.addEventListener('click', () => this.cycleEngine());

    this.input.focus();
  }

  handleInput() {
    const query = this.input.value.trim();
    this.clearBtn.classList.toggle('visible', query.length > 0);

    clearTimeout(this.suggestionTimeout);
    if (query.length >= 2) {
      this.suggestionTimeout = setTimeout(() => this.fetchSuggestions(query), 200);
    } else {
      this.hideSuggestions();
    }
  }

  async fetchSuggestions(query) {
    try {
      const suggestions = await this.searchEngine.getSuggestions(query);
      this.currentSuggestions = suggestions || [];
      this.selectedSuggestionIndex = -1;
      this.renderSuggestions(this.currentSuggestions);
    } catch {
      this.hideSuggestions();
    }
  }

  renderSuggestions(suggestions) {
    if (!suggestions || suggestions.length === 0) {
      this.hideSuggestions();
      return;
    }

    this.suggestionsContainer.innerHTML = suggestions.map((s, i) => `
      <div class="suggestion-item" data-index="${i}">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <span class="suggestion-text">${this.escapeHtml(s)}</span>
      </div>
    `).join('');

    this.suggestionsContainer.classList.add('visible');

    this.suggestionsContainer.querySelectorAll('.suggestion-item').forEach((item) => {
      item.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const index = parseInt(item.dataset.index);
        this.selectSuggestion(index);
      });
    });
  }

  hideSuggestions() {
    this.suggestionsContainer.classList.remove('visible');
    this.currentSuggestions = [];
    this.selectedSuggestionIndex = -1;
  }

  handleKeydown(e) {
    const suggestionsVisible = this.suggestionsContainer.classList.contains('visible');

    if (e.key === 'Enter') {
      e.preventDefault();
      if (suggestionsVisible && this.selectedSuggestionIndex >= 0) {
        this.selectSuggestion(this.selectedSuggestionIndex);
      } else {
        this.performSearch();
      }
    }

    if (e.key === 'ArrowDown' && suggestionsVisible) {
      e.preventDefault();
      this.selectedSuggestionIndex = Math.min(
        this.selectedSuggestionIndex + 1,
        this.currentSuggestions.length - 1
      );
      this.highlightSuggestion();
    }

    if (e.key === 'ArrowUp' && suggestionsVisible) {
      e.preventDefault();
      this.selectedSuggestionIndex = Math.max(this.selectedSuggestionIndex - 1, -1);
      this.highlightSuggestion();
    }

    if (e.key === 'Escape') {
      if (suggestionsVisible) {
        this.hideSuggestions();
      } else {
        this.input.blur();
      }
    }
  }

  handleFocus() {
    if (this.input.value.trim().length >= 2) {
      this.fetchSuggestions(this.input.value.trim());
    }
  }

  highlightSuggestion() {
    const items = this.suggestionsContainer.querySelectorAll('.suggestion-item');
    items.forEach((item, i) => {
      item.classList.toggle('active', i === this.selectedSuggestionIndex);
    });

    if (this.selectedSuggestionIndex >= 0 && items[this.selectedSuggestionIndex]) {
      items[this.selectedSuggestionIndex].scrollIntoView({ block: 'nearest' });
    }
  }

  selectSuggestion(index) {
    const suggestion = this.currentSuggestions[index];
    if (suggestion) {
      this.input.value = suggestion;
      this.performSearch();
    }
  }

  performSearch() {
    const query = this.input.value.trim();
    if (query) {
      this.searchEngine.search(query);
    }
  }

  clearSearch() {
    this.input.value = '';
    this.input.focus();
    this.clearBtn.classList.remove('visible');
    this.hideSuggestions();
  }

  cycleEngine() {
    const engines = Object.keys(this.searchEngine.getEngines());
    const currentIndex = engines.indexOf(this.searchEngine.currentEngine);
    const nextIndex = (currentIndex + 1) % engines.length;
    const nextEngine = engines[nextIndex];

    this.searchEngine.setEngine(nextEngine);
    this.engineBtn.innerHTML = this.searchEngine.getCurrentEngine().icon;
    this.engineBtn.title = `Search: ${this.searchEngine.getCurrentEngine().name}`;

    const placeholder = `Search ${this.searchEngine.getCurrentEngine().name} or type a URL...`;
    this.input.placeholder = placeholder;
  }

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}
