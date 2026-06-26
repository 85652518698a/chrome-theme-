document.addEventListener('DOMContentLoaded', () => {
  class SidebarApp {
    constructor() {
      this.activeSection = 'bookmarks';
      this.todos = [];
      this.settings = null;
      this.init();
    }

    async init() {
      await this.loadSettings();
      this.bindTabs();
      this.bindSearch();
      this.bindBookmarks();
      this.bindHistory();
      this.bindTodos();
      this.bindTheme();
      this.bindActions();
      this.updateClock();
      setInterval(() => this.updateClock(), 1000);
      this.loadWeather();
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

    bindTabs() {
      document.querySelectorAll('.sidebar-tab').forEach(tab => {
        tab.addEventListener('click', () => {
          const section = tab.dataset.section;
          this.switchSection(section);
        });
      });
    }

    switchSection(section) {
      this.activeSection = section;
      document.querySelectorAll('.sidebar-tab').forEach(t => {
        t.classList.toggle('active', t.dataset.section === section);
      });
      document.querySelectorAll('.sidebar-section').forEach(s => {
        s.classList.toggle('active', s.id === `section-${section}`);
      });
    }

    bindSearch() {
      const searchInput = document.getElementById('search-input');
      searchInput.addEventListener('keydown', async (e) => {
        if (e.key === 'Enter') {
          const query = searchInput.value.trim();
          if (!query) return;
          const s = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
          const searchUrl = s?.data?.shortcuts?.searchEngine || 'https://www.google.com/search?q=';
          await chrome.tabs.create({ url: `${searchUrl}${encodeURIComponent(query)}` });
        }
      });
    }

    async bindBookmarks() {
      await this.loadBookmarks();
      document.getElementById('btn-bookmark-current').addEventListener('click', async () => {
        await chrome.runtime.sendMessage({ type: 'EXECUTE_COMMAND', command: 'new-bookmark' });
        setTimeout(() => this.loadBookmarks(), 500);
      });
    }

    async loadBookmarks() {
      try {
        const result = await chrome.runtime.sendMessage({ type: 'GET_BOOKMARKS' });
        if (!result?.success) return;
        const items = this.flattenBookmarks(result.data);
        const list = document.getElementById('bookmarks-list');
        if (items.length === 0) {
          list.innerHTML = '<div class="empty-state">No bookmarks yet</div>';
          return;
        }
        const recent = items.slice(0, 30);
        list.innerHTML = recent.map(item => `
          <div class="item-row" data-url="${this.escapeAttr(item.url)}">
            <span class="item-icon">🔖</span>
            <div class="item-content">
              <div class="item-title">${this.escapeHtml(item.title)}</div>
              <div class="item-url">${this.escapeHtml(item.url || '')}</div>
            </div>
            <button class="item-action delete" data-url="${this.escapeAttr(item.url)}" title="Remove bookmark">&times;</button>
          </div>
        `).join('');

        list.querySelectorAll('.item-row').forEach(row => {
          row.addEventListener('click', (e) => {
            if (e.target.closest('.item-action')) return;
            const url = row.dataset.url;
            if (url) chrome.tabs.create({ url });
          });
        });

        list.querySelectorAll('.item-action.delete').forEach(btn => {
          btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const url = btn.dataset.url;
            if (!url) return;
            const bookmarks = await chrome.bookmarks.search({ url });
            for (const bm of bookmarks) {
              if (bm.id) await chrome.bookmarks.remove(bm.id);
            }
            btn.closest('.item-row').remove();
          });
        });
      } catch (e) {
        console.error('Failed to load bookmarks:', e);
      }
    }

    flattenBookmarks(tree) {
      const items = [];
      const walk = (nodes) => {
        for (const node of nodes) {
          if (node.url) {
            items.push({ title: node.title, url: node.url });
          }
          if (node.children) walk(node.children);
        }
      };
      walk(tree);
      return items;
    }

    async bindHistory() {
      await this.loadHistory();
      document.getElementById('btn-clear-history').addEventListener('click', async () => {
        if (!confirm('Clear all browsing history?')) return;
        await chrome.runtime.sendMessage({ type: 'EXECUTE_COMMAND', command: 'clear-history' });
        document.getElementById('history-list').innerHTML = '<div class="empty-state">History cleared</div>';
      });
    }

    async loadHistory() {
      try {
        const result = await chrome.runtime.sendMessage({ type: 'GET_HISTORY', limit: 50 });
        if (!result?.success) return;
        const items = result.data || [];
        const list = document.getElementById('history-list');
        if (items.length === 0) {
          list.innerHTML = '<div class="empty-state">No history</div>';
          return;
        }
        list.innerHTML = items.map(item => `
          <div class="item-row" data-url="${this.escapeAttr(item.url)}">
            <span class="item-icon">🕐</span>
            <div class="item-content">
              <div class="item-title">${this.escapeHtml(item.title || item.url)}</div>
              <div class="item-url">${this.escapeHtml(item.url || '')}</div>
            </div>
            <button class="item-action delete" data-url="${this.escapeAttr(item.url)}" title="Remove from history">&times;</button>
          </div>
        `).join('');

        list.querySelectorAll('.item-row').forEach(row => {
          row.addEventListener('click', (e) => {
            if (e.target.closest('.item-action')) return;
            const url = row.dataset.url;
            if (url) chrome.tabs.create({ url });
          });
        });

        list.querySelectorAll('.item-action.delete').forEach(btn => {
          btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const url = btn.dataset.url;
            if (url) {
              await chrome.runtime.sendMessage({ type: 'DELETE_HISTORY_ITEM', url });
              btn.closest('.item-row').remove();
            }
          });
        });
      } catch (e) {
        console.error('Failed to load history:', e);
      }
    }

    async bindTodos() {
      await this.loadTodos();
      document.getElementById('btn-add-todo-sidebar').addEventListener('click', () => {
        const wrap = document.getElementById('todo-input-wrap');
        wrap.classList.toggle('hidden');
        if (!wrap.classList.contains('hidden')) {
          document.getElementById('todo-input-sidebar').focus();
        }
      });

      document.getElementById('todo-input-sidebar').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') this.addTodo();
      });

      document.getElementById('todo-submit-sidebar').addEventListener('click', () => this.addTodo());
    }

    async loadTodos() {
      try {
        const result = await chrome.runtime.sendMessage({ type: 'GET_TODOS' });
        if (result?.success) {
          this.todos = result.data || [];
          this.renderTodos();
        }
      } catch (e) {
        console.error('Failed to load todos:', e);
      }
    }

    renderTodos() {
      const list = document.getElementById('todos-list-sidebar');
      if (this.todos.length === 0) {
        list.innerHTML = '<div class="empty-state">No tasks</div>';
        return;
      }
      list.innerHTML = this.todos.map(todo => `
        <div class="todo-item-sidebar" data-id="${todo.id}">
          <span class="todo-check${todo.completed ? ' done' : ''}"></span>
          <span class="todo-text${todo.completed ? ' completed' : ''}">${this.escapeHtml(todo.text)}</span>
          <button class="todo-del" data-id="${todo.id}">&times;</button>
        </div>
      `).join('');

      list.querySelectorAll('.todo-check').forEach(el => {
        el.addEventListener('click', async () => {
          const id = el.closest('.todo-item-sidebar').dataset.id;
          await chrome.runtime.sendMessage({ type: 'TOGGLE_TODO', id });
          await this.loadTodos();
        });
      });

      list.querySelectorAll('.todo-del').forEach(el => {
        el.addEventListener('click', async () => {
          const id = el.dataset.id;
          await chrome.runtime.sendMessage({ type: 'DELETE_TODO', id });
          await this.loadTodos();
        });
      });
    }

    async addTodo() {
      const input = document.getElementById('todo-input-sidebar');
      const text = input.value.trim();
      if (!text) return;
      await chrome.runtime.sendMessage({
        type: 'ADD_TODO',
        todo: { text, priority: 'medium', category: 'general' }
      });
      input.value = '';
      document.getElementById('todo-input-wrap').classList.add('hidden');
      await this.loadTodos();
    }

    async bindTheme() {
      const theme = this.settings?.general?.theme || 'dark';
      document.querySelectorAll('.theme-btn-sidebar').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.theme === theme);
        btn.addEventListener('click', async () => {
          const newTheme = btn.dataset.theme;
          await chrome.runtime.sendMessage({
            type: 'UPDATE_SETTINGS',
            settings: { general: { theme: newTheme } }
          });
          document.querySelectorAll('.theme-btn-sidebar').forEach(b => {
            b.classList.toggle('active', b.dataset.theme === newTheme);
          });
          const tabs = await chrome.tabs.query({});
          for (const tab of tabs) {
            try {
              await chrome.tabs.sendMessage(tab.id, { type: 'THEME_CHANGED', theme: newTheme });
            } catch {}
          }
        });
      });
    }

    bindActions() {
      document.getElementById('action-screenshot').addEventListener('click', async () => {
        await chrome.runtime.sendMessage({ type: 'EXECUTE_COMMAND', command: 'take-screenshot' });
      });

      document.getElementById('action-settings').addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
      });

      document.getElementById('action-command-palette').addEventListener('click', () => {
        chrome.runtime.sendMessage({ type: 'EXECUTE_COMMAND', command: 'open-command-palette' });
      });
    }

    updateClock() {
      const now = new Date();
      document.getElementById('sidebar-clock').textContent = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    }

    async loadWeather() {
      try {
        const result = await chrome.runtime.sendMessage({ type: 'GET_WEATHER' });
        if (result?.success && result.data) {
          document.getElementById('sidebar-weather').textContent = `${this.getWeatherEmoji(result.data.icon || result.data.condition)} ${result.data.temperature}°`;
        }
      } catch {}
    }

    getWeatherEmoji(icon) {
      const map = { '01': '☀️', '02': '⛅', '03': '☁️', '04': '☁️', '09': '🌧️', '10': '🌦️', '11': '⛈️', '13': '🌨️', '50': '🌫️' };
      if (icon?.length >= 2 && map[icon.substring(0, 2)]) return map[icon.substring(0, 2)];
      return '🌤️';
    }

    escapeHtml(str) {
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    }

    escapeAttr(str) {
      return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
  }

  new SidebarApp();
});
