import { storage } from '../storage/storage.js';
import { ErrorHandler } from '../utils/utils.js';

export class CommandSystem {
  constructor() {
    this.commands = new Map();
    this.paletteVisible = false;
    this.paletteElement = null;
    this.registerBuiltInCommands();
  }

  registerBuiltInCommands() {
    this.register('toggle-theme', 'Toggle Theme', 'Ctrl+Shift+T', async () => {
      const settings = await storage.getAllSettings();
      const themes = ['dark', 'light', 'oled', 'sepia'];
      const currentIndex = themes.indexOf(settings.general.theme);
      const nextTheme = themes[(currentIndex + 1) % themes.length];
      await storage.updateSetting('general', 'theme', nextTheme);
      await this.broadcastThemeChange(nextTheme);
      ErrorHandler.showNotification('Theme Changed', `Switched to ${nextTheme} theme`);
    });

    this.register('open-sidebar', 'Toggle Sidebar', 'Ctrl+Shift+S', async () => {
      try {
        await chrome.sidePanel.open({ action: 'toggle' });
      } catch {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab) {
          await chrome.sidePanel.open({ tabId: tab.id });
        }
      }
    });

    this.register('open-popup', 'Open Popup', 'Ctrl+Shift+K', async () => {
      try {
        await chrome.action.openPopup();
      } catch (e) {
        console.error('Could not open popup:', e);
      }
    });

    this.register('search-selection', 'Search Selected Text', 'Ctrl+Shift+F', async () => {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id) return;
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => window.getSelection()?.toString() || ''
        });
        const selectedText = results?.[0]?.result;
        if (selectedText) {
          const settings = await storage.getAllSettings();
          const searchUrl = settings.shortcuts?.searchEngine || 'https://www.google.com/search?q=';
          await chrome.tabs.create({ url: `${searchUrl}${encodeURIComponent(selectedText)}` });
        }
      } catch (e) {
        ErrorHandler.handle(e, 'Search selection');
      }
    });

    this.register('quick-add-todo', 'Quick Add Todo', 'Ctrl+Shift+Q', async () => {
      const result = await chrome.tabs.query({ active: true, currentWindow: true });
      const tab = result[0];
      const title = tab?.title || 'New Todo';
      await storage.addTodo({ text: `Read: ${title}`, priority: 'medium', category: 'reading' });
      ErrorHandler.showNotification('Todo Added', `"${title}" added to your reading list`);
    });

    this.register('new-bookmark', 'Bookmark Current Page', '', async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.url || !tab?.title) return;
      try {
        await chrome.bookmarks.create({
          title: tab.title,
          url: tab.url
        });
        ErrorHandler.showNotification('Bookmarked', `"${tab.title}" has been bookmarked`);
      } catch (e) {
        ErrorHandler.handle(e, 'Bookmark page');
      }
    });

    this.register('take-screenshot', 'Take Screenshot', '', async () => {
      try {
        const dataUrl = await chrome.tabs.captureVisibleTab();
        const blob = await (await fetch(dataUrl)).blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `screenshot-${Date.now()}.png`;
        a.click();
        URL.revokeObjectURL(url);
      } catch (e) {
        ErrorHandler.handle(e, 'Screenshot');
      }
    });

    this.register('clear-history', 'Clear Browsing History', '', async () => {
      try {
        await chrome.history.deleteAll();
        ErrorHandler.showNotification('History Cleared', 'Browsing history has been cleared');
      } catch (e) {
        ErrorHandler.handle(e, 'Clear history');
      }
    });

    this.register('open-options', 'Open Settings', '', () => {
      chrome.runtime.openOptionsPage();
    });

    this.register('open-command-palette', 'Open Command Palette', 'Ctrl+Shift+P', () => {
      this.togglePalette();
    });
  }

  register(id, label, shortcut, handler) {
    this.commands.set(id, { id, label, shortcut, handler, category: this.categorizeCommand(id) });
  }

  categorizeCommand(id) {
    const categories = {
      theme: ['toggle-theme'],
      navigation: ['open-sidebar', 'open-popup', 'open-options', 'open-command-palette'],
      search: ['search-selection'],
      productivity: ['quick-add-todo'],
      bookmarks: ['new-bookmark'],
      tools: ['take-screenshot', 'clear-history']
    };
    for (const [category, commands] of Object.entries(categories)) {
      if (commands.includes(id)) return category;
    }
    return 'other';
  }

  async handleCommand(command) {
    const cmd = this.commands.get(command);
    if (cmd) {
      try {
        await cmd.handler();
      } catch (e) {
        ErrorHandler.handle(e, `Command: ${command}`);
      }
    }
  }

  getAllCommands() {
    return Array.from(this.commands.values());
  }

  getCommandsByCategory() {
    const grouped = {};
    this.commands.forEach(cmd => {
      if (!grouped[cmd.category]) grouped[cmd.category] = [];
      grouped[cmd.category].push(cmd);
    });
    return grouped;
  }

  async broadcastThemeChange(theme) {
    try {
      const tabs = await chrome.tabs.query({});
      const message = { type: 'THEME_CHANGED', theme };
      for (const tab of tabs) {
        try {
          await chrome.tabs.sendMessage(tab.id, message);
        } catch {
        }
      }
    } catch (e) {
      console.error('Broadcast theme change error:', e);
    }
  }

  togglePalette() {
    if (this.paletteVisible) {
      this.hidePalette();
    } else {
      this.showPalette();
    }
  }

  showPalette() {
    if (this.paletteElement) return;
    this.paletteElement = document.createElement('div');
    this.paletteElement.className = 'brutalist-command-palette';
    this.paletteElement.innerHTML = `
      <div class="brutalist-palette-overlay"></div>
      <div class="brutalist-palette-container">
        <div class="brutalist-palette-header">
          <input type="text" class="brutalist-palette-search" placeholder="Type a command..." autofocus />
          <button class="brutalist-palette-close">&times;</button>
        </div>
        <div class="brutalist-palette-commands"></div>
        <div class="brutalist-palette-footer">${this.getAllCommands().length} commands available</div>
      </div>
    `;

    const style = document.createElement('style');
    style.textContent = `
      .brutalist-command-palette {
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        z-index: 2147483647;
        display: flex;
        align-items: flex-start;
        justify-content: center;
        padding-top: 10vh;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      .brutalist-palette-overlay {
        position: absolute;
        top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.6);
        backdrop-filter: blur(4px);
      }
      .brutalist-palette-container {
        position: relative;
        width: 560px;
        max-height: 420px;
        background: #1a1a1a;
        border: 1px solid #333;
        border-radius: 12px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.5);
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }
      .brutalist-palette-header {
        display: flex;
        align-items: center;
        padding: 12px 16px;
        border-bottom: 1px solid #333;
        background: #222;
      }
      .brutalist-palette-search {
        flex: 1;
        background: transparent;
        border: none;
        outline: none;
        color: #f0ece4;
        font-size: 16px;
        padding: 8px 0;
      }
      .brutalist-palette-search::placeholder { color: #666; }
      .brutalist-palette-close {
        background: none;
        border: none;
        color: #888;
        font-size: 22px;
        cursor: pointer;
        padding: 0 4px;
        line-height: 1;
      }
      .brutalist-palette-close:hover { color: #f0ece4; }
      .brutalist-palette-commands {
        flex: 1;
        overflow-y: auto;
        padding: 8px 0;
      }
      .brutalist-palette-command {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 16px;
        cursor: pointer;
        transition: background 0.15s;
      }
      .brutalist-palette-command:hover,
      .brutalist-palette-command.selected {
        background: #2a2a2a;
      }
      .brutalist-palette-command-name {
        color: #f0ece4;
        font-size: 14px;
      }
      .brutalist-palette-command-shortcut {
        color: #666;
        font-size: 12px;
        background: #2a2a2a;
        padding: 2px 8px;
        border-radius: 4px;
      }
      .brutalist-palette-footer {
        padding: 8px 16px;
        color: #666;
        font-size: 12px;
        border-top: 1px solid #333;
        background: #222;
      }
      .brutalist-palette-empty {
        padding: 32px 16px;
        text-align: center;
        color: #666;
        font-size: 14px;
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(this.paletteElement);

    const searchInput = this.paletteElement.querySelector('.brutalist-palette-search');
    const commandsContainer = this.paletteElement.querySelector('.brutalist-palette-commands');
    const closeBtn = this.paletteElement.querySelector('.brutalist-palette-close');
    const overlay = this.paletteElement.querySelector('.brutalist-palette-overlay');

    let selectedIndex = -1;
    let filteredCommands = [];

    const renderCommands = (filter = '') => {
      const lowerFilter = filter.toLowerCase();
      filteredCommands = this.getAllCommands().filter(c =>
        c.label.toLowerCase().includes(lowerFilter) ||
        c.id.toLowerCase().includes(lowerFilter)
      );
      if (filteredCommands.length === 0) {
        commandsContainer.innerHTML = '<div class="brutalist-palette-empty">No commands found</div>';
        return;
      }
      commandsContainer.innerHTML = filteredCommands.map((cmd, index) => `
        <div class="brutalist-palette-command${index === selectedIndex ? ' selected' : ''}"
             data-index="${index}" data-command-id="${cmd.id}">
          <span class="brutalist-palette-command-name">${cmd.label}</span>
          ${cmd.shortcut ? `<span class="brutalist-palette-command-shortcut">${cmd.shortcut}</span>` : ''}
        </div>
      `).join('');
    };

    searchInput.addEventListener('input', () => {
      selectedIndex = -1;
      renderCommands(searchInput.value);
    });

    searchInput.addEventListener('keydown', (e) => {
      const items = commandsContainer.querySelectorAll('.brutalist-palette-command');
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
        renderCommands(searchInput.value);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, 0);
        renderCommands(searchInput.value);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          this.hidePalette();
          filteredCommands[selectedIndex].handler();
        } else if (filteredCommands.length > 0) {
          this.hidePalette();
          filteredCommands[0].handler();
        }
      } else if (e.key === 'Escape') {
        this.hidePalette();
      }
    });

    commandsContainer.addEventListener('click', (e) => {
      const commandItem = e.target.closest('.brutalist-palette-command');
      if (commandItem) {
        const commandId = commandItem.dataset.commandId;
        const cmd = this.commands.get(commandId);
        if (cmd) {
          this.hidePalette();
          cmd.handler();
        }
      }
    });

    overlay.addEventListener('click', () => this.hidePalette());
    closeBtn.addEventListener('click', () => this.hidePalette());

    searchInput.focus();
    renderCommands();
    this.paletteVisible = true;
  }

  hidePalette() {
    if (this.paletteElement) {
      this.paletteElement.remove();
      this.paletteElement = null;
    }
    this.paletteVisible = false;
  }
}

export const commandSystem = new CommandSystem();
