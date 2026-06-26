# Architecture

## High-Level Overview

Brutalist Chrome is a Manifest V3 Chrome extension composed of three runtime environments that communicate through Chrome's extension messaging APIs:

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CHROME BROWSER                               │
│                                                                     │
│  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐   │
│  │  Service Worker  │   │  Content Script │   │  Popup/Sidebar  │   │
│  │  (background.js) │   │  (content.js)   │   │  (UI Pages)     │   │
│  │                  │   │                 │   │                 │   │
│  │  • Commands      │   │  • Theme inject │   │  • Bookmarks    │   │
│  │  • Events        │◄──┤  • DOM observe  │◄──┤  • Tabs         │   │
│  │  • Alarms        │   │  • Selection    │   │  • History      │   │
│  │  • Context menus │   │  • Clipboard    │   │  • Todos        │   │
│  │  • Storage       │   │                 │   │  • Notes        │   │
│  │  • Side panel    │   │                 │   │  • Weather      │   │
│  └────────┬─────────┘   └─────────────────┘   └────────┬─────────┘   │
│           │                                            │            │
│           └──────────────────┬─────────────────────────┘            │
│                              │                                      │
│                    ┌─────────▼─────────┐                            │
│                    │  chrome.storage   │                            │
│                    │  (local)          │                            │
│                    └───────────────────┘                            │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    Chrome Theme                              │   │
│  │  (theme/manifest.json — dark palette + gold accent colors)   │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Component Tree

```
Brutalist Chrome
├── Service Worker (background.js)
│   ├── CommandRouter
│   │   ├── ToggleThemeCommand
│   │   ├── ToggleSidebarCommand
│   │   ├── OpenCommandPaletteCommand
│   │   ├── SearchSelectionCommand
│   │   └── QuickAddTodoCommand
│   ├── EventManager
│   │   ├── TabEvents (created, updated, removed, activated)
│   │   ├── BookmarkEvents (created, removed, changed)
│   │   ├── HistoryEvents (visited)
│   │   └── StorageEvents (changed)
│   ├── ContextMenuManager
│   │   ├── SearchSelection
│   │   ├── SaveToNotes
│   │   ├── CopyAsMarkdown
│   │   └── OpenInSidebar
│   ├── AlarmManager
│   │   ├── WeatherRefresh
│   │   └── DataBackup
│   └── MessageRouter
│       ├── BookmarksModule
│       ├── TabsModule
│       ├── HistoryModule
│       ├── SessionsModule
│       ├── TodosModule
│       ├── NotesModule
│       ├── ClipboardModule
│       ├── WeatherModule
│       ├── SettingsModule
│       └── ThemeModule
│
├── Content Script (content.js)
│   ├── ThemeInjector
│   │   └── CSS variable injection on page load
│   ├── SelectionWatcher
│   │   └── Captures selected text for context search
│   ├── ClipboardWatcher
│   │   └── Monitors copy events for clipboard history
│   └── FocusModeController
│       └── Blocks distracting sites
│
├── Popup (popup/popup.html)
│   ├── PopupRouter
│   ├── BookmarkView
│   ├── TabView
│   ├── HistoryView
│   ├── SessionView
│   ├── TodoView
│   ├── NoteView
│   ├── ClipboardView
│   └── SearchBar
│
├── Sidebar (sidebar/sidebar.html)
│   └── Same component tree as popup (full-width layout)
│
├── Options (options/options.html)
│   ├── ThemeSettings
│   ├── ShortcutSettings
│   ├── WeatherSettings
│   ├── FocusModeSettings
│   ├── CustomCSSEditor
│   └── DataManagement
│
├── New Tab Page (newtab/)
│   ├── ClockWidget
│   ├── WeatherWidget
│   ├── GreetingWidget
│   ├── QuickLinks
│   └── TodoWidget
│
└── Storage Layer (storage/)
    ├── StorageManager
    ├── MigrationService
    └── BackupService
```

---

## Data Flow Diagrams

### Command Flow (e.g., Toggle Sidebar)

```
User presses Ctrl+Shift+S
        │
        ▼
Chrome commands API
        │
        ▼
Service Worker: CommandRouter
        │
        ▼
toggle-sidebar handler
        │
        ├──► Read current state from chrome.storage.local
        │
        ├──► Toggle state
        │
        ├──► Write new state to chrome.storage.local
        │
        └──► Send message to popup/sidebar:
             { action: "sidebar:toggle", enabled: true/false }
                    │
                    ▼
             Sidebar/UI updates visibility
```

### Weather Data Flow

```
Options Page: User enters city + API key
        │
        ▼
chrome.storage.local: { weather: { city, apiKey, ... } }
        │
        ▼
AlarmManager fires "weather-refresh" (every 30 min)
        │
        ▼
WeatherModule reads city + apiKey from storage
        │
        ▼
fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}`)
        │
        ▼
Response parsed → cached to storage
        │
        ▼
Message sent to newtab: { action: "weather:updated", data: {...} }
        │
        ▼
New tab weather widget re-renders
```

### Bookmark Search Flow

```
User opens popup/sidebar → types query in search bar
        │
        ▼
Message sent to service worker:
{ action: "bookmarks:search", query: "..." }
        │
        ▼
BookmarksModule calls chrome.bookmarks.getTree()
        │
        ▼
Flattens tree → filters by title/URL match
        │
        ▼
Response returned to popup/sidebar
        │
        ▼
UI renders filtered bookmark list
```

---

## Module Responsibilities

| Module | File | Responsibility |
|--------|------|----------------|
| **CommandRouter** | `commands/commandRouter.js` | Maps keyboard shortcuts to command handlers |
| **BookmarksModule** | `background.js` | Search, create, delete, move bookmarks |
| **TabsModule** | `background.js` | Query, switch, close, move tabs |
| **HistoryModule** | `background.js` | Query history by date/keyword |
| **SessionsModule** | `background.js` | Save/restore tab sessions |
| **TodosModule** | `background.js` | CRUD for todo items |
| **NotesModule** | `background.js` | CRUD for sticky notes |
| **ClipboardModule** | `background.js` | Store/retrieve clipboard history |
| **WeatherModule** | `background.js` | Fetch and cache weather data |
| **ThemeModule** | `background.js` | Apply/remove theme overrides |
| **StorageManager** | `storage/storageManager.js` | Read/write abstraction layer |
| **MigrationService** | `storage/migrationService.js` | Schema migration between versions |
| **ContextMenuManager** | `contextMenus/contextMenus.js` | Build and handle context menus |
| **ThemeInjector** | `content.js` | Inject CSS variables into pages |
| **FocusModeController** | `content.js` | Block specified URLs |

---

## Communication Patterns

### Pattern 1: Service Worker ↔ UI Pages (Popup/Sidebar/Options)

All communication uses `chrome.runtime.sendMessage()` and `chrome.runtime.onMessage`:

```js
// UI page → Service Worker
const response = await chrome.runtime.sendMessage({
  action: "bookmarks:search",
  query: "github"
});

// Service Worker handles
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case "bookmarks:search":
      const results = await searchBookmarks(message.query);
      sendResponse(results);
      break;
  }
  return true; // Keep channel open for async response
});
```

### Pattern 2: UI Pages ↔ UI Pages (via Service Worker relay)

Popup and new tab do not communicate directly — all messages route through the service worker.

### Pattern 3: Content Script → Service Worker

```js
// content.js
chrome.runtime.sendMessage({
  action: "clipboard:save",
  text: window.getSelection().toString()
});
```

---

## Storage Schema

All data is stored in `chrome.storage.local` under a single key per domain:

```json
{
  "settings": {
    "theme": "dark",
    "sidebarDefault": false,
    "focusMode": false,
    "weatherCity": "London",
    "weatherApiKey": "—",
    "customCSS": "",
    "version": "2.0.0"
  },

  "shortcuts": {
    "toggle-sidebar": "Ctrl+Shift+S",
    "toggle-theme": "Ctrl+Shift+T",
    "open-command-palette": "Ctrl+Shift+P",
    "search-selection": "Ctrl+Shift+F",
    "quick-add-todo": "Ctrl+Shift+Q"
  },

  "todos": [
    {
      "id": "uuid-1",
      "text": "Review PR",
      "done": false,
      "createdAt": "2025-06-01T10:00:00Z"
    }
  ],

  "notes": [
    {
      "id": "uuid-2",
      "title": "Meeting notes",
      "content": "Discussed Q3 roadmap...",
      "color": "#2a2a2a",
      "position": { "x": 100, "y": 200 },
      "updatedAt": "2025-06-01T12:00:00Z"
    }
  ],

  "clipboard": [
    {
      "text": "Copied text here",
      "timestamp": "2025-06-01T12:05:00Z"
    }
  ],

  "sessions": [
    {
      "id": "uuid-3",
      "name": "Dev setup",
      "tabs": [
        { "url": "https://github.com", "title": "GitHub" },
        { "url": "https://stackoverflow.com", "title": "Stack Overflow" }
      ],
      "savedAt": "2025-06-01T11:00:00Z"
    }
  ],

  "weather": {
    "city": "London",
    "temperature": 18,
    "condition": "Clouds",
    "icon": "04d",
    "cachedAt": "2025-06-01T12:30:00Z"
  },

  "focusBlocklist": [
    "reddit.com",
    "twitter.com",
    "youtube.com"
  ],

  "backup": {
    "lastBackup": "2025-06-01T00:00:00Z",
    "autoBackupEnabled": true,
    "intervalDays": 7
  }
}
```

---

## Security Considerations

### Permissions

- Request only the minimum permissions required
- `<all_urls>` host permission is needed for content script injection and clipboard monitoring on every page
- Host permissions are declared in `manifest.json` and explained during installation

### API Key Handling

- OpenWeatherMap API key is stored in `chrome.storage.local` (encrypted at rest by Chrome)
- API key is never sent anywhere except the OpenWeatherMap API
- Users should use a dedicated API key with restricted quotas

### Data Isolation

- `chrome.storage.local` is sandboxed per extension
- Content scripts run in an isolated world — no access to page JavaScript variables
- Service worker has no DOM access, reducing XSS surface

### No Remote Code

- All code is bundled in the extension package
- No eval(), no remote script loading
- Content Security Policy enforced via manifest

---

## Performance Considerations

### Service Worker Lifecycle

- Manifest V3 service workers are event-driven and terminate after 30s of inactivity
- Use `chrome.storage.session` for hot data to avoid cold starts
- Alarm-based refresh (weather) rather than continuous polling

### Storage Optimization

- Batch storage writes using debounced queues
- Cache weather responses for 10 minutes
- Clipboard history limited to 50 entries
- Session backup runs at most once per hour

### UI Performance

- Virtual scrolling for long lists (bookmarks, history)
- Debounced search inputs (300ms delay)
- Lazy-loaded widget initialization on new tab
- CSS animations use `transform` and `opacity` only
- Theme injection uses a style element rather than per-element styling

### Bundle Size

- No external UI frameworks — vanilla JS and CSS
- Icons are SVGs where possible (smaller than PNG)
- Background images lazy-loaded

---

## File Map

```
extension/
├── background.js            # Service worker entry — command router, event handlers, message router
├── content.js               # Content script — ThemeInjector, SelectionWatcher, ClipboardWatcher
├── manifest.json            # Extension manifest (Manifest V3)
├── commands/
│   └── commandRouter.js     # Maps shortcut IDs → handler functions
├── contextMenus/
│   └── contextMenus.js      # Build and respond to right-click menus
├── popup/
│   ├── popup.html           # Popup shell
│   ├── popup.css            # Popup styles
│   └── popup.js             # Popup logic
├── sidebar/
│   ├── sidebar.html         # Sidebar shell
│   ├── sidebar.css          # Sidebar styles
│   └── sidebar.js           # Sidebar logic
├── options/
│   ├── options.html         # Settings page
│   ├── options.css          # Settings styles
│   └── options.js           # Settings logic
├── storage/
│   ├── storageManager.js    # Read/write abstraction
│   └── migrationService.js  # Schema migrations
├── utils/
│   ├── debounce.js          # Debounce utility
│   ├── uuid.js              # UUID generator
│   └── formatters.js        # Date/number formatters
└── assets/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```
