import { SearchEngine, SearchUI } from '../search.js';

export class SearchBar {
  constructor(config = {}) {
    this.container = config.container || null;
    this.defaultEngine = config.defaultEngine || 'google';
    this.onSearch = config.onSearch || null;
    this.searchUI = null;
    this.searchEngine = null;
  }

  render() {
    if (!this.container) return;

    this.searchEngine = new SearchEngine({
      defaultEngine: this.defaultEngine,
      onSearch: (query, engine) => {
        if (this.onSearch) this.onSearch(query, engine);
      }
    });

    this.searchUI = new SearchUI({
      container: this.container,
      searchEngine: this.searchEngine
    });

    this.searchUI.render();
  }

  focus() {
    const input = this.container?.querySelector('.search-bar');
    if (input) {
      input.focus();
      input.select();
    }
  }

  blur() {
    const input = this.container?.querySelector('.search-bar');
    if (input) input.blur();
  }

  clear() {
    if (this.searchUI) {
      this.searchUI.clearSearch();
    }
  }

  getValue() {
    const input = this.container?.querySelector('.search-bar');
    return input?.value || '';
  }

  setValue(text) {
    const input = this.container?.querySelector('.search-bar');
    if (input) {
      input.value = text;
      if (this.searchUI) {
        this.searchUI.clearBtn.classList.toggle('visible', text.length > 0);
      }
    }
  }

  mount() {
    if (this.container) this.container.style.display = '';
  }

  unmount() {
    if (this.container) this.container.style.display = 'none';
  }

  update(config) {
    if (config.defaultEngine && config.defaultEngine !== this.defaultEngine) {
      this.defaultEngine = config.defaultEngine;
      this.render();
    }
  }

  destroy() {
    if (this.container) this.container.innerHTML = '';
  }
}
