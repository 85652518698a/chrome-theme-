export class TodoManager {
  constructor(config = {}) {
    this.container = config.container || null;
    this.todos = [];
    this.storageKey = 'newtab_todos';
  }

  async load() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await chrome.storage.sync.get(this.storageKey);
        this.todos = result[this.storageKey] || [];
      } else {
        const stored = localStorage.getItem(this.storageKey);
        this.todos = stored ? JSON.parse(stored) : [];
      }
    } catch {
      this.todos = [];
    }

    if (!Array.isArray(this.todos)) this.todos = [];
    return this.todos;
  }

  async save() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        await chrome.storage.sync.set({ [this.storageKey]: this.todos });
      } else {
        localStorage.setItem(this.storageKey, JSON.stringify(this.todos));
      }
    } catch (err) {
      console.error('Failed to save todos:', err);
    }
  }

  async add(text) {
    const todo = {
      id: 'todo_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
      text: text.trim(),
      completed: false,
      createdAt: Date.now()
    };

    this.todos.unshift(todo);
    await this.save();
    return todo;
  }

  async toggle(id) {
    this.todos = this.todos.map(t => {
      if (t.id === id) {
        return { ...t, completed: !t.completed };
      }
      return t;
    });
    await this.save();
  }

  async remove(id) {
    this.todos = this.todos.filter(t => t.id !== id);
    await this.save();
  }

  async clearCompleted() {
    this.todos = this.todos.filter(t => !t.completed);
    await this.save();
  }

  getActive() {
    return this.todos.filter(t => !t.completed);
  }

  getCompleted() {
    return this.todos.filter(t => t.completed);
  }
}

export class NotesManager {
  constructor(config = {}) {
    this.container = config.container || null;
    this.notes = '';
    this.storageKey = 'newtab_notes';
    this.saveTimeout = null;
  }

  async load() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await chrome.storage.sync.get(this.storageKey);
        this.notes = result[this.storageKey] || '';
      } else {
        this.notes = localStorage.getItem(this.storageKey) || '';
      }
    } catch {
      this.notes = '';
    }
    return this.notes;
  }

  async save(text) {
    this.notes = text;

    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        await chrome.storage.sync.set({ [this.storageKey]: text });
      } else {
        localStorage.setItem(this.storageKey, text);
      }
    } catch (err) {
      console.error('Failed to save notes:', err);
    }
  }

  debouncedSave(text) {
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      this.save(text);
      this.saveTimeout = null;
    }, 800);
  }
}

export class PomodoroTimer {
  constructor(config = {}) {
    this.container = config.container || null;
    this.workDuration = config.workDuration || 25 * 60;
    this.breakDuration = config.breakDuration || 5 * 60;
    this.longBreakDuration = config.longBreakDuration || 15 * 60;
    this.remaining = this.workDuration;
    this.state = 'idle';
    this.phase = 'work';
    this.sessionCount = 0;
    this.interval = null;
    this.onTick = config.onTick || null;
    this.onPhaseChange = config.onPhaseChange || null;
  }

  start() {
    if (this.state === 'running') return;

    if (this.state === 'idle' || this.state === 'paused') {
      this.state = 'running';
      this.interval = setInterval(() => this.tick(), 1000);
    }
  }

  pause() {
    if (this.state === 'running') {
      this.state = 'paused';
      if (this.interval) {
        clearInterval(this.interval);
        this.interval = null;
      }
    }
  }

  resume() {
    if (this.state === 'paused') {
      this.state = 'running';
      this.interval = setInterval(() => this.tick(), 1000);
    }
  }

  toggle() {
    if (this.state === 'running') {
      this.pause();
    } else {
      if (this.state === 'idle') {
        this.reset();
      }
      this.start();
    }
  }

  reset() {
    this.pause();
    this.state = 'idle';
    this.phase = 'work';
    this.remaining = this.workDuration;
    if (this.onTick) this.onTick(this.getTime(), this.phase);
  }

  tick() {
    if (this.remaining <= 0) {
      this.handlePhaseComplete();
      return;
    }

    this.remaining--;
    if (this.onTick) this.onTick(this.getTime(), this.phase);
  }

  handlePhaseComplete() {
    this.pause();

    if (this.phase === 'work') {
      this.sessionCount++;
      if (this.sessionCount % 4 === 0) {
        this.phase = 'longBreak';
        this.remaining = this.longBreakDuration;
      } else {
        this.phase = 'break';
        this.remaining = this.breakDuration;
      }
    } else {
      this.phase = 'work';
      this.remaining = this.workDuration;
    }

    if (this.onPhaseChange) this.onPhaseChange(this.phase, this.sessionCount);
    this.state = 'idle';
  }

  getTime() {
    const mins = Math.floor(this.remaining / 60);
    const secs = this.remaining % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  getPhaseLabel() {
    const labels = {
      work: 'Focus Time',
      break: 'Short Break',
      longBreak: 'Long Break'
    };
    return labels[this.phase] || 'Focus Time';
  }

  setWorkDuration(minutes) {
    this.workDuration = minutes * 60;
    if (this.state === 'idle') {
      this.remaining = this.workDuration;
    }
  }

  setBreakDuration(minutes) {
    this.breakDuration = minutes * 60;
  }

  destroy() {
    this.pause();
    this.container = null;
  }
}

export class ProductivityDashboard {
  constructor(config = {}) {
    this.todoContainer = config.todoContainer || null;
    this.notesContainer = config.notesContainer || null;
    this.sidebarContent = config.sidebarContent || null;

    this.todoManager = new TodoManager();
    this.notesManager = new NotesManager();
    this.pomodoro = new PomodoroTimer({
      onTick: (time, phase) => this.updatePomodoroDisplay(time, phase),
      onPhaseChange: (phase, sessionCount) => this.handlePomodoroPhaseChange(phase, sessionCount)
    });
  }

  async render() {
    this.renderTodo();
    this.renderNotes();
    this.renderPomodoro();

    await this.todoManager.load();
    this.renderTodoList();

    const notes = await this.notesManager.load();
    this.setNotesContent(notes);
  }

  renderTodo() {
    if (!this.todoContainer) return;

    this.todoContainer.innerHTML = `
      <div class="todo-input-wrapper">
        <input type="text" class="todo-input" id="todo-input" placeholder="Add a new task..." autocomplete="off">
        <button class="todo-add-btn" id="todo-add-btn">Add</button>
      </div>
      <ul class="todo-list" id="todo-list">
        <li class="todo-empty">No tasks yet. Add one above.</li>
      </ul>
    `;

    const input = document.getElementById('todo-input');
    const addBtn = document.getElementById('todo-add-btn');

    const addTodo = async () => {
      const text = input.value.trim();
      if (!text) return;
      await this.todoManager.add(text);
      input.value = '';
      this.renderTodoList();
      input.focus();
    };

    addBtn.addEventListener('click', addTodo);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') addTodo();
    });

    setTimeout(() => input.focus(), 100);
  }

  async renderTodoList() {
    const list = document.getElementById('todo-list');
    if (!list) return;

    const todos = this.todoManager.todos;

    if (!todos || todos.length === 0) {
      list.innerHTML = '<li class="todo-empty">No tasks yet. Add one above.</li>';
      return;
    }

    const activeTodos = todos.filter(t => !t.completed);
    const completedTodos = todos.filter(t => t.completed);

    list.innerHTML = [
      ...activeTodos.map(t => this.createTodoItem(t)),
      ...(completedTodos.length > 0 ? [
        `<li style="padding:4px 0;font-size:0.7rem;color:var(--text-secondary);opacity:0.4;text-transform:uppercase;letter-spacing:0.08em;">Completed</li>`,
        ...completedTodos.map(t => this.createTodoItem(t))
      ] : [])
    ].join('');

    list.querySelectorAll('.todo-checkbox').forEach(cb => {
      cb.addEventListener('click', async () => {
        await this.todoManager.toggle(cb.dataset.id);
        this.renderTodoList();
      });
    });

    list.querySelectorAll('.todo-delete-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        await this.todoManager.remove(btn.dataset.id);
        this.renderTodoList();
      });
    });
  }

  createTodoItem(todo) {
    return `
      <li class="todo-item" data-id="${todo.id}">
        <button class="todo-checkbox ${todo.completed ? 'checked' : ''}" data-id="${todo.id}"></button>
        <span class="todo-text ${todo.completed ? 'completed' : ''}">${this.escapeHtml(todo.text)}</span>
        <button class="todo-delete-btn" data-id="${todo.id}" title="Delete task">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
        </button>
      </li>
    `;
  }

  renderNotes() {
    if (!this.notesContainer) return;

    this.notesContainer.innerHTML = `
      <textarea class="notes-textarea" id="notes-textarea" placeholder="Write your notes here..." spellcheck="true"></textarea>
      <div class="notes-saved-indicator" id="notes-saved-indicator">Auto-saved</div>
    `;

    const textarea = document.getElementById('notes-textarea');

    textarea.addEventListener('input', () => {
      const indicator = document.getElementById('notes-saved-indicator');
      indicator.textContent = 'Saving...';
      indicator.classList.remove('saved');
      this.notesManager.debouncedSave(textarea.value);
    });

    textarea.addEventListener('blur', async () => {
      await this.notesManager.save(textarea.value);
      const indicator = document.getElementById('notes-saved-indicator');
      indicator.textContent = 'Saved';
      indicator.classList.add('saved');
    });
  }

  setNotesContent(text) {
    const textarea = document.getElementById('notes-textarea');
    if (textarea) {
      textarea.value = text;
    }
  }

  renderPomodoro() {
    if (!this.sidebarContent) return;

    const pomodoroWidget = document.createElement('div');
    pomodoroWidget.className = 'sidebar-widget';
    pomodoroWidget.id = 'pomodoro-widget';

    pomodoroWidget.innerHTML = `
      <div class="sidebar-widget-title">Pomodoro</div>
      <div class="pomodoro-display">
        <div class="pomodoro-timer">${this.pomodoro.getTime()}</div>
        <div class="pomodoro-phase">${this.pomodoro.getPhaseLabel()}</div>
        <div class="pomodoro-controls">
          <button class="pomodoro-btn" id="pomodoro-start-btn">Start</button>
          <button class="pomodoro-btn" id="pomodoro-reset-btn">Reset</button>
        </div>
      </div>
    `;

    const sidebarFirstChild = this.sidebarContent.firstChild;
    if (sidebarFirstChild) {
      this.sidebarContent.insertBefore(pomodoroWidget, sidebarFirstChild);
    } else {
      this.sidebarContent.appendChild(pomodoroWidget);
    }

    const startBtn = document.getElementById('pomodoro-start-btn');
    const resetBtn = document.getElementById('pomodoro-reset-btn');

    startBtn.addEventListener('click', () => {
      this.pomodoro.toggle();
      startBtn.textContent = this.pomodoro.state === 'running' ? 'Pause' : 'Start';
      startBtn.classList.toggle('active', this.pomodoro.state === 'running');
    });

    resetBtn.addEventListener('click', () => {
      this.pomodoro.reset();
      startBtn.textContent = 'Start';
      startBtn.classList.remove('active');
    });
  }

  updatePomodoroDisplay(time, phase) {
    const timerEl = document.getElementById('pomodoro-widget')?.querySelector('.pomodoro-timer');
    const phaseEl = document.getElementById('pomodoro-widget')?.querySelector('.pomodoro-phase');

    if (timerEl) timerEl.textContent = time;
    if (phaseEl) {
      const labels = {
        work: 'Focus Time',
        break: 'Short Break',
        longBreak: 'Long Break'
      };
      phaseEl.textContent = labels[phase] || 'Focus Time';
    }

    if (this.pomodoro.state === 'running') {
      document.title = `${time} - Focus`;
    } else {
      document.title = 'New Tab';
    }
  }

  handlePomodoroPhaseChange(phase, sessionCount) {
    const startBtn = document.getElementById('pomodoro-start-btn');
    if (startBtn) {
      startBtn.textContent = 'Start';
      startBtn.classList.remove('active');
    }

    if (phase === 'break' || phase === 'longBreak') {
      this.showNotification('Take a break!', `You've completed ${sessionCount} session(s). Time to rest.`);
    } else {
      this.showNotification('Break over!', 'Time to focus.');
    }

    document.title = 'New Tab';
  }

  showNotification(title, message) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body: message, icon: 'icons/icon48.png' });
    } else if ('Notification' in window && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }

    const container = document.getElementById('toast-container');
    if (container) {
      const toast = document.createElement('div');
      toast.className = 'toast info';
      toast.innerHTML = `<strong>${this.escapeHtml(title)}</strong> ${this.escapeHtml(message)}`;
      container.appendChild(toast);
      setTimeout(() => {
        toast.classList.add('out');
        setTimeout(() => toast.remove(), 300);
      }, 4000);
    }
  }

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}
