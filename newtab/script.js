import { Sidebar } from './components/Sidebar.js';
import { SearchBar } from './components/SearchBar.js';
import { Clock } from './components/Clock.js';
import { WeatherCard } from './components/WeatherCard.js';
import { QuoteCard } from './components/QuoteCard.js';
import { BookmarkGrid } from './components/BookmarkGrid.js';
import { WidgetManager } from './widgets.js';
import { Animations } from './animations.js';
import { ProductivityDashboard } from './productivity.js';

class NewTabApp {
  constructor() {
    this.settings = {};
    this.widgets = {};
    this.initialized = false;
  }

  async init() {
    try {
      await this.loadSettings();
      this.initWidgets();
      this.initEventListeners();
      this.initKeyboardShortcuts();
      this.initParticles();
      this.initialized = true;
      document.body.classList.add('loaded');
      this.log('New Tab initialized successfully');
    } catch (err) {
      console.error('New Tab initialization error:', err);
      this.showToast('Failed to initialize some features', 'error');
    }
  }

  async loadSettings() {
    const defaults = {
      clock24h: false,
      showSeconds: true,
      temperatureUnit: 'metric',
      focusMode: false,
      compactSidebar: false,
      widgetOrder: ['clock', 'search', 'quote', 'bookmarks', 'todo', 'notes'],
      hiddenWidgets: [],
      background: 'default'
    };

    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await chrome.storage.sync.get('newtab_settings');
        this.settings = { ...defaults, ...(result.newtab_settings || {}) };
      } else {
        const stored = localStorage.getItem('newtab_settings');
        this.settings = { ...defaults, ...(stored ? JSON.parse(stored) : {}) };
      }
    } catch {
      this.settings = { ...defaults };
    }
  }

  async saveSettings() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        await chrome.storage.sync.set({ newtab_settings: this.settings });
      } else {
        localStorage.setItem('newtab_settings', JSON.stringify(this.settings));
      }
    } catch (err) {
      console.error('Failed to save settings:', err);
    }
  }

  initWidgets() {
    this.widgets.clock = new Clock({
      container: document.getElementById('clock-widget'),
      clock24h: this.settings.clock24h,
      showSeconds: this.settings.showSeconds
    });
    this.widgets.clock.render();

    this.widgets.searchBar = new SearchBar({
      container: document.getElementById('search-container')
    });
    this.widgets.searchBar.render();

    this.widgets.weather = new WeatherCard({
      container: document.getElementById('weather-widget'),
      unit: this.settings.temperatureUnit
    });
    this.widgets.weather.render();
    this.widgets.weather.load();

    this.widgets.quote = new QuoteCard({
      container: document.getElementById('quote-card')
    });
    this.widgets.quote.render();
    this.widgets.quote.load();

    this.widgets.bookmarks = new BookmarkGrid({
      container: document.getElementById('bookmark-grid'),
      addBtn: document.getElementById('add-bookmark-btn')
    });
    this.widgets.bookmarks.render();
    this.widgets.bookmarks.load();

    this.widgets.productivity = new ProductivityDashboard({
      todoContainer: document.getElementById('todo-container'),
      notesContainer: document.getElementById('notes-container'),
      sidebarContent: document.getElementById('sidebar-content')
    });
    this.widgets.productivity.render();

    this.widgets.sidebar = new Sidebar({
      container: document.getElementById('sidebar-content'),
      productivity: this.widgets.productivity,
      settings: this.settings,
      onSettingChange: (key, value) => {
        this.settings[key] = value;
        this.saveSettings();
        this.handleSettingChange(key, value);
      }
    });
    this.widgets.sidebar.render();

    this.widgets.widgetManager = new WidgetManager({
      settings: this.settings,
      onReorder: (newOrder) => {
        this.settings.widgetOrder = newOrder;
        this.saveSettings();
      },
      onToggle: (widgetId, visible) => {
        if (visible) {
          this.settings.hiddenWidgets = this.settings.hiddenWidgets.filter(id => id !== widgetId);
        } else {
          this.settings.hiddenWidgets.push(widgetId);
        }
        this.saveSettings();
      }
    });
  }

  initEventListeners() {
    const sidebarToggle = this.createSidebarToggle();
    document.body.appendChild(sidebarToggle);

    sidebarToggle.addEventListener('click', () => {
      const sidebar = document.querySelector('.sidebar');
      sidebar.classList.toggle('mobile-open');
      document.body.classList.toggle('sidebar-open');
      this.createSidebarBackdrop();
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 1199) {
        document.querySelector('.sidebar')?.classList.remove('mobile-open');
        document.body.classList.remove('sidebar-open');
        document.querySelector('.sidebar-backdrop')?.remove();
      }
    });

    document.addEventListener('click', (e) => {
      const toast = e.target.closest('.toast');
      if (toast) {
        toast.classList.add('out');
        setTimeout(() => toast.remove(), 300);
      }
    });
  }

  createSidebarToggle() {
    const btn = document.createElement('button');
    btn.className = 'sidebar-toggle';
    btn.setAttribute('aria-label', 'Toggle sidebar');
    btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>`;
    return btn;
  }

  createSidebarBackdrop() {
    let backdrop = document.querySelector('.sidebar-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.className = 'sidebar-backdrop';
      backdrop.addEventListener('click', () => {
        document.querySelector('.sidebar')?.classList.remove('mobile-open');
        document.body.classList.remove('sidebar-open');
        backdrop.classList.remove('visible');
        setTimeout(() => backdrop.remove(), 300);
      });
      document.body.appendChild(backdrop);
    }
    backdrop.classList.add('visible');
  }

  initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        const searchBar = document.querySelector('.search-bar');
        if (searchBar) {
          searchBar.focus();
          searchBar.select();
        }
      }

      if (e.key === 'Escape') {
        const searchBar = document.querySelector('.search-bar');
        if (searchBar === document.activeElement) {
          searchBar.blur();
        }
        document.querySelector('.sidebar')?.classList.remove('mobile-open');
        document.body.classList.remove('sidebar-open');
        document.querySelector('.sidebar-backdrop')?.remove();
      }

      if (e.ctrlKey && e.key === 'd') {
        e.preventDefault();
        this.toggleFocusMode();
      }

      if (e.ctrlKey && e.key === 'b') {
        e.preventDefault();
        const searchBar = document.querySelector('.search-bar');
        if (searchBar) {
          searchBar.focus();
          searchBar.value = '';
        }
      }

      if (e.ctrlKey && e.shiftKey && e.key === 'F') {
        e.preventDefault();
        this.toggleSidebar();
      }
    });
  }

  toggleFocusMode() {
    this.settings.focusMode = !this.settings.focusMode;
    document.body.classList.toggle('focus-mode', this.settings.focusMode);
    this.saveSettings();
    this.showToast(
      this.settings.focusMode ? 'Focus mode enabled' : 'Focus mode disabled',
      'info'
    );
  }

  toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    sidebar?.classList.toggle('mobile-open');
    document.body.classList.toggle('sidebar-open');
    if (document.body.classList.contains('sidebar-open')) {
      this.createSidebarBackdrop();
    } else {
      document.querySelector('.sidebar-backdrop')?.remove();
    }
  }

  handleSettingChange(key, value) {
    switch (key) {
      case 'clock24h':
      case 'showSeconds':
        this.widgets.clock?.update({ [key]: value });
        break;
      case 'temperatureUnit':
        this.widgets.weather?.update({ unit: value });
        this.widgets.weather?.load();
        break;
      case 'focusMode':
        document.body.classList.toggle('focus-mode', value);
        break;
      case 'compactSidebar':
        document.querySelector('.sidebar')?.classList.toggle('compact', value);
        break;
    }
  }

  initParticles() {
    try {
      const container = document.getElementById('particle-container');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      container.appendChild(canvas);

      const particles = [];
      const count = Math.min(60, Math.floor(window.innerWidth / 20));

      class Particle {
        constructor() {
          this.reset();
        }

        reset() {
          this.x = Math.random() * canvas.width;
          this.y = Math.random() * canvas.height;
          this.size = Math.random() * 2 + 0.5;
          this.speedX = (Math.random() - 0.5) * 0.3;
          this.speedY = (Math.random() - 0.5) * 0.3;
          this.opacity = Math.random() * 0.3 + 0.1;
        }

        update() {
          this.x += this.speedX;
          this.y += this.speedY;

          if (this.x < 0 || this.x > canvas.width) this.speedX *= -1;
          if (this.y < 0 || this.y > canvas.height) this.speedY *= -1;
        }

        draw() {
          ctx.beginPath();
          ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(196, 168, 130, ${this.opacity})`;
          ctx.fill();
        }
      }

      for (let i = 0; i < count; i++) {
        particles.push(new Particle());
      }

      function connectParticles() {
        for (let i = 0; i < particles.length; i++) {
          for (let j = i + 1; j < particles.length; j++) {
            const dx = particles[i].x - particles[j].x;
            const dy = particles[i].y - particles[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 150) {
              ctx.beginPath();
              ctx.strokeStyle = `rgba(196, 168, 130, ${0.06 * (1 - dist / 150)})`;
              ctx.lineWidth = 0.5;
              ctx.moveTo(particles[i].x, particles[i].y);
              ctx.lineTo(particles[j].x, particles[j].y);
              ctx.stroke();
            }
          }
        }
      }

      let animFrame;

      function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (const p of particles) {
          p.update();
          p.draw();
        }

        connectParticles();
        animFrame = requestAnimationFrame(animate);
      }

      animate();

      const resizeHandler = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      };

      window.addEventListener('resize', resizeHandler);

      this._particleCleanup = () => {
        cancelAnimationFrame(animFrame);
        window.removeEventListener('resize', resizeHandler);
        canvas.remove();
      };
    } catch {
    }
  }

  showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('out');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  log(...args) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[NewTab]', ...args);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new NewTabApp();
  app.init();
  window.__newtab = app;
});
