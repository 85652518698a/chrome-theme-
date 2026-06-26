export class Sidebar {
  constructor(config = {}) {
    this.container = config.container || null;
    this.productivity = config.productivity || null;
    this.settings = config.settings || {};
    this.onSettingChange = config.onSettingChange || null;
  }

  render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="sidebar-widget" id="sidebar-settings">
        <div class="sidebar-widget-title">Quick Settings</div>
        <div class="settings-row">
          <span class="settings-label">24-hour clock</span>
          <button class="toggle-switch ${this.settings.clock24h ? 'active' : ''}" data-setting="clock24h"></button>
        </div>
        <div class="settings-row">
          <span class="settings-label">Show seconds</span>
          <button class="toggle-switch ${this.settings.showSeconds !== false ? 'active' : ''}" data-setting="showSeconds"></button>
        </div>
        <div class="settings-row">
          <span class="settings-label">Compact sidebar</span>
          <button class="toggle-switch ${this.settings.compactSidebar ? 'active' : ''}" data-setting="compactSidebar"></button>
        </div>
        <div class="settings-row">
          <span class="settings-label">Celsius</span>
          <button class="toggle-switch ${this.settings.temperatureUnit === 'metric' ? 'active' : ''}" data-setting="temperatureUnit"></button>
        </div>
      </div>

      <div class="sidebar-widget" id="sidebar-info">
        <div class="sidebar-widget-title">System</div>
        <div class="settings-row">
          <span class="settings-label">Memory</span>
          <span class="settings-value" id="sys-memory">--</span>
        </div>
        <div class="settings-row">
          <span class="settings-label">Uptime</span>
          <span class="settings-value" id="sys-uptime">--</span>
        </div>
      </div>

      <div class="sidebar-widget" id="sidebar-quote-controls">
        <div class="sidebar-widget-title">Inspiration</div>
        <div style="display:flex;gap:8px;">
          <button class="pomodoro-btn" id="new-quote-btn" style="flex:1;">New Quote</button>
          <button class="pomodoro-btn" id="copy-quote-btn" style="flex:1;">Copy Quote</button>
        </div>
      </div>
    `;

    this.bindEvents();
    this.updateSystemInfo();
  }

  bindEvents() {
    this.container.querySelectorAll('.toggle-switch').forEach(toggle => {
      toggle.addEventListener('click', () => {
        const setting = toggle.dataset.setting;
        let value;

        if (setting === 'temperatureUnit') {
          value = toggle.classList.contains('active') ? 'imperial' : 'metric';
        } else if (setting === 'clock24h') {
          value = !this.settings.clock24h;
        } else if (setting === 'showSeconds') {
          value = !this.settings.showSeconds;
        } else if (setting === 'compactSidebar') {
          value = !this.settings.compactSidebar;
        }

        toggle.classList.toggle('active');

        if (setting === 'temperatureUnit') {
          const nowActive = toggle.classList.contains('active');
          value = nowActive ? 'metric' : 'imperial';
        }

        if (this.onSettingChange) {
          this.onSettingChange(setting, value);
        }
      });
    });

    const newQuoteBtn = document.getElementById('new-quote-btn');
    const copyQuoteBtn = document.getElementById('copy-quote-btn');

    newQuoteBtn?.addEventListener('click', () => {
      const quoteCard = document.querySelector('.quote-card');
      const refreshBtn = quoteCard?.querySelector('.quote-refresh-btn');
      refreshBtn?.click();
    });

    copyQuoteBtn?.addEventListener('click', () => {
      const quoteCard = document.querySelector('.quote-card');
      const copyBtn = quoteCard?.querySelector('.quote-copy-btn');
      copyBtn?.click();
    });
  }

  updateSystemInfo() {
    const memoryEl = document.getElementById('sys-memory');
    const uptimeEl = document.getElementById('sys-uptime');

    if ('performance' in window && performance.memory) {
      const mem = performance.memory;
      const usedGB = ((mem.usedJSHeapSize / 1024 / 1024 / 1024)).toFixed(1);
      const totalGB = ((mem.jsHeapSizeLimit / 1024 / 1024 / 1024)).toFixed(1);
      if (memoryEl) memoryEl.textContent = `${usedGB}/${totalGB} GB`;
    } else {
      if (memoryEl) memoryEl.textContent = 'N/A';
    }

    if (uptimeEl) {
      const uptime = performance.now();
      const hours = Math.floor(uptime / 3600000);
      const minutes = Math.floor((uptime % 3600000) / 60000);
      uptimeEl.textContent = `${hours}h ${minutes}m`;
    }
  }

  mount() {
    if (this.container) this.container.style.display = '';
  }

  unmount() {
    if (this.container) this.container.style.display = 'none';
  }

  update(settings) {
    this.settings = { ...this.settings, ...settings };
    this.render();
  }

  destroy() {
    if (this.container) this.container.innerHTML = '';
  }
}
