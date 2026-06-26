# Privacy Policy

**Last updated: June 2025**

Brutalist Chrome respects your privacy. This document explains what data the extension accesses, how it is used, and your rights.

## Data Collection

Brutalist Chrome collects **no personal data** by default. The extension operates entirely locally within your browser.

### Data Accessed via Chrome Permissions

| Permission | Data Accessed | Purpose |
|------------|--------------|---------|
| `storage` | User preferences, todos, notes, clipboard history, settings | Store extension configuration and user data locally |
| `tabs` | Tab URLs and titles | Tab manager feature — switch/search/close tabs |
| `bookmarks` | Bookmark titles, URLs, folder structure | Bookmark search and management |
| `history` | Browsing history URLs and timestamps | History viewer feature |
| `sessions` | Session data for closed tabs | Session restore functionality |
| `favicon` | Website favicons | Display favicon in bookmark/tab lists |
| `sidePanel` | — | Show the sidebar panel when toggled |
| `notifications` | — | Display desktop notifications for alarms/todos |
| `alarms` | — | Schedule periodic tasks (weather refresh, backups) |
| `contextMenus` | — | Add right-click context menu items |
| `commands` | — | Register keyboard shortcuts |

All data accessed through these APIs is processed **entirely on your local machine**.

## Weather Feature

If you configure the weather widget:

- You must provide your own **OpenWeatherMap API key**
- The extension fetches weather data for the city you specify
- Weather data is fetched via `fetch()` to `api.openweathermap.org`
- **No location data is sent anywhere** except the city name you explicitly type
- Weather responses are cached locally for 10 minutes

## Data Storage

- **All data** is stored using `chrome.storage.local`
- Data never leaves your browser
- Data persists across browser sessions until you uninstall the extension
- Uninstalling the extension **permanently deletes all stored data**
- We do **not** use cookies, tracking pixels, or analytics services

## Third-Party Services

| Service | Data Sent | Purpose |
|---------|-----------|---------|
| OpenWeatherMap | City name + API key (you provide) | Weather widget |
| Google Chrome APIs | As listed in permissions table | Core extension features |

No data is sent to any other third party.

## Data Sharing

**We do not sell, rent, or share your data with anyone.** Period.

- No analytics services
- No tracking scripts
- No telemetry
- No data collection servers
- No advertising

## Changes to This Policy

If this policy changes, the updated version will be posted here with a new "Last updated" date. Since the extension operates offline, no notification will be sent.

## Your Rights

You have the right to:

- **Access** — All your data is visible in the extension UI
- **Delete** — Uninstall the extension to remove all data
- **Export** — Data can be exported via the options page (backup feature)
- **Control** — Disable any feature in the options page that accesses sensitive data

## Contact

For privacy concerns or questions:

- **GitHub Issues**: [https://github.com/yourusername/Brutalist-Chrome/issues](https://github.com/yourusername/Brutalist-Chrome/issues)
- **Email**: privacy@brutalist-chrome.dev (placeholder)

---

*Brutalist Chrome — Privacy first, always.*
