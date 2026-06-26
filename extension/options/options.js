document.addEventListener('DOMContentLoaded', () => {
  class OptionsApp {
    constructor() {
      this.settings = null;
      this.dirty = false;
      this.activeTab = 'general';
      this.init();
    }

    async init() {
      await this.loadSettings();
      this.bindNavTabs();
      this.bindControls();
      this.bindActions();
      this.populateForm();
      this.initializeQuickLinks();
      this.showTab('general');
      window.addEventListener('beforeunload', (e) => {
        if (this.dirty) {
          e.preventDefault();
          e.returnValue = '';
        }
      });
    }

    async loadSettings() {
      try {
        const result = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
        if (result?.success) {
          this.settings = result.data;
        }
      } catch (e) {
        console.error('Failed to load settings:', e);
      }
    }

    bindNavTabs() {
      document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', () => {
          this.showTab(tab.dataset.tab);
        });
      });
    }

    showTab(tabId) {
      this.activeTab = tabId;
      document.querySelectorAll('.nav-tab').forEach(t => {
        t.classList.toggle('active', t.dataset.tab === tabId);
      });
      document.querySelectorAll('.tab-pane').forEach(p => {
        p.classList.toggle('active', p.id === `tab-${tabId}`);
      });
      const titles = {
        general: 'General Settings',
        appearance: 'Appearance',
        widgets: 'Widget Settings',
        weather: 'Weather Configuration',
        bookmarks: 'Bookmark Links',
        productivity: 'Pomodoro Timer',
        shortcuts: 'Keyboard Shortcuts',
        about: 'About Brutalist Chrome'
      };
      document.getElementById('content-title').textContent = titles[tabId] || 'Settings';
    }

    populateForm() {
      if (!this.settings) return;

      const s = this.settings;
      this.setVal('theme', s.general?.theme || 'dark');
      this.setVal('accent', s.general?.accentColor || '#c4a882');
      this.setVal('font-size', s.general?.fontSize || 'medium');
      this.setVal('language', s.general?.language || 'en-US');
      this.setChecked('auto-update', s.general?.autoUpdate ?? true);

      this.setChecked('glass-effect', s.appearance?.glassEffect ?? true);
      this.setVal('blur', s.appearance?.blurIntensity || 10);
      this.setValText('blur-value', `${s.appearance?.blurIntensity || 10}px`);
      this.setChecked('animations', s.appearance?.animations ?? true);
      this.setChecked('show-badge', s.appearance?.showBadge ?? true);
      this.setChecked('compact', s.appearance?.compactMode ?? false);
      this.setVal('font-family', s.appearance?.fontFamily || "'Inter', system-ui, sans-serif");
      this.setVal('custom-css', s.appearance?.customCSS || '');

      this.setChecked('widget-weather', s.widgets?.showWeather ?? true);
      this.setChecked('widget-todo', s.widgets?.showTodo ?? true);
      this.setChecked('widget-links', s.widgets?.showQuickLinks ?? true);
      this.setChecked('widget-search', s.widgets?.showSearch ?? true);
      this.setChecked('widget-clock', s.widgets?.showClock ?? true);
      this.setChecked('widget-date', s.widgets?.showDate ?? true);

      this.setVal('weather-unit', s.weather?.unit || 'celsius');
      this.setVal('weather-location', s.weather?.location || 'auto');
      this.setVal('weather-api-key', s.weather?.apiKey || '');
      this.setVal('weather-interval', s.weather?.refreshInterval || 30);
      this.setChecked('weather-forecast', s.weather?.showForecast ?? true);

      this.setChecked('bookmark-favorites', s.bookmarks?.showFavorites ?? true);
      this.setVal('favorites-limit', s.bookmarks?.favoritesLimit || 10);

      this.setVal('pomodoro-duration', s.productivity?.pomodoroDuration || 25);
      this.setVal('short-break', s.productivity?.shortBreak || 5);
      this.setVal('long-break', s.productivity?.longBreak || 15);
      this.setVal('pomodoro-count', s.productivity?.pomodoroBeforeLongBreak || 4);
      this.setChecked('auto-breaks', s.productivity?.autoStartBreaks ?? false);
      this.setChecked('auto-pomodoros', s.productivity?.autoStartPomodoros ?? false);
      this.setChecked('pomodoro-notifications', s.productivity?.showNotifications ?? true);
      this.setChecked('pomodoro-sound', s.productivity?.soundEnabled ?? true);

      this.setChecked('shortcuts-enabled', s.shortcuts?.enabled ?? true);
      this.setVal('search-engine', s.shortcuts?.searchEngine || 'https://www.google.com/search?q=');

      document.getElementById('about-version').textContent = s.system?.version || '2.0.0';
    }

    bindControls() {
      document.querySelectorAll('.nav-tab').forEach(t => {
        t.addEventListener('click', () => this.showTab(t.dataset.tab));
      });

      document.getElementById('setting-blur').addEventListener('input', (e) => {
        document.getElementById('setting-blur-value').textContent = `${e.target.value}px`;
        this.markDirty();
      });

      document.querySelectorAll('.setting-control input, .setting-control select, .setting-control textarea').forEach(el => {
        const tag = el.tagName.toLowerCase();
        if (tag === 'input' && el.type === 'checkbox') {
          el.addEventListener('change', () => this.markDirty());
        } else if (tag === 'input' || tag === 'select' || tag === 'textarea') {
          el.addEventListener('change', () => this.markDirty());
          if (tag === 'input' && el.type === 'text') {
            el.addEventListener('input', () => this.markDirty());
          }
        }
      });
    }

    bindActions() {
      document.getElementById('btn-save').addEventListener('click', () => this.saveSettings());
      document.getElementById('btn-reset').addEventListener('click', () => this.resetSettings());
      document.getElementById('btn-export').addEventListener('click', () => this.exportSettings());
      document.getElementById('btn-import').addEventListener('click', () => this.importSettings());
      document.getElementById('btn-add-link').addEventListener('click', () => this.addQuickLinkRow());
      document.getElementById('about-report').addEventListener('click', (e) => {
        e.preventDefault();
        chrome.tabs.create({ url: 'https://github.com/85652518698a/chrome-theme-/issues' });
      });
      document.getElementById('about-website').addEventListener('click', (e) => {
        e.preventDefault();
        chrome.tabs.create({ url: 'https://github.com/85652518698a/chrome-theme-' });
      });
    }

    markDirty() {
      this.dirty = true;
      document.getElementById('btn-save').textContent = 'Save Changes ●';
    }

    async saveSettings() {
      const newSettings = JSON.parse(JSON.stringify(this.settings));
      if (!newSettings.general) newSettings.general = {};
      newSettings.general.theme = this.getVal('theme');
      newSettings.general.accentColor = this.getVal('accent');
      newSettings.general.fontSize = this.getVal('font-size');
      newSettings.general.language = this.getVal('language');
      newSettings.general.autoUpdate = this.getChecked('auto-update');

      if (!newSettings.appearance) newSettings.appearance = {};
      newSettings.appearance.glassEffect = this.getChecked('glass-effect');
      newSettings.appearance.blurIntensity = parseInt(this.getVal('blur')) || 10;
      newSettings.appearance.animations = this.getChecked('animations');
      newSettings.appearance.showBadge = this.getChecked('show-badge');
      newSettings.appearance.compactMode = this.getChecked('compact');
      newSettings.appearance.fontFamily = this.getVal('font-family');
      newSettings.appearance.customCSS = this.getVal('custom-css');

      if (!newSettings.widgets) newSettings.widgets = {};
      newSettings.widgets.showWeather = this.getChecked('widget-weather');
      newSettings.widgets.showTodo = this.getChecked('widget-todo');
      newSettings.widgets.showQuickLinks = this.getChecked('widget-links');
      newSettings.widgets.showSearch = this.getChecked('widget-search');
      newSettings.widgets.showClock = this.getChecked('widget-clock');
      newSettings.widgets.showDate = this.getChecked('widget-date');

      if (!newSettings.weather) newSettings.weather = {};
      newSettings.weather.unit = this.getVal('weather-unit');
      newSettings.weather.location = this.getVal('weather-location');
      newSettings.weather.apiKey = this.getVal('weather-api-key');
      newSettings.weather.refreshInterval = parseInt(this.getVal('weather-interval')) || 30;
      newSettings.weather.showForecast = this.getChecked('weather-forecast');

      if (!newSettings.bookmarks) newSettings.bookmarks = {};
      newSettings.bookmarks.showFavorites = this.getChecked('bookmark-favorites');
      newSettings.bookmarks.favoritesLimit = parseInt(this.getVal('favorites-limit')) || 10;
      newSettings.bookmarks.quickLinks = this.getQuickLinksData();

      if (!newSettings.productivity) newSettings.productivity = {};
      newSettings.productivity.pomodoroDuration = parseInt(this.getVal('pomodoro-duration')) || 25;
      newSettings.productivity.shortBreak = parseInt(this.getVal('short-break')) || 5;
      newSettings.productivity.longBreak = parseInt(this.getVal('long-break')) || 15;
      newSettings.productivity.pomodoroBeforeLongBreak = parseInt(this.getVal('pomodoro-count')) || 4;
      newSettings.productivity.autoStartBreaks = this.getChecked('auto-breaks');
      newSettings.productivity.autoStartPomodoros = this.getChecked('auto-pomodoros');
      newSettings.productivity.showNotifications = this.getChecked('pomodoro-notifications');
      newSettings.productivity.soundEnabled = this.getChecked('pomodoro-sound');

      if (!newSettings.shortcuts) newSettings.shortcuts = {};
      newSettings.shortcuts.enabled = this.getChecked('shortcuts-enabled');
      newSettings.shortcuts.searchEngine = this.getVal('search-engine');

      try {
        const result = await chrome.runtime.sendMessage({
          type: 'UPDATE_SETTINGS',
          settings: newSettings
        });
        if (result?.success) {
          this.settings = newSettings;
          this.dirty = false;
          document.getElementById('btn-save').textContent = 'Save Changes';
          const btn = document.getElementById('btn-save');
          const originalText = btn.textContent;
          btn.textContent = '✓ Saved!';
          btn.style.background = 'var(--success)';
          setTimeout(() => {
            btn.textContent = originalText;
            btn.style.background = '';
          }, 2000);

          const tabs = await chrome.tabs.query({});
          const msg = { type: 'SETTINGS_UPDATED', settings: newSettings };
          for (const tab of tabs) {
            try { await chrome.tabs.sendMessage(tab.id, msg); } catch {}
          }
        }
      } catch (e) {
        console.error('Failed to save settings:', e);
        alert('Failed to save settings. Please try again.');
      }
    }

    async resetSettings() {
      if (!confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) return;
      try {
        const result = await chrome.runtime.sendMessage({ type: 'RESET_SETTINGS' });
        if (result?.success) {
          await this.loadSettings();
          this.populateForm();
          this.initializeQuickLinks();
          this.dirty = false;
          document.getElementById('btn-save').textContent = 'Save Changes';
        }
      } catch (e) {
        console.error('Failed to reset settings:', e);
      }
    }

    async exportSettings() {
      try {
        await chrome.runtime.sendMessage({ type: 'EXPORT_SETTINGS' });
      } catch (e) {
        console.error('Failed to export settings:', e);
      }
    }

    async importSettings() {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
          const text = await file.text();
          const result = await chrome.runtime.sendMessage({
            type: 'IMPORT_SETTINGS',
            data: text
          });
          if (result?.success) {
            this.settings = result.settings;
            this.populateForm();
            this.initializeQuickLinks();
            this.dirty = false;
            document.getElementById('btn-save').textContent = 'Save Changes';
            alert('Settings imported successfully!');
          } else {
            alert('Failed to import settings: ' + (result?.error || 'Invalid file'));
          }
        } catch (err) {
          alert('Failed to read file: ' + err.message);
        }
      });
      input.click();
    }

    initializeQuickLinks() {
      const container = document.getElementById('quick-links-editor');
      container.innerHTML = '';
      const links = this.settings?.bookmarks?.quickLinks || [];
      links.forEach((link, index) => {
        this.createQuickLinkRow(container, link, index);
      });
    }

    createQuickLinkRow(container, link, index) {
      const row = document.createElement('div');
      row.className = 'quick-link-row';
      row.innerHTML = `
        <input type="text" class="ql-icon" value="${this.escapeAttr(link.icon || '🔗')}" maxlength="2" placeholder="🔗" />
        <input type="text" class="ql-title" value="${this.escapeAttr(link.title)}" placeholder="Title" />
        <input type="text" class="ql-url" value="${this.escapeAttr(link.url)}" placeholder="https://..." />
        <button class="quick-link-delete" title="Remove">&times;</button>
      `;
      row.querySelectorAll('input').forEach(el => {
        el.addEventListener('input', () => this.markDirty());
      });
      row.querySelector('.quick-link-delete').addEventListener('click', () => {
        row.remove();
        this.markDirty();
      });
      container.appendChild(row);
    }

    addQuickLinkRow() {
      const container = document.getElementById('quick-links-editor');
      this.createQuickLinkRow(container, { icon: '🔗', title: '', url: '' }, container.children.length);
      this.markDirty();
    }

    getQuickLinksData() {
      const rows = document.querySelectorAll('#quick-links-editor .quick-link-row');
      const links = [];
      rows.forEach(row => {
        const inputs = row.querySelectorAll('input');
        const title = inputs[1]?.value?.trim();
        const url = inputs[2]?.value?.trim();
        if (title || url) {
          links.push({
            icon: inputs[0]?.value?.trim() || '🔗',
            title: title || 'Link',
            url: url || 'https://example.com'
          });
        }
      });
      return links;
    }

    getVal(id) {
      const el = document.getElementById(`setting-${id}`);
      if (!el) return '';
      if (el.type === 'checkbox') return el.checked;
      if (el.type === 'number') return el.value;
      return el.value;
    }

    setVal(id, value) {
      const el = document.getElementById(`setting-${id}`);
      if (!el) return;
      if (el.type === 'checkbox') {
        el.checked = !!value;
      } else {
        el.value = value || '';
      }
    }

    setValText(id, value) {
      const el = document.getElementById(`setting-${id}`);
      if (el) el.textContent = value;
    }

    getChecked(id) {
      const el = document.getElementById(`setting-${id}`);
      return el ? el.checked : false;
    }

    setChecked(id, value) {
      const el = document.getElementById(`setting-${id}`);
      if (el) el.checked = !!value;
    }

    escapeAttr(str) {
      return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
  }

  new OptionsApp();
});
