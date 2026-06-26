export const DEFAULTS = {
  general: {
    theme: 'dark',
    accentColor: '#c4a882',
    fontSize: 'medium',
    language: 'en-US',
    autoUpdate: true
  },
  appearance: {
    glassEffect: true,
    blurIntensity: 10,
    animations: true,
    customCSS: '',
    showBadge: true,
    badgeStyle: 'icon',
    compactMode: false,
    fontFamily: "'Inter', system-ui, sans-serif"
  },
  widgets: {
    showWeather: true,
    showTodo: true,
    showQuickLinks: true,
    showSearch: true,
    showClock: true,
    showDate: true,
    weatherPosition: 'top',
    todoPosition: 'bottom'
  },
  weather: {
    unit: 'celsius',
    apiKey: '',
    location: 'auto',
    refreshInterval: 30,
    showForecast: true,
    forecastDays: 5
  },
  bookmarks: {
    quickLinks: [
      { title: 'Gmail', url: 'https://mail.google.com', icon: '✉' },
      { title: 'GitHub', url: 'https://github.com', icon: '💻' },
      { title: 'Calendar', url: 'https://calendar.google.com', icon: '📅' },
      { title: 'Drive', url: 'https://drive.google.com', icon: '📁' },
      { title: 'YouTube', url: 'https://youtube.com', icon: '▶' },
      { title: 'Reddit', url: 'https://reddit.com', icon: '💬' }
    ],
    showFavorites: true,
    favoritesLimit: 10
  },
  productivity: {
    pomodoroDuration: 25,
    shortBreak: 5,
    longBreak: 15,
    pomodoroBeforeLongBreak: 4,
    autoStartBreaks: false,
    autoStartPomodoros: false,
    showNotifications: true,
    soundEnabled: true
  },
  shortcuts: {
    enabled: true,
    searchEngine: 'https://www.google.com/search?q='
  },
  system: {
    version: '2.0.0',
    firstRun: true,
    lastMigration: null,
    setupComplete: false
  }
};

export const STORAGE_KEYS = {
  SETTINGS: 'brutalist_settings',
  TODOS: 'brutalist_todos',
  POMODORO: 'brutalist_pomodoro',
  WEATHER_CACHE: 'brutalist_weather_cache',
  NOTES: 'brutalist_notes',
  THEME_HISTORY: 'brutalist_theme_history',
  ANALYTICS: 'brutalist_analytics'
};

export class StorageManager {
  constructor() {
    this.cache = new Map();
    this.cacheTTL = 30000;
  }

  async getLocal(keys) {
    try {
      const result = await chrome.storage.local.get(keys);
      return result;
    } catch (error) {
      console.error('Storage getLocal error:', error);
      return {};
    }
  }

  async setLocal(items) {
    try {
      await chrome.storage.local.set(items);
      Object.keys(items).forEach(key => {
        this.cache.set(key, { data: items[key], timestamp: Date.now() });
      });
    } catch (error) {
      console.error('Storage setLocal error:', error);
    }
  }

  async getSync(keys) {
    try {
      return await chrome.storage.sync.get(keys);
    } catch (error) {
      console.error('Storage getSync error:', error);
      return {};
    }
  }

  async setSync(items) {
    try {
      await chrome.storage.sync.set(items);
    } catch (error) {
      console.error('Storage setSync error:', error);
    }
  }

  async getAllSettings() {
    const cached = this.cache.get(STORAGE_KEYS.SETTINGS);
    if (cached && (Date.now() - cached.timestamp) < this.cacheTTL) {
      return cached.data;
    }
    const result = await this.getLocal(STORAGE_KEYS.SETTINGS);
    const settings = result[STORAGE_KEYS.SETTINGS] || {};
    const merged = this.mergeDefaults(settings);
    this.cache.set(STORAGE_KEYS.SETTINGS, { data: merged, timestamp: Date.now() });
    return merged;
  }

  async saveAllSettings(settings) {
    await this.setLocal({ [STORAGE_KEYS.SETTINGS]: settings });
    this.cache.set(STORAGE_KEYS.SETTINGS, { data: settings, timestamp: Date.now() });
  }

  async getSetting(category, key) {
    const settings = await this.getAllSettings();
    return settings[category]?.[key] ?? DEFAULTS[category]?.[key];
  }

  async updateSetting(category, key, value) {
    const settings = await this.getAllSettings();
    if (!settings[category]) settings[category] = {};
    settings[category][key] = value;
    await this.saveAllSettings(settings);
  }

  async resetSettings() {
    const defaults = JSON.parse(JSON.stringify(DEFAULTS));
    await this.saveAllSettings(defaults);
    return defaults;
  }

  async exportSettings() {
    const settings = await this.getAllSettings();
    const exportData = {
      version: DEFAULTS.system.version,
      exportedAt: new Date().toISOString(),
      settings
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `brutalist-chrome-settings-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async importSettings(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (!data.settings) throw new Error('Invalid settings format');
      const merged = this.mergeDefaults(data.settings);
      merged.system.version = DEFAULTS.system.version;
      merged.system.lastMigration = Date.now();
      await this.saveAllSettings(merged);
      return { success: true, settings: merged };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  mergeDefaults(settings) {
    const merged = JSON.parse(JSON.stringify(DEFAULTS));
    Object.keys(DEFAULTS).forEach(category => {
      if (settings[category]) {
        Object.keys(DEFAULTS[category]).forEach(key => {
          if (settings[category][key] !== undefined) {
            merged[category][key] = settings[category][key];
          }
        });
      }
    });
    return merged;
  }

  async migrateSettings() {
    const settings = await this.getAllSettings();
    const currentVersion = settings.system?.version || '1.0.0';
    if (currentVersion !== DEFAULTS.system.version) {
      const migrated = this.mergeDefaults(settings);
      migrated.system.version = DEFAULTS.system.version;
      migrated.system.lastMigration = Date.now();
      await this.saveAllSettings(migrated);
      return true;
    }
    return false;
  }

  async clearCache() {
    this.cache.clear();
  }

  invalidateCache(key) {
    this.cache.delete(key);
  }

  async getTodos() {
    const result = await this.getLocal(STORAGE_KEYS.TODOS);
    return result[STORAGE_KEYS.TODOS] || [];
  }

  async saveTodos(todos) {
    await this.setLocal({ [STORAGE_KEYS.TODOS]: todos });
  }

  async addTodo(todo) {
    const todos = await this.getTodos();
    const newTodo = {
      id: Date.now().toString(36) + Math.random().toString(36).substring(2, 7),
      text: todo.text,
      completed: false,
      createdAt: Date.now(),
      priority: todo.priority || 'medium',
      category: todo.category || 'general',
      dueDate: todo.dueDate || null
    };
    todos.unshift(newTodo);
    await this.saveTodos(todos);
    return newTodo;
  }

  async updateTodo(id, updates) {
    const todos = await this.getTodos();
    const index = todos.findIndex(t => t.id === id);
    if (index !== -1) {
      todos[index] = { ...todos[index], ...updates };
      await this.saveTodos(todos);
      return todos[index];
    }
    return null;
  }

  async deleteTodo(id) {
    const todos = await this.getTodos();
    const filtered = todos.filter(t => t.id !== id);
    await this.saveTodos(filtered);
    return filtered;
  }

  async toggleTodo(id) {
    const todos = await this.getTodos();
    const todo = todos.find(t => t.id === id);
    if (todo) {
      todo.completed = !todo.completed;
      todo.completedAt = todo.completed ? Date.now() : null;
      await this.saveTodos(todos);
      return todo;
    }
    return null;
  }

  async getPomodoroState() {
    const result = await this.getLocal(STORAGE_KEYS.POMODORO);
    return result[STORAGE_KEYS.POMODORO] || {
      running: false,
      phase: 'idle',
      timeLeft: DEFAULTS.productivity.pomodoroDuration * 60,
      completedPomodoros: 0,
      startedAt: null
    };
  }

  async savePomodoroState(state) {
    await this.setLocal({ [STORAGE_KEYS.POMODORO]: state });
  }

  async getWeatherCache() {
    const result = await this.getLocal(STORAGE_KEYS.WEATHER_CACHE);
    return result[STORAGE_KEYS.WEATHER_CACHE] || null;
  }

  async saveWeatherCache(data) {
    await this.setLocal({ [STORAGE_KEYS.WEATHER_CACHE]: data });
  }
}

export const storage = new StorageManager();
