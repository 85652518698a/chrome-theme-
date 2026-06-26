document.addEventListener('DOMContentLoaded', () => {
  const elements = {
    clockTime: document.getElementById('clock-time'),
    clockDate: document.getElementById('clock-date'),
    searchInput: document.getElementById('search-input'),
    weatherSection: document.getElementById('weather-section'),
    weatherIcon: document.getElementById('weather-icon'),
    weatherTemp: document.getElementById('weather-temp'),
    weatherDesc: document.getElementById('weather-desc'),
    weatherLocation: document.getElementById('weather-location'),
    weatherHumidity: document.getElementById('weather-humidity'),
    weatherWind: document.getElementById('weather-wind'),
    quickLinksGrid: document.getElementById('quick-links-grid'),
    btnEditLinks: document.getElementById('btn-edit-links'),
    todosList: document.getElementById('todos-list'),
    btnAddTodo: document.getElementById('btn-add-todo'),
    todoInputWrapper: document.getElementById('todo-input-wrapper'),
    todoInput: document.getElementById('todo-input'),
    todoSubmit: document.getElementById('todo-submit'),
    themeBtns: document.querySelectorAll('.theme-btn'),
    btnSidebar: document.getElementById('btn-sidebar'),
    btnSettings: document.getElementById('btn-settings'),
    footerVersion: document.getElementById('footer-version'),
    footerPomodoro: document.getElementById('footer-pomodoro')
  };

  let settings = null;
  let todos = [];
  let pomodoroState = null;

  async function init() {
    await loadSettings();
    updateClock();
    setInterval(updateClock, 1000);
    await loadWeather();
    await loadTodos();
    await loadPomodoro();
    renderQuickLinks();
    setupEventListeners();
  }

  async function loadSettings() {
    try {
      const result = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
      if (result?.success) {
        settings = result.data;
        applySettings();
      }
    } catch (e) {
      console.error('Failed to load settings:', e);
    }
  }

  function applySettings() {
    if (!settings) return;
    const theme = settings.general?.theme || 'dark';
    document.querySelectorAll('.theme-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.theme === theme);
    });
    if (!settings.widgets?.showWeather) {
      elements.weatherSection.classList.add('hidden');
    }
    if (!settings.widgets?.showTodo) {
      document.getElementById('todos-section').classList.add('hidden');
    }
    if (!settings.widgets?.showQuickLinks) {
      document.getElementById('quick-links-section').classList.add('hidden');
    }
    if (!settings.widgets?.showSearch) {
      document.getElementById('search-section').classList.add('hidden');
    }
  }

  function updateClock() {
    const now = new Date();
    elements.clockTime.textContent = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    elements.clockDate.textContent = now.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
  }

  async function loadWeather() {
    try {
      const result = await chrome.runtime.sendMessage({ type: 'GET_WEATHER' });
      if (result?.success && result.data) {
        const w = result.data;
        elements.weatherSection.classList.remove('hidden');
        elements.weatherIcon.textContent = getWeatherEmoji(w.icon || w.condition);
        elements.weatherTemp.textContent = `${w.temperature}°`;
        elements.weatherDesc.textContent = w.description;
        elements.weatherLocation.textContent = w.location;
        elements.weatherHumidity.textContent = `💧 ${w.humidity}%`;
        elements.weatherWind.textContent = `💨 ${w.windSpeed}`;
      }
    } catch (e) {
      console.error('Failed to load weather:', e);
    }
  }

  function getWeatherEmoji(iconOrCondition) {
    const iconMap = {
      '01': '☀️', '02': '⛅', '03': '☁️', '04': '☁️',
      '09': '🌧️', '10': '🌦️', '11': '⛈️', '13': '🌨️', '50': '🌫️'
    };
    if (iconOrCondition?.length >= 2) {
      const code = iconOrCondition.substring(0, 2);
      if (iconMap[code]) return iconMap[code];
    }
    const conditionMap = {
      'Clear': '☀️', 'Clouds': '☁️', 'Rain': '🌧️',
      'Drizzle': '🌦️', 'Thunderstorm': '⛈️', 'Snow': '🌨️',
      'Mist': '🌫️', 'Fog': '🌫️', 'Haze': '🌫️'
    };
    return conditionMap[iconOrCondition] || '🌤️';
  }

  async function loadTodos() {
    try {
      const result = await chrome.runtime.sendMessage({ type: 'GET_TODOS' });
      if (result?.success) {
        todos = result.data || [];
        renderTodos();
      }
    } catch (e) {
      console.error('Failed to load todos:', e);
    }
  }

  function renderTodos() {
    const incomplete = todos.filter(t => !t.completed).slice(0, 5);
    if (incomplete.length === 0) {
      elements.todosList.innerHTML = '<div style="padding: 8px; color: #666; font-size: 12px; text-align: center;">No tasks yet</div>';
      return;
    }
    elements.todosList.innerHTML = incomplete.map(todo => `
      <div class="todo-item${todo.completed ? ' completed' : ''}" data-id="${todo.id}">
        <span class="todo-checkbox${todo.completed ? ' checked' : ''}"></span>
        <span class="todo-text">${escapeHtml(todo.text)}</span>
        <button class="todo-delete" data-id="${todo.id}">&times;</button>
      </div>
    `).join('');

    elements.todosList.querySelectorAll('.todo-checkbox').forEach(el => {
      el.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = el.closest('.todo-item').dataset.id;
        await toggleTodo(id);
      });
    });

    elements.todosList.querySelectorAll('.todo-delete').forEach(el => {
      el.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = el.dataset.id;
        await deleteTodo(id);
      });
    });
  }

  async function toggleTodo(id) {
    try {
      await chrome.runtime.sendMessage({ type: 'TOGGLE_TODO', id });
      await loadTodos();
    } catch (e) {
      console.error('Failed to toggle todo:', e);
    }
  }

  async function deleteTodo(id) {
    try {
      await chrome.runtime.sendMessage({ type: 'DELETE_TODO', id });
      await loadTodos();
    } catch (e) {
      console.error('Failed to delete todo:', e);
    }
  }

  async function addTodo(text) {
    if (!text.trim()) return;
    try {
      await chrome.runtime.sendMessage({
        type: 'ADD_TODO',
        todo: { text: text.trim(), priority: 'medium', category: 'general' }
      });
      elements.todoInput.value = '';
      elements.todoInputWrapper.classList.add('hidden');
      await loadTodos();
    } catch (e) {
      console.error('Failed to add todo:', e);
    }
  }

  function renderQuickLinks() {
    const links = settings?.bookmarks?.quickLinks || [];
    elements.quickLinksGrid.innerHTML = links.map(link => `
      <a class="quick-link" href="${escapeHtml(link.url)}" title="${escapeHtml(link.title)}">
        <span class="quick-link-icon">${link.icon || '🔗'}</span>
        <span class="quick-link-title">${escapeHtml(link.title)}</span>
      </a>
    `).join('');

    elements.quickLinksGrid.querySelectorAll('.quick-link').forEach(el => {
      el.addEventListener('click', async (e) => {
        e.preventDefault();
        const url = el.getAttribute('href');
        if (url) {
          await chrome.runtime.sendMessage({ type: 'OPEN_TAB', url, active: true });
        }
      });
    });
  }

  async function switchTheme(theme) {
    try {
      await chrome.runtime.sendMessage({
        type: 'UPDATE_SETTINGS',
        settings: { general: { theme } }
      });
      document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.theme === theme);
      });
      const tabs = await chrome.tabs.query({});
      for (const tab of tabs) {
        try {
          await chrome.tabs.sendMessage(tab.id, { type: 'THEME_CHANGED', theme });
        } catch {}
      }
    } catch (e) {
      console.error('Failed to switch theme:', e);
    }
  }

  async function loadPomodoro() {
    try {
      const result = await chrome.runtime.sendMessage({ type: 'GET_POMODORO' });
      if (result?.success) {
        pomodoroState = result.data;
        updatePomodoroDisplay();
      }
    } catch (e) {
      console.error('Failed to load pomodoro:', e);
    }
  }

  function updatePomodoroDisplay() {
    if (!pomodoroState) return;
    const mins = Math.floor(pomodoroState.timeLeft / 60);
    const secs = pomodoroState.timeLeft % 60;
    const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    elements.footerPomodoro.textContent = `🍅 ${pomodoroState.running ? timeStr : '--:--'}`;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function setupEventListeners() {
    elements.searchInput.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') {
        const query = elements.searchInput.value.trim();
        if (!query) return;
        if (query.includes('.') && !query.includes(' ')) {
          const url = query.startsWith('http') ? query : `https://${query}`;
          await chrome.runtime.sendMessage({ type: 'OPEN_TAB', url, active: true });
        } else {
          await chrome.runtime.sendMessage({ type: 'SEARCH_TEXT', query });
        }
        window.close();
      }
    });

    elements.btnAddTodo.addEventListener('click', () => {
      elements.todoInputWrapper.classList.toggle('hidden');
      if (!elements.todoInputWrapper.classList.contains('hidden')) {
        elements.todoInput.focus();
      }
    });

    elements.todoInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        addTodo(elements.todoInput.value);
      }
    });

    elements.todoSubmit.addEventListener('click', () => {
      addTodo(elements.todoInput.value);
    });

    elements.themeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        switchTheme(btn.dataset.theme);
      });
    });

    elements.btnSidebar.addEventListener('click', async () => {
      await chrome.runtime.sendMessage({ type: 'OPEN_SIDEBAR' });
      window.close();
    });

    elements.btnSettings.addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
      window.close();
    });

    elements.btnEditLinks.addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
      window.close();
    });

    elements.footerPomodoro.addEventListener('click', async () => {
      if (pomodoroState && !pomodoroState.running) {
        const newState = {
          running: true,
          phase: 'work',
          timeLeft: (settings?.productivity?.pomodoroDuration || 25) * 60,
          completedPomodoros: pomodoroState.completedPomodoros || 0,
          startedAt: Date.now()
        };
        await chrome.runtime.sendMessage({ type: 'UPDATE_POMODORO', state: newState });
        pomodoroState = newState;
        updatePomodoroDisplay();
      }
    });
  }

  init();
});
