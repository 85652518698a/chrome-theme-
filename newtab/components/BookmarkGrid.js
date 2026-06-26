import { BookmarkService, BookmarkWidget } from '../bookmarks.js';
import { BaseCard, CardGrid } from './Cards.js';

export class BookmarkGrid extends BaseCard {
  constructor(config = {}) {
    super({
      container: config.container,
      variant: 'glass',
      ...config
    });

    this.addBtn = config.addBtn || null;
    this.service = new BookmarkService();
    this.widget = new BookmarkWidget({
      container: null,
      service: this.service,
      addBtn: null
    });
  }

  async render() {
    if (!this.container) return;

    this.container.innerHTML = '';
    this.showLoading();

    this.widget.container = this.container;

    try {
      await this.widget.render();
    } catch (err) {
      console.warn('BookmarkGrid render error:', err);
      this.showError('Unable to load bookmarks');
    }
  }

  async load() {
    await this.render();
  }

  async refresh() {
    await this.render();
  }

  mount() {
    super.mount();
  }

  unmount() {
    super.unmount();
  }

  destroy() {
    this.widget = null;
    super.destroy();
  }
}
