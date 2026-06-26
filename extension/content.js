(function () {
  'use strict';

  let currentTheme = 'dark';
  let extensionSettings = null;

  const THEME_STYLES = {
    dark: {
      bg: '#111111',
      surface: '#1a1a1a',
      text: '#f0ece4',
      textSecondary: '#a09888',
      accent: '#c4a882',
      border: '#333333'
    },
    light: {
      bg: '#f5f5f0',
      surface: '#ffffff',
      text: '#1a1a1a',
      textSecondary: '#666666',
      accent: '#8b7355',
      border: '#d0d0d0'
    },
    oled: {
      bg: '#000000',
      surface: '#0a0a0a',
      text: '#ffffff',
      textSecondary: '#888888',
      accent: '#c4a882',
      border: '#1a1a1a'
    },
    sepia: {
      bg: '#2b2416',
      surface: '#362d1c',
      text: '#e8dcc8',
      textSecondary: '#a09070',
      accent: '#c4a882',
      border: '#4a3f2a'
    }
  };

  const STYLE_ID = 'brutalist-chrome-styles';
  const INJECTED_CLASS = 'brutalist-chrome-injected';

  function injectStyles(theme = 'dark') {
    const colors = THEME_STYLES[theme] || THEME_STYLES.dark;
    const existing = document.getElementById(STYLE_ID);
    if (existing) existing.remove();

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      ::selection {
        background: ${colors.accent}44 !important;
        color: ${colors.text} !important;
      }

      ::-webkit-scrollbar {
        width: 8px !important;
        height: 8px !important;
      }
      ::-webkit-scrollbar-track {
        background: ${colors.bg} !important;
      }
      ::-webkit-scrollbar-thumb {
        background: ${colors.border} !important;
        border-radius: 4px !important;
      }
      ::-webkit-scrollbar-thumb:hover {
        background: ${colors.textSecondary}33 !important;
      }

      body.brutalist-dark-theme {
        background-color: ${colors.bg} !important;
        color: ${colors.text} !important;
      }

      .brutalist-chrome-injected a {
        color: ${colors.accent} !important;
      }
      .brutalist-chrome-injected a:hover {
        color: ${colors.text} !important;
      }

      ${extensionSettings?.appearance?.customCSS || ''}
    `;
    document.head.appendChild(style);

    document.body?.classList.add(`brutalist-${theme}-theme`);
    document.body?.classList.add(INJECTED_CLASS);
    currentTheme = theme;
  }

  function detectPageType() {
    const url = window.location.href;
    if (url === 'chrome://newtab/' || url === 'edge://newtab/') return 'newtab';
    if (url.startsWith('chrome://')) return 'chrome';
    if (url.startsWith('chrome-extension://')) return 'extension';
    if (url.startsWith('about:')) return 'about';
    if (url.startsWith('file://')) return 'local';
    return 'web';
  }

  function addKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (!extensionSettings?.shortcuts?.enabled) return;

      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        chrome.runtime.sendMessage({ type: 'EXECUTE_COMMAND', command: 'open-command-palette' });
      }

      if (e.ctrlKey && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        chrome.runtime.sendMessage({ type: 'OPEN_SIDEBAR' });
      }

      if (e.ctrlKey && e.shiftKey && e.key === 'B') {
        e.preventDefault();
        chrome.runtime.sendMessage({ type: 'EXECUTE_COMMAND', command: 'new-bookmark' });
      }

      if (e.ctrlKey && e.shiftKey && e.key === 'H') {
        e.preventDefault();
        chrome.runtime.sendMessage({ type: 'EXECUTE_COMMAND', command: 'clear-history' });
      }
    });
  }

  function overrideContextMenu() {
    document.addEventListener('contextmenu', (e) => {
      if (!extensionSettings?.appearance?.customContextMenu) return;
    }, true);
  }

  function injectThemeMeta() {
    const meta = document.createElement('meta');
    meta.name = 'brutalist-chrome-theme';
    meta.content = currentTheme;
    document.head.appendChild(meta);
  }

  async function init() {
    try {
      const result = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
      if (result?.success) {
        extensionSettings = result.data;
        const theme = extensionSettings.general?.theme || 'dark';

        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', () => {
            injectStyles(theme);
            injectThemeMeta();
            addKeyboardShortcuts();
            overrideContextMenu();
          });
        } else {
          injectStyles(theme);
          injectThemeMeta();
          addKeyboardShortcuts();
          overrideContextMenu();
        }
      }
    } catch (e) {
      console.warn('Brutalist Chrome initialization error:', e);
    }
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    try {
      switch (message.type) {
        case 'THEME_CHANGED':
          if (message.theme && THEME_STYLES[message.theme]) {
            injectStyles(message.theme);
            injectThemeMeta();
          }
          sendResponse({ success: true });
          break;

        case 'PAGE_READY':
          if (message.settings) {
            extensionSettings = message.settings;
            if (message.theme) {
              injectStyles(message.theme);
              injectThemeMeta();
            }
          }
          sendResponse({ success: true });
          break;

        case 'SETTINGS_UPDATED':
          if (message.settings) {
            extensionSettings = message.settings;
            if (message.settings.general?.theme) {
              injectStyles(message.settings.general.theme);
            }
          }
          sendResponse({ success: true });
          break;

        case 'GET_PAGE_INFO':
          sendResponse({
            success: true,
            data: {
              title: document.title,
              url: window.location.href,
              selection: window.getSelection()?.toString() || '',
              pageType: detectPageType(),
              theme: currentTheme
            }
          });
          break;

        case 'INJECT_CSS':
          if (message.css) {
            const styleEl = document.createElement('style');
            styleEl.textContent = message.css;
            document.head.appendChild(styleEl);
          }
          sendResponse({ success: true });
          break;
      }
    } catch (e) {
      sendResponse({ success: false, error: e.message });
    }
    return true;
  });

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }

  const pageType = detectPageType();
  if (pageType !== 'web' && pageType !== 'newtab') {
    return;
  }
})();
