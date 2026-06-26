export class WidgetManager {
  constructor(config = {}) {
    this.widgets = new Map();
    this.order = config.order || [];
    this.settings = config.settings || {};
    this.onReorder = config.onReorder || null;
    this.onToggle = config.onToggle || null;
    this.dragState = null;
  }

  register(id, widget, options = {}) {
    this.widgets.set(id, {
      instance: widget,
      options: {
        title: options.title || id,
        defaultVisible: options.defaultVisible !== false,
        draggable: options.draggable !== false,
        ...options
      }
    });

    if (!this.order.includes(id)) {
      this.order.push(id);
    }
  }

  unregister(id) {
    this.widgets.delete(id);
    this.order = this.order.filter(w => w !== id);
  }

  getWidget(id) {
    return this.widgets.get(id);
  }

  isVisible(id) {
    return !(this.settings.hiddenWidgets || []).includes(id);
  }

  toggle(id) {
    const visible = !this.isVisible(id);
    const widget = this.widgets.get(id);
    if (widget) {
      const container = widget.instance?.container;
      if (container) {
        container.style.display = visible ? '' : 'none';
      }
    }
    if (this.onToggle) {
      this.onToggle(id, visible);
    }
  }

  show(id) {
    if (!this.isVisible(id)) {
      this.toggle(id);
    }
  }

  hide(id) {
    if (this.isVisible(id)) {
      this.toggle(id);
    }
  }

  getVisibleWidgets() {
    return this.order.filter(id => this.isVisible(id) && this.widgets.has(id));
  }

  reorder(fromIndex, toIndex) {
    if (fromIndex < 0 || fromIndex >= this.order.length) return false;
    if (toIndex < 0 || toIndex >= this.order.length) return false;

    const [moved] = this.order.splice(fromIndex, 1);
    this.order.splice(toIndex, 0, moved);

    if (this.onReorder) {
      this.onReorder([...this.order]);
    }

    return true;
  }

  moveUp(id) {
    const index = this.order.indexOf(id);
    if (index > 0) {
      return this.reorder(index, index - 1);
    }
    return false;
  }

  moveDown(id) {
    const index = this.order.indexOf(id);
    if (index < this.order.length - 1) {
      return this.reorder(index, index + 1);
    }
    return false;
  }

  moveToTop(id) {
    const index = this.order.indexOf(id);
    if (index > 0) {
      const [item] = this.order.splice(index, 1);
      this.order.unshift(item);
      if (this.onReorder) this.onReorder([...this.order]);
      return true;
    }
    return false;
  }

  moveToBottom(id) {
    const index = this.order.indexOf(id);
    if (index < this.order.length - 1) {
      const [item] = this.order.splice(index, 1);
      this.order.push(item);
      if (this.onReorder) this.onReorder([...this.order]);
      return true;
    }
    return false;
  }

  initDragAndDrop(containerSelector, itemSelector, handleSelector) {
    const container = document.querySelector(containerSelector);
    if (!container) return;

    container.addEventListener('mousedown', (e) => {
      const handle = handleSelector ? e.target.closest(handleSelector) : e.target;
      const item = e.target.closest(itemSelector);
      if (!item || !handle) return;

      this.dragState = {
        item,
        startX: e.clientX,
        startY: e.clientY,
        offsetX: e.offsetX,
        offsetY: e.offsetY,
        originalIndex: Array.from(container.children).indexOf(item),
        clone: null
      };

      document.addEventListener('mousemove', this._dragMove);
      document.addEventListener('mouseup', this._dragEnd);
    });
  }

  _dragMove = (e) => {
    if (!this.dragState) return;

    const { item, startX, startY } = this.dragState;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      if (!this.dragState.clone) {
        this.dragState.clone = item.cloneNode(true);
        this.dragState.clone.style.position = 'fixed';
        this.dragState.clone.style.pointerEvents = 'none';
        this.dragState.clone.style.zIndex = '1000';
        this.dragState.clone.style.width = item.offsetWidth + 'px';
        this.dragState.clone.style.opacity = '0.8';
        document.body.appendChild(this.dragState.clone);
        item.classList.add('dragging');
      }

      this.dragState.clone.style.left = (e.clientX - this.dragState.offsetX) + 'px';
      this.dragState.clone.style.top = (e.clientY - this.dragState.offsetY) + 'px';

      const container = item.parentElement;
      const children = Array.from(container.children);
      const currentIndex = children.indexOf(item);

      children.forEach((child, i) => {
        if (child !== item) {
          const rect = child.getBoundingClientRect();
          const midY = rect.top + rect.height / 2;
          if (e.clientY > midY && i < currentIndex) {
            container.insertBefore(item, child.nextSibling);
          } else if (e.clientY < midY && i > currentIndex) {
            container.insertBefore(item, child);
          }
        }
      });
    }
  };

  _dragEnd = (e) => {
    if (!this.dragState) return;

    document.removeEventListener('mousemove', this._dragMove);
    document.removeEventListener('mouseup', this._dragEnd);

    const { item, clone, originalIndex } = this.dragState;

    if (clone) {
      clone.remove();
    }
    item.classList.remove('dragging');

    const container = item.parentElement;
    const newIndex = Array.from(container.children).indexOf(item);

    if (originalIndex !== newIndex) {
      const id = item.dataset.widgetId;
      if (id) {
        this.reorder(originalIndex, newIndex);
      }
    }

    this.dragState = null;
  };

  saveState() {
    const state = {
      order: this.order,
      hidden: this.settings.hiddenWidgets || []
    };

    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.sync.set({ widget_state: state });
      } else {
        localStorage.setItem('widget_state', JSON.stringify(state));
      }
    } catch (err) {
      console.error('Failed to save widget state:', err);
    }
  }

  loadState() {
    return new Promise((resolve) => {
      try {
        if (typeof chrome !== 'undefined' && chrome.storage) {
          chrome.storage.sync.get('widget_state', (result) => {
            if (result.widget_state) {
              this.order = result.widget_state.order || this.order;
              if (result.widget_state.hidden) {
                this.settings.hiddenWidgets = result.widget_state.hidden;
              }
            }
            resolve();
          });
        } else {
          const stored = localStorage.getItem('widget_state');
          if (stored) {
            const state = JSON.parse(stored);
            this.order = state.order || this.order;
            if (state.hidden) {
              this.settings.hiddenWidgets = state.hidden;
            }
          }
          resolve();
        }
      } catch {
        resolve();
      }
    });
  }

  destroy() {
    document.removeEventListener('mousemove', this._dragMove);
    document.removeEventListener('mouseup', this._dragEnd);
    this.widgets.clear();
    this.order = [];
    this.dragState = null;
  }
}

export class Widget {
  constructor(config = {}) {
    this.container = config.container || null;
    this.id = config.id || 'widget_' + Math.random().toString(36).slice(2, 9);
    this.options = config.options || {};
    this._mounted = false;
  }

  render() {
    throw new Error('Widget subclass must implement render()');
  }

  mount() {
    this._mounted = true;
    if (this.container) {
      this.container.style.display = '';
    }
  }

  unmount() {
    this._mounted = false;
    if (this.container) {
      this.container.style.display = 'none';
    }
  }

  isMounted() {
    return this._mounted;
  }

  update(options) {
    Object.assign(this.options, options);
    this.render();
  }

  show() {
    this.mount();
  }

  hide() {
    this.unmount();
  }

  destroy() {
    this.unmount();
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}
