import { storage } from '../storage/storage.js';
import { ErrorHandler, extractDomain } from '../utils/utils.js';

export class ContextMenuManager {
  constructor() {
    this.menus = new Map();
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    chrome.contextMenus.onClicked.addListener((info, tab) => this.handleClick(info, tab));
    await this.createAllMenus();
    this.initialized = true;
  }

  async createAllMenus() {
    await chrome.contextMenus.removeAll();

    this.createMenu('search-google', 'Search Google for "%s"', ['selection'], undefined, {
      id: 'search-google',
      contexts: ['selection']
    });

    this.createMenu('bookmark-page', 'Bookmark This Page', [], undefined, {
      id: 'bookmark-page',
      contexts: ['page']
    });

    this.createMenu('separator-1', undefined, [], undefined, {
      id: 'separator-1',
      type: 'separator',
      contexts: ['page', 'link', 'selection']
    });

    this.createMenu('read-later', 'Add to Read Later', ['page', 'link'], undefined, {
      id: 'read-later',
      contexts: ['page', 'link']
    });

    this.createMenu('take-screenshot', 'Take Screenshot', ['page'], undefined, {
      id: 'take-screenshot',
      contexts: ['page']
    });

    this.createMenu('separator-2', undefined, [], undefined, {
      id: 'separator-2',
      type: 'separator',
      contexts: ['page']
    });

    this.createMenu('copy-title', 'Copy Page Title', ['page'], undefined, {
      id: 'copy-title',
      contexts: ['page']
    });

    this.createMenu('copy-url', 'Copy Page URL', ['page', 'link'], undefined, {
      id: 'copy-url',
      contexts: ['page', 'link']
    });

    this.createMenu('separator-3', undefined, [], undefined, {
      id: 'separator-3',
      type: 'separator',
      contexts: ['page']
    });

    this.createMenu('open-sidebar-menu', 'Open Sidebar', ['page'], undefined, {
      id: 'open-sidebar-menu',
      contexts: ['page']
    });

    this.createMenu('open-options-menu', 'Brutalist Settings', ['page'], undefined, {
      id: 'open-options-menu',
      contexts: ['page']
    });

    this.createParentMenu('brutalist-tools', 'Brutalist Chrome', [
      { id: 'bc-search-google', title: 'Search Google for "%s"', contexts: ['selection'] },
      { id: 'bc-bookmark', title: 'Bookmark This Page', contexts: ['page'] },
      { id: 'bc-read-later', title: 'Add to Read Later', contexts: ['page', 'link'] },
      { id: 'bc-screenshot', title: 'Take Screenshot', contexts: ['page'] },
      { id: 'bc-copy-title', title: 'Copy Page Title', contexts: ['page'] },
      { id: 'bc-copy-url', title: 'Copy Page URL', contexts: ['page', 'link'] },
      { id: 'bc-separator', type: 'separator', contexts: ['page'] },
      { id: 'bc-settings', title: 'Settings', contexts: ['page'] }
    ]);
  }

  createMenu(id, title, contexts, onclick, extra = {}) {
    const props = {
      id,
      title: title || '',
      contexts: contexts.length > 0 ? contexts : ['page'],
      ...extra
    };
    if (onclick) props.onclick = onclick;

    try {
      chrome.contextMenus.create(props, () => {
        if (chrome.runtime.lastError) {
          console.warn('Context menu creation error:', chrome.runtime.lastError.message);
        }
      });
      this.menus.set(id, { ...props, handler: onclick });
    } catch (e) {
      console.error('Failed to create context menu:', id, e);
    }
  }

  createParentMenu(id, title, children) {
    try {
      chrome.contextMenus.create({
        id,
        title,
        contexts: ['page', 'selection', 'link']
      }, () => {
        if (chrome.runtime.lastError) {
          console.warn('Parent menu error:', chrome.runtime.lastError.message);
        }
      });
      children.forEach(child => {
        chrome.contextMenus.create({
          parentId: id,
          ...child
        }, () => {
          if (chrome.runtime.lastError) {
            console.warn('Child menu error:', chrome.runtime.lastError.message);
          }
        });
      });
    } catch (e) {
      console.error('Failed to create parent menu:', e);
    }
  }

  async handleClick(info, tab) {
    switch (info.menuItemId) {
      case 'search-google':
      case 'bc-search-google':
        await this.handleSearchGoogle(info, tab);
        break;
      case 'bookmark-page':
      case 'bc-bookmark':
        await this.handleBookmarkPage(info, tab);
        break;
      case 'read-later':
      case 'bc-read-later':
        await this.handleReadLater(info, tab);
        break;
      case 'take-screenshot':
      case 'bc-screenshot':
        await this.handleScreenshot(info, tab);
        break;
      case 'copy-title':
      case 'bc-copy-title':
        await this.handleCopyTitle(info, tab);
        break;
      case 'copy-url':
      case 'bc-copy-url':
        await this.handleCopyUrl(info, tab);
        break;
      case 'open-sidebar-menu':
        await this.handleOpenSidebar(info, tab);
        break;
      case 'open-options-menu':
      case 'bc-settings':
        chrome.runtime.openOptionsPage();
        break;
    }
  }

  async handleSearchGoogle(info) {
    const settings = await storage.getAllSettings();
    const searchUrl = settings.shortcuts?.searchEngine || 'https://www.google.com/search?q=';
    const query = info.selectionText || '';
    if (query) {
      await chrome.tabs.create({ url: `${searchUrl}${encodeURIComponent(query)}` });
    }
  }

  async handleBookmarkPage(info, tab) {
    if (!tab?.url || !tab?.title) return;
    try {
      const existing = await chrome.bookmarks.search({ url: tab.url });
      if (existing.length > 0) {
        ErrorHandler.showNotification('Already Bookmarked', `"${tab.title}" is already in your bookmarks`);
        return;
      }
      await chrome.bookmarks.create({
        title: tab.title,
        url: tab.url
      });
      ErrorHandler.showNotification('Bookmarked', `"${tab.title}" has been bookmarked`);
    } catch (e) {
      ErrorHandler.handle(e, 'Bookmark context menu');
    }
  }

  async handleReadLater(info, tab) {
    const title = info.linkText || tab?.title || 'Untitled';
    const url = info.linkUrl || tab?.url || '';
    await storage.addTodo({
      text: `Read: ${title} - ${extractDomain(url)}`,
      priority: 'low',
      category: 'reading',
      dueDate: null
    });
    ErrorHandler.showNotification('Added to Read Later', `"${title}" added to your reading list`);
  }

  async handleScreenshot() {
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
      ErrorHandler.handle(e, 'Screenshot context menu');
    }
  }

  async handleCopyTitle(info, tab) {
    if (!tab?.title) return;
    try {
      await navigator.clipboard.writeText(tab.title);
      ErrorHandler.showNotification('Copied', 'Page title copied to clipboard');
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = tab.title;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  }

  async handleCopyUrl(info, tab) {
    const url = info.linkUrl || tab?.url || '';
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      ErrorHandler.showNotification('Copied', 'URL copied to clipboard');
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  }

  async handleOpenSidebar() {
    try {
      await chrome.sidePanel.open({ action: 'toggle' });
    } catch {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        await chrome.sidePanel.open({ tabId: tab.id });
      }
    }
  }
}

export const contextMenuManager = new ContextMenuManager();
