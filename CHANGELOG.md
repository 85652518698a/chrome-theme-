# Changelog

All notable changes to Brutalist Chrome will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] — 2025-06-01

### Added

- Command palette with fuzzy search (`Ctrl+Shift+P`)
- Smart bookmarks manager with search and folders
- Weather widget for new tab page (OpenWeatherMap integration)
- Clipboard manager with history (last 50 items)
- Todo manager with quick-add (`Ctrl+Shift+Q`)
- Quick notes with sticky note UI
- Session manager — save and restore tab groups
- History viewer with search and date filtering
- Tab manager — search, switch, close tabs
- Sidebar panel with all tools (`Ctrl+Shift+S`)
- Focus mode with configurable block list
- Context search on selected text (`Ctrl+Shift+F`)
- Theme toggle shortcut (`Ctrl+Shift+T`)
- Options page with full settings UI

### Changed

- Upgraded from Manifest V2 to Manifest V3
- Rebuilt architecture with ES modules
- Migrated theme colors to CSS custom properties
- Improved popup UI with category navigation
- Enhanced new tab page with widget grid

### Fixed

- Theme flash on page load (content script now runs at `document_start`)
- Storage race conditions with async queue
- Sidebar state persistence across browser restarts
- Context menu duplication in multi-window setups
- Memory leak in clipboard watcher

### Removed

- Deprecated jQuery dependency (native DOM API only)
- Legacy Manifest V2 polyfills
- Google Analytics (moved to privacy-first local-only model)

---

## [1.0.0] — 2025-03-15

### Added

- Initial release with Manifest V2
- Dark monochrome Chrome theme
- Basic popup with navigation
- New tab page with clock and greeting
- Bookmark search (basic)
- Custom keyboard shortcuts
- Context menu integration
- Options page
- GitHub repository and documentation
- MIT License

### Fixed

- Theme color consistency across Chrome UI surfaces

---

## [0.9.0] — 2025-02-01

### Added

- Beta release for internal testing
- Core theme implementation
- Basic extension scaffolding
- Storage utilities

---

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
