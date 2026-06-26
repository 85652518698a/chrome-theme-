import { QuoteService, QuoteWidget } from '../quotes.js';
import { BaseCard } from './Cards.js';

export class QuoteCard extends BaseCard {
  constructor(config = {}) {
    super({
      container: config.container,
      variant: 'glass',
      ...config
    });

    this.service = new QuoteService();
    this.widget = new QuoteWidget({
      container: null,
      service: this.service,
      autoRotate: config.autoRotate !== false,
      rotationInterval: config.rotationInterval || 60000
    });
  }

  render() {
    if (!this.container) return;

    this.container.innerHTML = '';
    this.widget.container = this.container;
    this.widget.render();
  }

  async load() {
    if (!this.widget) return;
    await this.widget.load();
  }

  refresh() {
    this.load();
  }

  mount() {
    super.mount();
    this.widget?.mount();
  }

  unmount() {
    super.unmount();
    this.widget?.unmount();
  }

  update(config) {
    if (config.autoRotate !== undefined || config.rotationInterval !== undefined) {
      this.widget?.update(config);
    }
  }

  destroy() {
    if (this.widget) {
      this.widget.destroy();
      this.widget = null;
    }
    super.destroy();
  }
}
