export class BookmarkService {
  constructor() {
    this.bookmarks = [];
    this.folders = [];
  }

  async load() {
    try {
      if (typeof chrome !== 'undefined' && chrome.bookmarks) {
        return await this.loadFromChrome();
      }
    } catch {
      console.warn('Chrome bookmarks API not available, using local storage');
    }
    return this.loadFromLocal();
  }

  async loadFromChrome() {
    return new Promise((resolve, reject) => {
      chrome.bookmarks.getTree((bookmarkTree) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }

        const items = [];
        const folders = [];

        this.traverseBookmarks(bookmarkTree, items, folders);
        this.bookmarks = items;
        this.folders = folders;
        resolve({ bookmarks: items, folders });
      });
    });
  }

  traverseBookmarks(nodes, items, folders, parentFolder = '') {
    for (const node of nodes) {
      if (node.url) {
        items.push({
          id: node.id,
          title: node.title || node.url,
          url: node.url,
          folder: parentFolder,
          dateAdded: node.dateAdded
        });
      }

      if (node.children && !node.url) {
        const folderName = node.title || 'Other Bookmarks';
        if (!folders.includes(folderName)) {
          folders.push(folderName);
        }
        this.traverseBookmarks(node.children, items, folders, folderName);
      }
    }
  }

  async loadFromLocal() {
    const stored = localStorage.getItem('newtab_bookmarks');
    const data = stored ? JSON.parse(stored) : null;

    if (data && data.bookmarks) {
      this.bookmarks = data.bookmarks;
      this.folders = data.folders || this.extractFolders(data.bookmarks);
    } else {
      this.bookmarks = this.getDefaultBookmarks();
      this.folders = this.extractFolders(this.bookmarks);
    }

    return { bookmarks: this.bookmarks, folders: this.folders };
  }

  async saveLocal() {
    localStorage.setItem('newtab_bookmarks', JSON.stringify({
      bookmarks: this.bookmarks,
      folders: this.folders
    }));
  }

  async addBookmark(bookmark) {
    const newBookmark = {
      id: 'bm_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
      title: bookmark.title,
      url: bookmark.url,
      folder: bookmark.folder || '',
      dateAdded: Date.now()
    };

    try {
      if (typeof chrome !== 'undefined' && chrome.bookmarks) {
        await new Promise((resolve, reject) => {
          chrome.bookmarks.create({
            parentId: '1',
            title: bookmark.title,
            url: bookmark.url
          }, (result) => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              newBookmark.id = result.id;
              resolve();
            }
          });
        });
      }
    } catch {
      console.warn('Could not create Chrome bookmark, saving locally');
    }

    this.bookmarks.unshift(newBookmark);
    await this.saveLocal();
    return newBookmark;
  }

  async removeBookmark(id) {
    try {
      if (typeof chrome !== 'undefined' && chrome.bookmarks) {
        const isChromeId = !id.startsWith('bm_');
        if (isChromeId) {
          await new Promise((resolve, reject) => {
            chrome.bookmarks.remove(id, () => {
              if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
              else resolve();
            });
          });
        }
      }
    } catch {
      console.warn('Could not remove Chrome bookmark');
    }

    this.bookmarks = this.bookmarks.filter(b => b.id !== id);
    await this.saveLocal();
  }

  async updateBookmark(id, updates) {
    this.bookmarks = this.bookmarks.map(b => {
      if (b.id === id) {
        return { ...b, ...updates };
      }
      return b;
    });

    try {
      if (typeof chrome !== 'undefined' && chrome.bookmarks) {
        const isChromeId = !id.startsWith('bm_');
        if (isChromeId && updates.title && updates.url) {
          await new Promise((resolve, reject) => {
            chrome.bookmarks.update(id, {
              title: updates.title,
              url: updates.url
            }, () => {
              if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
              else resolve();
            });
          });
        }
      }
    } catch {
      console.warn('Could not update Chrome bookmark');
    }

    await this.saveLocal();
  }

  async reorder(fromIndex, toIndex) {
    if (fromIndex < 0 || fromIndex >= this.bookmarks.length) return false;
    if (toIndex < 0 || toIndex >= this.bookmarks.length) return false;

    const [moved] = this.bookmarks.splice(fromIndex, 1);
    this.bookmarks.splice(toIndex, 0, moved);
    await this.saveLocal();
    return true;
  }

  extractFolders(bookmarks) {
    const folders = new Set();
    for (const b of bookmarks) {
      if (b.folder) folders.add(b.folder);
    }
    return Array.from(folders);
  }

  getDefaultBookmarks() {
    return [
      { id: 'bm_1', title: 'Gmail', url: 'https://mail.google.com', folder: 'Google', dateAdded: Date.now() },
      { id: 'bm_2', title: 'Google Drive', url: 'https://drive.google.com', folder: 'Google', dateAdded: Date.now() },
      { id: 'bm_3', title: 'Calendar', url: 'https://calendar.google.com', folder: 'Google', dateAdded: Date.now() },
      { id: 'bm_4', title: 'YouTube', url: 'https://youtube.com', folder: 'Entertainment', dateAdded: Date.now() },
      { id: 'bm_5', title: 'GitHub', url: 'https://github.com', folder: 'Dev', dateAdded: Date.now() },
      { id: 'bm_6', title: 'Reddit', url: 'https://reddit.com', folder: 'Social', dateAdded: Date.now() },
      { id: 'bm_7', title: 'Twitter', url: 'https://twitter.com', folder: 'Social', dateAdded: Date.now() },
      { id: 'bm_8', title: 'LinkedIn', url: 'https://linkedin.com', folder: 'Social', dateAdded: Date.now() },
      { id: 'bm_9', title: 'ChatGPT', url: 'https://chat.openai.com', folder: 'AI', dateAdded: Date.now() },
      { id: 'bm_10', title: 'Claude', url: 'https://claude.ai', folder: 'AI', dateAdded: Date.now() }
    ];
  }

  getIcon(url) {
    try {
      const parsed = new URL(url);
      return `https://www.google.com/s2/favicons?domain=${parsed.hostname}&sz=64`;
    } catch {
      return '';
    }
  }

  getDomain(url) {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return url;
    }
  }
}

export class BookmarkWidget {
  constructor(config = {}) {
    this.container = config.container || document.body;
    this.addBtn = config.addBtn || null;
    this.service = config.service || new BookmarkService();
    this.currentFolder = config.folder || '';
    this.bookmarks = [];
    this.folders = [];
    this.renderMode = config.mode || 'grid';
  }

  async render() {
    if (!this.container) return;

    const data = await this.service.load();
    this.bookmarks = data.bookmarks;
    this.folders = data.folders;

    this.renderGrid();

    if (this.addBtn) {
      this.addBtn.addEventListener('click', () => this.showAddDialog());
    }
  }

  renderGrid() {
    const filtered = this.currentFolder
      ? this.bookmarks.filter(b => b.folder === this.currentFolder)
      : this.bookmarks;

    if (filtered.length === 0) {
      this.container.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:32px;color:var(--text-secondary);opacity:0.4;font-size:0.85rem;">
          No bookmarks yet. Click + to add one.
        </div>
      `;
      return;
    }

    this.container.innerHTML = filtered.map(b => `
      <a href="${this.escapeAttr(b.url)}" class="bookmark-tile" data-id="${b.id}" draggable="true" title="${this.escapeAttr(b.title)}\n${this.escapeAttr(b.url)}">
        <div class="bookmark-icon">
          <img src="${this.escapeAttr(this.service.getIcon(b.url))}" alt="" width="32" height="32" loading="lazy" onerror="this.parentElement.textContent='${this.escapeHtml(this.service.getDomain(b.url)[0].toUpperCase())}'">
        </div>
        <span class="bookmark-title">${this.escapeHtml(b.title)}</span>
        <button class="bookmark-remove" data-id="${b.id}" title="Remove bookmark">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </a>
    `).join('');

    this.bindEvents();
  }

  bindEvents() {
    this.container.querySelectorAll('.bookmark-remove').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const id = btn.dataset.id;
        await this.service.removeBookmark(id);
        this.renderGrid();
      });
    });

    this.container.addEventListener('dragstart', (e) => {
      const tile = e.target.closest('.bookmark-tile');
      if (tile) {
        tile.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', tile.dataset.id);
      }
    });

    this.container.addEventListener('dragend', (e) => {
      this.container.querySelectorAll('.bookmark-tile').forEach(t => t.classList.remove('dragging', 'drag-over'));
    });

    this.container.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const tile = e.target.closest('.bookmark-tile');
      if (tile) {
        this.container.querySelectorAll('.bookmark-tile').forEach(t => t.classList.remove('drag-over'));
        tile.classList.add('drag-over');
      }
    });

    this.container.addEventListener('dragleave', (e) => {
      const tile = e.target.closest('.bookmark-tile');
      if (tile) tile.classList.remove('drag-over');
    });

    this.container.addEventListener('drop', async (e) => {
      e.preventDefault();
      const draggedId = e.dataTransfer.getData('text/plain');
      const targetTile = e.target.closest('.bookmark-tile');
      if (!targetTile || !draggedId) return;

      const fromIndex = this.bookmarks.findIndex(b => b.id === draggedId);
      const toId = targetTile.dataset.id;
      const toIndex = this.bookmarks.findIndex(b => b.id === toId);

      if (fromIndex >= 0 && toIndex >= 0 && fromIndex !== toIndex) {
        await this.service.reorder(fromIndex, toIndex);
        this.renderGrid();
      }
    });
  }

  showAddDialog() {
    this.showModal('Add Bookmark', `
      <input type="text" class="modal-input" id="bm-title-input" placeholder="Bookmark title" autocomplete="off">
      <input type="url" class="modal-input" id="bm-url-input" placeholder="https://example.com" autocomplete="off">
      <select class="modal-input" id="bm-folder-select">
        <option value="">No folder</option>
        ${this.folders.map(f => `<option value="${this.escapeAttr(f)}">${this.escapeHtml(f)}</option>`).join('')}
      </select>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:4px;">
        <button class="modal-btn secondary" id="bm-cancel-btn">Cancel</button>
        <button class="modal-btn" id="bm-save-btn">Add Bookmark</button>
      </div>
    `, () => {
      document.getElementById('bm-title-input')?.focus();
    });

    document.getElementById('bm-save-btn').addEventListener('click', async () => {
      const title = document.getElementById('bm-title-input')?.value.trim();
      const url = document.getElementById('bm-url-input')?.value.trim();
      const folder = document.getElementById('bm-folder-select')?.value || '';

      if (!title || !url) return;

      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        this.showToast('Please enter a valid URL starting with http:// or https://', 'error');
        return;
      }

      await this.service.addBookmark({ title, url, folder });
      this.closeModal();
      this.renderGrid();
    });

    document.getElementById('bm-cancel-btn').addEventListener('click', () => this.closeModal());

    document.getElementById('bm-url-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') document.getElementById('bm-save-btn')?.click();
    });
  }

  showModal(title, content, onOpen) {
    const overlay = document.getElementById('modal-overlay');
    const titleEl = document.getElementById('modal-title');
    const bodyEl = document.getElementById('modal-body');
    const closeBtn = document.getElementById('modal-close');

    if (!overlay || !titleEl || !bodyEl) return;

    titleEl.textContent = title;
    bodyEl.innerHTML = content;
    overlay.hidden = false;

    closeBtn.onclick = () => this.closeModal();
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.closeModal();
    });

    document.addEventListener('keydown', this._modalEscHandler = (e) => {
      if (e.key === 'Escape') this.closeModal();
    });

    if (onOpen) setTimeout(onOpen, 50);
  }

  closeModal() {
    const overlay = document.getElementById('modal-overlay');
    if (overlay) overlay.hidden = true;
    if (this._modalEscHandler) {
      document.removeEventListener('keydown', this._modalEscHandler);
    }
  }

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('out');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  escapeAttr(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}
