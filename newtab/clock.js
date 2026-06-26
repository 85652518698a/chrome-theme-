export class ClockService {
  constructor(config = {}) {
    this.clock24h = config.clock24h || false;
    this.showSeconds = config.showSeconds !== false;
    this.timezone = config.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    this.onTick = config.onTick || null;
    this.interval = null;
  }

  start() {
    this.tick();
    this.interval = setInterval(() => this.tick(), 1000);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  tick() {
    const now = new Date();
    const time = this.formatTime(now);
    const date = this.formatDate(now);
    const greeting = this.getGreeting(now);

    if (this.onTick) {
      this.onTick({ time, date, greeting, raw: now });
    }
  }

  formatTime(date) {
    const options = {
      hour: '2-digit',
      minute: '2-digit',
      second: this.showSeconds ? '2-digit' : undefined,
      hour12: !this.clock24h,
      timeZone: this.timezone
    };

    return new Intl.DateTimeFormat('en-US', options).format(date);
  }

  formatDate(date) {
    const options = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: this.timezone
    };

    return new Intl.DateTimeFormat('en-US', options).format(date);
  }

  getGreeting(date) {
    const hour = date.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }

  update(config) {
    if (config.clock24h !== undefined) this.clock24h = config.clock24h;
    if (config.showSeconds !== undefined) this.showSeconds = config.showSeconds;
    if (config.timezone !== undefined) this.timezone = config.timezone;
    this.tick();
  }

  destroy() {
    this.stop();
  }
}

export class ClockWidget {
  constructor(config = {}) {
    this.container = config.container || document.body;
    this.service = new ClockService({
      clock24h: config.clock24h || false,
      showSeconds: config.showSeconds !== false,
      timezone: config.timezone,
      onTick: (data) => this.updateDisplay(data)
    });
    this.greetingEl = document.getElementById('greeting');
  }

  render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="clock-time">
        <span class="time-value">--:--</span>
        <span class="seconds">--</span>
      </div>
      <div class="clock-date"></div>
    `;

    this.service.start();
  }

  updateDisplay(data) {
    const timeEl = this.container.querySelector('.time-value');
    const secondsEl = this.container.querySelector('.seconds');
    const dateEl = this.container.querySelector('.clock-date');

    if (timeEl) {
      const parts = data.time.split(':');
      if (this.service.showSeconds) {
        timeEl.textContent = parts.slice(0, 2).join(':');
        if (secondsEl) {
          secondsEl.textContent = parts[2] || '';
        }
      } else {
        timeEl.textContent = data.time;
        if (secondsEl) secondsEl.style.display = 'none';
      }
    }

    if (dateEl) {
      dateEl.textContent = data.date;
    }

    if (this.greetingEl) {
      this.greetingEl.textContent = `${data.greeting}, welcome back.`;
    }
  }

  update(config) {
    this.service.update(config);
  }

  mount() {
    this.service.start();
  }

  unmount() {
    this.service.stop();
  }

  destroy() {
    this.service.destroy();
    this.container.innerHTML = '';
  }
}
