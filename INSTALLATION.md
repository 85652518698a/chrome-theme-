# Installation Guide

## Prerequisites

- **Google Chrome** (version 88 or later — required for Manifest V3)
- **Developer Mode** enabled in Chrome (for unpacked installation)

---

## Method 1: Load Unpacked (Development)

### Step 1 — Clone or Download

```bash
git clone https://github.com/yourusername/Brutalist-Chrome.git
cd Brutalist-Chrome
```

Or download and extract the [latest release ZIP](https://github.com/yourusername/Brutalist-Chrome/releases).

### Step 2 — Install Dependencies

```bash
npm install
```

### Step 3 — Build

```bash
npm run build
```

This compiles the extension and theme into the `dist/` directory.

### Step 4 — Load in Chrome

1. Open Chrome and navigate to `chrome://extensions`
2. Enable **Developer Mode** (toggle in top-right corner)
3. Click **Load Unpacked**
4. Select the `dist/` directory from the project folder

![Load Unpacked Screenshot](docs/screenshots/screenshot-load-unpacked.png)

### Step 5 — Verify Installation

- The Brutalist Chrome icon should appear in the Chrome toolbar
- Open a new tab to see the themed new tab page
- Press `Ctrl+Shift+K` to open the popup
- Press `Ctrl+Shift+S` to toggle the sidebar

---

## Method 2: Chrome Web Store (Recommended)

> Coming soon — the extension is pending Chrome Web Store review.

Once published:

1. Visit the Chrome Web Store listing (link TBD)
2. Click **Add to Chrome**
3. Confirm the permissions dialog
4. The extension will install automatically

![Chrome Web Store Screenshot](docs/screenshots/screenshot-webstore.png)

---

## Configuration Guide

### Opening Settings

- Right-click the toolbar icon → **Options**
- Or navigate to `chrome://extensions` → Brutalist Chrome → **Details** → **Extension options**

### Available Settings

| Setting | Description | Default |
|---------|-------------|---------|
| Theme | Toggle between dark and light variants | Dark |
| Background Image | Custom URL for new tab background | None |
| Weather Location | City for weather widget (requires API key) | London |
| OpenWeatherMap API Key | Your API key for weather data | — |
| Custom CSS | Inject custom CSS overrides | — |
| Shortcuts | Remap keyboard shortcuts | Default |
| Sidebar Default | Show sidebar on new tab open | Off |
| Focus Mode | URL block list for focus mode | — |

---

## Troubleshooting

### Extension not loading

- Ensure you selected the `dist/` folder, not the project root
- Check that the manifest.json is valid JSON
- Verify Chrome version is 88+
- Disable conflicting extensions

### Theme not applying

- Restart Chrome after installation
- Check `chrome://extensions` for any errors
- Try toggling the theme with `Ctrl+Shift+T`

### Commands not working

- Visit `chrome://extensions/shortcuts` to verify keybindings
- Ensure no other extension is using the same shortcut
- Reset shortcuts to default in options

### Weather widget not showing

- Obtain a free API key from [OpenWeatherMap](https://openweathermap.org/api)
- Enter the key in extension options
- Set a valid city name

### Build errors

```bash
# Clear node modules and rebuild
rm -rf node_modules dist
npm install
npm run build
```

---

## Uninstallation

### From Chrome Web Store

1. Right-click the extension icon → **Remove from Chrome…**
2. Confirm removal

### From Loaded Unpacked

1. Navigate to `chrome://extensions`
2. Find **Brutalist Chrome**
3. Click **Remove**

All local data (settings, todos, notes, clipboard history) will be deleted on removal.

---

## FAQ

**Q: Is this extension free?**  
A: Yes, Brutalist Chrome is open source under the MIT license.

**Q: Does it collect my data?**  
A: No. All data is stored locally in your browser. See [PRIVACY.md](PRIVACY.md).

**Q: Can I change the accent color?**  
A: Yes. Open the options page and use the color picker or set a custom hex value.

**Q: Does it work in Edge/Opera/Brave?**  
A: Yes, any Chromium-based browser that supports Manifest V3.

**Q: How do I update the extension?**  
A: For unpacked installation, pull the latest code and rebuild. Web Store version updates automatically.

**Q: Can I contribute?**  
A: Absolutely! See [CONTRIBUTING.md](CONTRIBUTING.md).
