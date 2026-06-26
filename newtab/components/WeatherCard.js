import { WeatherService, WeatherWidget } from '../weather.js';
import { BaseCard } from './Cards.js';

export class WeatherCard extends BaseCard {
  constructor(config = {}) {
    super({
      container: config.container,
      variant: 'glass',
      ...config
    });

    this.unit = config.unit || 'metric';
    this.service = new WeatherService({
      unit: this.unit,
      apiKey: config.apiKey || ''
    });

    this.widget = new WeatherWidget({
      container: null,
      service: this.service
    });

    this.currentData = null;
  }

  async render() {
    if (!this.container) return;

    this.container.innerHTML = '';
    this.showLoading();

    this.widget.container = this.container;

    try {
      this.currentData = await this.widget.init();
    } catch (err) {
      console.warn('WeatherCard render error:', err);
      this.showError('Unable to load weather data');
    }
  }

  async load() {
    await this.render();
  }

  async refresh() {
    this.service.clearCache();
    await this.render();
  }

  update(config) {
    if (config.unit && config.unit !== this.unit) {
      this.unit = config.unit;
      this.service.unit = config.unit;
      this.refresh();
    }
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
