import { ClockService, ClockWidget } from '../clock.js';
import { BaseCard } from './Cards.js';

export class Clock extends BaseCard {
  constructor(config = {}) {
    super({
      container: config.container,
      variant: 'glass',
      ...config
    });

    this.clock24h = config.clock24h || false;
    this.showSeconds = config.showSeconds !== false;
    this.timezone = config.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

    this.widget = new ClockWidget({
      container: null,
      clock24h: this.clock24h,
      showSeconds: this.showSeconds,
      timezone: this.timezone
    });
  }

  render() {
    if (!this.container) return;

    this.container.innerHTML = '';

    this.widget.container = this.container;
    this.widget.render();
  }

  update(config) {
    if (config.clock24h !== undefined) this.clock24h = config.clock24h;
    if (config.showSeconds !== undefined) this.showSeconds = config.showSeconds;
    if (config.timezone !== undefined) this.timezone = config.timezone;

    this.widget.update({
      clock24h: this.clock24h,
      showSeconds: this.showSeconds,
      timezone: this.timezone
    });
  }

  mount() {
    super.mount();
    this.widget?.service?.start();
  }

  unmount() {
    super.unmount();
    this.widget?.service?.stop();
  }

  getCurrentTime() {
    return this.widget?.service?.formatTime(new Date()) || '';
  }

  getCurrentDate() {
    return this.widget?.service?.formatDate(new Date()) || '';
  }

  getGreeting() {
    return this.widget?.service?.getGreeting(new Date()) || '';
  }

  destroy() {
    if (this.widget) {
      this.widget.destroy();
      this.widget = null;
    }
    super.destroy();
  }
}
