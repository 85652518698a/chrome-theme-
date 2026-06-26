# Brutalist Chrome

![Chrome Web Store](https://img.shields.io/badge/Chrome-Extension-2a2a2a?style=for-the-badge&logo=google-chrome&logoColor=c4a882)
![Version](https://img.shields.io/badge/version-2.0.0-c4a882?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-1a1a1a?style=for-the-badge)
![Downloads](https://img.shields.io/badge/downloads-1.5k+-c4a882?style=for-the-badge)
![Stars](https://img.shields.io/badge/stars-★★★★☆-c4a882?style=for-the-badge)

> A premium Chrome customization combining a dark monochrome theme and Manifest V3 extension with brutalist design principles and warm gold accents.

![Demo Preview](docs/screenshots/screenshot-main.png)

## Color Palette

```
▉ Background  #111111    ▉ Surface     #222222    ▉ Primary     #1a1a1a
▉ Secondary   #2a2a2a    ▉ Border      #333333    ▉ Text        #f0ece4
▉ TextSecondary #a09888  ▉ Accent      #c4a882    ▉ AccentLight #d4c4a8
▉ AccentDark  #a08860
```

## Features

- 🎨 **Dark Monochrome Theme** — Full Chrome theme with brutalist aesthetic
- ⚡ **Command Palette** — Quick access to all features via `Ctrl+Shift+P`
- 📌 **Smart Bookmarks** — Search, organize, and jump to bookmarks instantly
- 🌤️ **Weather Widget** — Live weather on your new tab page
- 📋 **Clipboard Manager** — History of copied items with quick-paste
- ✅ **Todo Manager** — Inline todo list with quick-add (`Ctrl+Shift+Q`)
- 📝 **Quick Notes** — Sticky notes that persist across sessions
- 🔍 **Context Search** — Select text anywhere and search (`Ctrl+Shift+F`)
- 📂 **Session Manager** — Save and restore tab sessions
- 📊 **History Viewer** — Browse and search browsing history
- 📎 **Tab Manager** — Search, switch, and close tabs from one panel
- 🧩 **Sidebar Panel** — Persistent sidebar with all tools (`Ctrl+Shift+S`)
- ⌨️ **Custom Shortcuts** — Fully configurable keyboard commands
- 🎯 **Focus Mode** — Distraction-free browsing
- 🔒 **Privacy First** — All data stored locally, no tracking

## Quick Start

```bash
# Clone the repository
git clone https://github.com/yourusername/Brutalist-Chrome.git

# Install dependencies
cd Brutalist-Chrome
npm install

# Build the extension
npm run build

# Load in Chrome
# Navigate to chrome://extensions → Enable Developer Mode → Load Unpacked
# Select the dist/ directory
```

For detailed installation instructions, see [INSTALLATION.md](INSTALLATION.md).

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+K` | Open popup |
| `Ctrl+Shift+S` | Toggle sidebar |
| `Ctrl+Shift+T` | Toggle theme |
| `Ctrl+Shift+P` | Open command palette |
| `Ctrl+Shift+F` | Search selected text |
| `Ctrl+Shift+Q` | Quick add todo |

## Architecture

```
┌────────────────────────────────────────────────┐
│                 Chrome Browser                  │
│  ┌──────────────────────────────────────────┐  │
│  │         Brutalist Chrome Extension       │  │
│  │  ┌─────────┐ ┌──────────┐ ┌──────────┐  │  │
│  │  │ Service  │ │ Content  │ │  Popup/  │  │  │
│  │  │ Worker   │ │ Scripts  │ │  Sidebar │  │  │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘  │  │
│  │       │            │            │         │  │
│  │  ┌────┴────────────┴────────────┴─────┐  │  │
│  │  │          Storage API               │  │  │
│  │  │  (chrome.storage.local)            │  │  │
│  │  └────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────┐  │
│  │         Chrome Theme (manifest.json)     │  │
│  │  Dark monochrome palette + gold accents  │  │
│  └──────────────────────────────────────────┘  │
└────────────────────────────────────────────────┘
```

## Built With

- **Manifest V3** — Latest Chrome extension platform
- **CSS Custom Properties** — Dynamic theming via CSS variables
- **JavaScript (ES Modules)** — Modular architecture
- **Chrome APIs** — storage, tabs, bookmarks, history, sidePanel, commands
- **OpenWeatherMap API** — Weather data (optional, user-configured)
- **npm** — Build tooling and dependency management

## Project Structure

```
Brutalist-Chrome/
├── assets/                  # Shared assets (icons, images)
├── dist/                    # Build output
├── docs/                    # Documentation
│   ├── screenshots/         # Screenshot files
│   ├── architecture.md      # Architecture docs
│   ├── customization-guide.md
│   └── chrome-web-store-description.md
├── extension/               # Extension source
│   ├── assets/              # Extension icons
│   ├── commands/            # Command handlers
│   ├── contextMenus/        # Context menu logic
│   ├── options/             # Options page
│   ├── popup/               # Popup UI
│   ├── sidebar/             # Sidebar panel
│   ├── storage/             # Storage layer
│   ├── utils/               # Utilities
│   ├── background.js        # Service worker
│   ├── content.js           # Content script
│   └── manifest.json        # Extension manifest
├── newtab/                  # New tab page
├── scripts/                 # Build scripts
├── theme/                   # Chrome theme files
├── CHANGELOG.md
├── CONTRIBUTING.md
├── INSTALLATION.md
├── LICENSE
├── PRIVACY.md
├── README.md
└── package.json
```

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

Distributed under the MIT License. See [LICENSE](LICENSE) for more information.

---

<p align="center">
  <a href="https://chrome.google.com/webstore">
    <img src="https://img.shields.io/badge/Available_on-Chrome_Web_Store-c4a882?style=for-the-badge&logo=google-chrome&logoColor=white" alt="Chrome Web Store">
  </a>
</p>
