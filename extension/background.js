import { storage, DEFAULTS } from './storage/storage.js';
import { contextMenuManager } from './contextMenus/contextMenus.js';
import { commandSystem } from './commands/commands.js';
import { getTimeOfDay, formatDate, ErrorHandler } from './utils/utils.js';

const WEATHER_ALARM = 'brutalist-weather-refresh';
const POMODORO_ALARM = 'brutalist-pomodoro-tick';
const CLEANUP_ALARM = 'brutalist-cleanup';

chrome.runtime.onInstalled.addListener(async (details) => {
  await initializeExtension(details);
});

chrome.runtime.onStartup.addListener(async () => {
  await initializeExtension({ reason: 'startup' });
});

async function initializeExtension(details) {
  try {
    const settings = await storage.getAllSettings();

    if (details.reason === 'install' || settings.system?.firstRun) {
      await storage.saveAllSettings(JSON.parse(JSON.stringify(DEFAULTS)));
      await storage.updateSetting('system', 'firstRun', false);
      await storage.updateSetting('system', 'setupComplete', false);
      chrome.tabs.create({ url: chrome.runtime.getURL('extension/options/options.html') });
    }

    if (details.reason === 'update') {
      await storage.migrateSettings();
      ErrorHandler.showNotification(
        'Brutalist Chrome Updated',
        `Updated to version ${chrome.runtime.getManifest().version}`
      );
    }

    await contextMenuManager.initialize();

    await setupAlarms(settings);

    await updateBadge(settings);

    await applyTimeBasedTheme(settings);

    console.log(`Brutalist Chrome initialized (reason: ${details.reason})`);
  } catch (e) {
    ErrorHandler.handle(e, 'Extension initialization');
  }
}

async function setupAlarms(settings) {
  try {
    const existingAlarms = await chrome.alarms.getAll();
    const existingNames = existingAlarms.map(a => a.name);

    if (settings.widgets?.showWeather && settings.weather?.apiKey) {
      if (!existingNames.includes(WEATHER_ALARM)) {
        chrome.alarms.create(WEATHER_ALARM, {
          periodInMinutes: settings.weather.refreshInterval || 30
        });
      }
    }

    if (settings.productivity?.showNotifications) {
      if (!existingNames.includes(POMODORO_ALARM)) {
        chrome.alarms.create(POMODORO_ALARM, {
          periodInMinutes: 1
        });
      }
    }

    if (!existingNames.includes(CLEANUP_ALARM)) {
      chrome.alarms.create(CLEANUP_ALARM, {
        periodInMinutes: 60
      });
    }
  } catch (e) {
    console.error('Alarm setup error:', e);
  }
}

async function updateBadge(settings) {
  try {
    if (settings.appearance?.showBadge) {
      const timeOfDay = getTimeOfDay();
      const iconMap = {
        morning: '🌅',
        afternoon: '☀️',
        evening: '🌆',
        night: '🌙'
      };
      await chrome.action.setBadgeText({ text: iconMap[timeOfDay] || '' });
      await chrome.action.setBadgeBackgroundColor({ color: '#c4a882' });
    } else {
      await chrome.action.setBadgeText({ text: '' });
    }
  } catch (e) {
    console.error('Badge update error:', e);
  }
}

async function applyTimeBasedTheme(settings) {
  if (!settings.general?.theme || settings.general.theme !== 'auto') return;

  const timeOfDay = getTimeOfDay();
  const themeMap = {
    morning: 'dark',
    afternoon: 'dark',
    evening: 'sepia',
    night: 'oled'
  };

  const targetTheme = themeMap[timeOfDay] || 'dark';
  await commandSystem.broadcastThemeChange(targetTheme);
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  try {
    switch (alarm.name) {
      case WEATHER_ALARM:
        await refreshWeather();
        break;
      case POMODORO_ALARM:
        await tickPomodoro();
        break;
      case CLEANUP_ALARM:
        await performCleanup();
        break;
    }
  } catch (e) {
    ErrorHandler.handle(e, `Alarm: ${alarm.name}`);
  }
});

async function refreshWeather() {
  try {
    const settings = await storage.getAllSettings();
    if (!settings.weather?.apiKey) return;

    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${settings.weather.location || 'London'}&units=${settings.weather.unit === 'celsius' ? 'metric' : 'imperial'}&appid=${settings.weather.apiKey}`
    );
    const data = await response.json();

    const cached = {
      temperature: Math.round(data.main.temp),
      condition: data.weather[0].main,
      description: data.weather[0].description,
      icon: data.weather[0].icon,
      humidity: data.main.humidity,
      windSpeed: data.wind.speed,
      location: data.name,
      timestamp: Date.now()
    };

    await storage.saveWeatherCache(cached);

    const tabs = await chrome.tabs.query({});
    const message = { type: 'WEATHER_UPDATED', weather: cached };
    for (const tab of tabs) {
      try {
        await chrome.tabs.sendMessage(tab.id, message);
      } catch {}
    }
  } catch (e) {
    console.error('Weather refresh error:', e);
  }
}

async function tickPomodoro() {
  try {
    const pomodoroState = await storage.getPomodoroState();
    if (!pomodoroState.running) return;

    if (pomodoroState.timeLeft > 0) {
      pomodoroState.timeLeft--;
      await storage.savePomodoroState(pomodoroState);
    } else {
      await handlePomodoroComplete(pomodoroState);
    }
  } catch (e) {
    console.error('Pomodoro tick error:', e);
  }
}

async function handlePomodoroComplete(state) {
  const settings = await storage.getAllSettings();
  const isWorkPhase = state.phase === 'work';
  let nextPhase, nextDuration;

  if (isWorkPhase) {
    state.completedPomodoros++;
    if (state.completedPomodoros % (settings.productivity.pomodoroBeforeLongBreak || 4) === 0) {
      nextPhase = 'longBreak';
      nextDuration = (settings.productivity.longBreak || 15) * 60;
    } else {
      nextPhase = 'shortBreak';
      nextDuration = (settings.productivity.shortBreak || 5) * 60;
    }
    ErrorHandler.showNotification(
      'Pomodoro Complete!',
      `Great work! Time for a ${nextPhase === 'longBreak' ? 'long' : 'short'} break.`
    );
  } else {
    nextPhase = 'work';
    nextDuration = (settings.productivity.pomodoroDuration || 25) * 60;
    ErrorHandler.showNotification(
      'Break Over',
      'Time to get back to work!'
    );
  }

  state.phase = nextPhase;
  state.timeLeft = nextDuration;
  state.running = settings.productivity.autoStartBreaks || settings.productivity.autoStartPomodoros || false;
  if (!state.running) state.phase = 'idle';

  await storage.savePomodoroState(state);
}

async function performCleanup() {
  try {
    const cache = await storage.getWeatherCache();
    if (cache && (Date.now() - cache.timestamp) > 86400000) {
      await storage.saveWeatherCache(null);
    }

    const todos = await storage.getTodos();
    const staleTodos = todos.filter(t => t.completed && t.completedAt && (Date.now() - t.completedAt) > 2592000000);
    if (staleTodos.length > 5) {
      const freshTodos = todos.filter(t => !staleTodos.includes(t));
      await storage.saveTodos(freshTodos);
    }
  } catch (e) {
    console.error('Cleanup error:', e);
  }
}

chrome.commands.onCommand.addListener(async (command) => {
  await commandSystem.handleCommand(command);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender, sendResponse);
  return true;
});

async function handleMessage(message, sender, sendResponse) {
  try {
    switch (message.type) {
      case 'GET_SETTINGS':
        const settings = await storage.getAllSettings();
        sendResponse({ success: true, data: settings });
        break;

      case 'UPDATE_SETTINGS':
        if (message.settings) {
          const current = await storage.getAllSettings();
          const merged = { ...current, ...message.settings };
          await storage.saveAllSettings(merged);
          if (message.settings.weather) {
            await setupAlarms(merged);
          }
          sendResponse({ success: true });
        } else {
          sendResponse({ success: false, error: 'No settings provided' });
        }
        break;

      case 'RESET_SETTINGS':
        await storage.resetSettings();
        sendResponse({ success: true });
        break;

      case 'EXPORT_SETTINGS':
        await storage.exportSettings();
        sendResponse({ success: true });
        break;

      case 'IMPORT_SETTINGS':
        if (message.data) {
          const result = await storage.importSettings(message.data);
          sendResponse(result);
        } else {
          sendResponse({ success: false, error: 'No data provided' });
        }
        break;

      case 'GET_TODOS':
        const todos = await storage.getTodos();
        sendResponse({ success: true, data: todos });
        break;

      case 'ADD_TODO':
        if (message.todo) {
          const newTodo = await storage.addTodo(message.todo);
          sendResponse({ success: true, data: newTodo });
        } else {
          sendResponse({ success: false, error: 'No todo data' });
        }
        break;

      case 'UPDATE_TODO':
        if (message.id && message.updates) {
          const updated = await storage.updateTodo(message.id, message.updates);
          sendResponse({ success: true, data: updated });
        } else {
          sendResponse({ success: false, error: 'Invalid update data' });
        }
        break;

      case 'DELETE_TODO':
        if (message.id) {
          await storage.deleteTodo(message.id);
          sendResponse({ success: true });
        } else {
          sendResponse({ success: false, error: 'No id provided' });
        }
        break;

      case 'TOGGLE_TODO':
        if (message.id) {
          const toggled = await storage.toggleTodo(message.id);
          sendResponse({ success: true, data: toggled });
        } else {
          sendResponse({ success: false, error: 'No id provided' });
        }
        break;

      case 'GET_WEATHER':
        const weatherCache = await storage.getWeatherCache();
        sendResponse({ success: true, data: weatherCache });
        break;

      case 'GET_POMODORO':
        const pomodoro = await storage.getPomodoroState();
        sendResponse({ success: true, data: pomodoro });
        break;

      case 'UPDATE_POMODORO':
        if (message.state) {
          await storage.savePomodoroState(message.state);
          sendResponse({ success: true });
        } else {
          sendResponse({ success: false, error: 'No state provided' });
        }
        break;

      case 'OPEN_SIDEBAR':
        try {
          if (sender.tab?.id) {
            await chrome.sidePanel.open({ tabId: sender.tab.id });
          } else {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab?.id) {
              await chrome.sidePanel.open({ tabId: tab.id });
            }
          }
          sendResponse({ success: true });
        } catch (e) {
          sendResponse({ success: false, error: e.message });
        }
        break;

      case 'GET_BOOKMARKS':
        try {
          const tree = await chrome.bookmarks.getTree();
          sendResponse({ success: true, data: tree });
        } catch (e) {
          sendResponse({ success: false, error: e.message });
        }
        break;

      case 'SEARCH_BOOKMARKS':
        if (message.query) {
          try {
            const results = await chrome.bookmarks.search(message.query);
            sendResponse({ success: true, data: results });
          } catch (e) {
            sendResponse({ success: false, error: e.message });
          }
        } else {
          sendResponse({ success: false, error: 'No query provided' });
        }
        break;

      case 'GET_HISTORY':
        try {
          const historyItems = await chrome.history.search({
            text: '',
            maxResults: message.limit || 50,
            startTime: 0
          });
          sendResponse({ success: true, data: historyItems });
        } catch (e) {
          sendResponse({ success: false, error: e.message });
        }
        break;

      case 'SEARCH_HISTORY':
        if (message.query) {
          try {
            const results = await chrome.history.search({
              text: message.query,
              maxResults: message.limit || 20,
              startTime: 0
            });
            sendResponse({ success: true, data: results });
          } catch (e) {
            sendResponse({ success: false, error: e.message });
          }
        } else {
          sendResponse({ success: false, error: 'No query provided' });
        }
        break;

      case 'DELETE_HISTORY_ITEM':
        if (message.url) {
          try {
            await chrome.history.deleteUrl({ url: message.url });
            sendResponse({ success: true });
          } catch (e) {
            sendResponse({ success: false, error: e.message });
          }
        }
        break;

      case 'OPEN_TAB':
        if (message.url) {
          await chrome.tabs.create({ url: message.url, active: message.active !== false });
          sendResponse({ success: true });
        }
        break;

      case 'SEARCH_TEXT':
        if (message.query) {
          const s = await storage.getAllSettings();
          const searchUrl = s.shortcuts?.searchEngine || 'https://www.google.com/search?q=';
          await chrome.tabs.create({ url: `${searchUrl}${encodeURIComponent(message.query)}` });
          sendResponse({ success: true });
        }
        break;

      case 'SHOW_NOTIFICATION':
        if (message.title && message.message) {
          ErrorHandler.showNotification(message.title, message.message);
          sendResponse({ success: true });
        }
        break;

      case 'GET_TIME_OF_DAY':
        sendResponse({ success: true, data: getTimeOfDay() });
        break;

      case 'TAKE_SCREENSHOT':
        try {
          const dataUrl = await chrome.tabs.captureVisibleTab();
          sendResponse({ success: true, data: dataUrl });
        } catch (e) {
          sendResponse({ success: false, error: e.message });
        }
        break;

      case 'GET_COMMANDS':
        sendResponse({ success: true, data: commandSystem.getAllCommands() });
        break;

      case 'EXECUTE_COMMAND':
        if (message.command) {
          await commandSystem.handleCommand(message.command);
          sendResponse({ success: true });
        }
        break;

      default:
        sendResponse({ success: false, error: `Unknown message type: ${message.type}` });
    }
  } catch (e) {
    ErrorHandler.handle(e, `Message handler: ${message.type}`);
    sendResponse({ success: false, error: e.message });
  }
}

chrome.sidePanel
  .setPanelBehavior({
    openPanelOnActionClick: true
  })
  .catch(() => {});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab?.url) {
      const domain = new URL(tab.url).hostname;
      await chrome.action.setTitle({ title: `Brutalist Chrome - ${domain}` });
    }
  } catch (e) {
    console.error('Tab activate handler error:', e);
  }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab?.url) {
    try {
      const settings = await storage.getAllSettings();
      const message = {
        type: 'PAGE_READY',
        theme: settings.general.theme,
        settings
      };
      await chrome.tabs.sendMessage(tabId, message);
    } catch {}
  }
});
