# Customization Guide

Brutalist Chrome is designed to be deeply customizable. This guide covers everything from simple color tweaks to creating custom widgets.

## Table of Contents

1. [Changing Colors](#changing-colors)
2. [Replacing Background Image](#replacing-background-image)
3. [Custom Fonts](#custom-fonts)
4. [CSS Variables Reference](#css-variables-reference)
5. [JavaScript API](#javascript-api)
6. [Creating Custom Widgets](#creating-custom-widgets)
7. [Theme Gallery Ideas](#theme-gallery-ideas)

---

## Changing Colors

### Via Options Page

1. Open the options page (right-click icon → **Options**)
2. Navigate to **Theme Settings**
3. Pick new colors using the color picker
4. Changes apply immediately

### Via Custom CSS

For finer control, use the **Custom CSS** editor in options:

```css
/* Change the accent color */
:root {
  --bc-accent: #ff6b6b;
  --bc-accent-light: #ff9f9f;
  --bc-accent-dark: #cc5555;
}

/* Change the background gradient */
.bc-newtab {
  background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
}
```

### Via Theme File

Edit `theme/manifest.json` directly:

```json
{
  "theme": {
    "colors": {
      "frame":            [26, 26, 26],
      "toolbar":          [42, 42, 42],
      "tab_text":         [240, 236, 228],
      "tab_background_text": [160, 152, 136],
      "bookmark_text":    [240, 236, 228],
      "ntp_background":   [17, 17, 17],
      "ntp_text":         [240, 236, 228],
      "button_background": [196, 168, 130]
    }
  }
}
```

---

## Replacing Background Image

### New Tab Background

1. Go to **Options** → **New Tab**
2. Enter a URL to an image (must be HTTPS)
3. Recommended: use high-contrast, low-noise images
4. Supports JPG, PNG, WebP, and SVG

### Example Background URLs

- Abstract geometric patterns
- Dark monochrome photographs
- Minimalist line art
- Brutalist architecture photography

```css
/* Or via custom CSS */
.bc-newtab {
  background-image: url('https://example.com/your-image.jpg');
  background-size: cover;
  background-position: center;
}
```

---

## Custom Fonts

### Built-in Options

- **System Font Stack** (default) — `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- **Monospace** — `"JetBrains Mono", "Fira Code", "Cascadia Code", monospace`
- **Serif** — `"Georgia", "Playfair Display", serif`

### Setting a Custom Font

In options → **Custom CSS**:

```css
:root {
  --bc-font-family: "JetBrains Mono", monospace;
  --bc-font-size: 14px;
  --bc-heading-font: "Playfair Display", serif;
}

/* Or import from Google Fonts */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap');

:root {
  --bc-font-family: "Inter", sans-serif;
}
```

---

## CSS Variables Reference

All theme variables use the `--bc-*` prefix.

### Core Colors

| Variable | Default | Description |
|----------|---------|-------------|
| `--bc-primary` | `#1a1a1a` | Primary background |
| `--bc-secondary` | `#2a2a2a` | Secondary background |
| `--bc-surface` | `#222222` | Card/surface background |
| `--bc-background` | `#111111` | Page background |
| `--bc-border` | `#333333` | Borders and dividers |
| `--bc-text` | `#f0ece4` | Primary text |
| `--bc-text-secondary` | `#a09888` | Secondary/muted text |

### Accent Colors

| Variable | Default | Description |
|----------|---------|-------------|
| `--bc-accent` | `#c4a882` | Primary accent (gold) |
| `--bc-accent-light` | `#d4c4a8` | Lighter accent (hover states) |
| `--bc-accent-dark` | `#a08860` | Darker accent (active states) |

### Typography

| Variable | Default | Description |
|----------|---------|-------------|
| `--bc-font-family` | system stack | Base font |
| `--bc-font-size` | `14px` | Base font size |
| `--bc-heading-font` | system stack | Heading font |
| `--bc-line-height` | `1.5` | Base line height |
| `--bc-font-weight-normal` | `400` | Normal font weight |
| `--bc-font-weight-bold` | `600` | Bold font weight |

### Spacing

| Variable | Default | Description |
|----------|---------|-------------|
| `--bc-space-xs` | `4px` | Extra small |
| `--bc-space-sm` | `8px` | Small |
| `--bc-space-md` | `16px` | Medium |
| `--bc-space-lg` | `24px` | Large |
| `--bc-space-xl` | `32px` | Extra large |

### Borders & Radius

| Variable | Default | Description |
|----------|---------|-------------|
| `--bc-radius-sm` | `2px` | Small radius |
| `--bc-radius-md` | `4px` | Medium radius |
| `--bc-radius-lg` | `8px` | Large radius |
| `--bc-border-width` | `1px` | Default border width |

### Shadows

| Variable | Default | Description |
|----------|---------|-------------|
| `--bc-shadow-sm` | `0 1px 2px rgba(0,0,0,0.3)` | Small shadow |
| `--bc-shadow-md` | `0 4px 6px rgba(0,0,0,0.4)` | Medium shadow |
| `--bc-shadow-lg` | `0 10px 25px rgba(0,0,0,0.5)` | Large shadow |

### Transitions

| Variable | Default | Description |
|----------|---------|-------------|
| `--bc-transition-fast` | `150ms ease` | Fast transitions |
| `--bc-transition-normal` | `250ms ease` | Normal transitions |
| `--bc-transition-slow` | `400ms ease` | Slow transitions |

---

## JavaScript API

The extension exposes a small API via `window.__BC__` for advanced customization.

```js
// Check if Brutalist Chrome is active
if (window.__BC__) {
  console.log("Brutalist Chrome is running");
}

// Get current theme settings
const settings = await window.__BC__.getSettings();
// { theme: "dark", accentColor: "#c4a882", ... }

// Listen for theme changes
window.__BC__.onThemeChange((newTheme) => {
  console.log("Theme changed to:", newTheme);
});

// Programmatically toggle theme
window.__BC__.toggleTheme();

// Open the command palette
window.__BC__.openCommandPalette();

// Add a todo
window.__BC__.addTodo("Review design mockups");

// Save a quick note
window.__BC__.saveNote({
  title: "Idea",
  content: "Try a monochrome gradient on the sidebar"
});
```

---

## Creating Custom Widgets

You can add custom widgets to the new tab page by listening to the extension's custom events.

### Register a Widget

```js
// Register a widget with the new tab page
window.__BC__.registerWidget({
  id: "my-crypto-widget",
  name: "Crypto Prices",
  icon: "₿",
  render: (container) => {
    container.innerHTML = `
      <div class="bc-widget-header">₿ Bitcoin: $45,000</div>
      <div class="bc-widget-body">
        <p>ETH: $3,200</p>
      </div>
    `;
  },
  refreshInterval: 60000 // Refresh every 60s
});
```

### Widget API

| Method | Description |
|--------|-------------|
| `registerWidget(config)` | Register a new widget |
| `unregisterWidget(id)` | Remove a widget |
| `getWidgets()` | Get all registered widgets |
| `refreshWidget(id)` | Manually refresh a widget |

### Widget Config Object

```js
{
  id: "string",           // Unique widget ID
  name: "string",         // Display name
  icon: "string",         // Emoji or short text
  render: (container) => {}, // Render function
  refreshInterval: number,    // Optional refresh in ms
  onRefresh: () => {},        // Optional refresh handler
  defaultPosition: {          // Optional grid position
    x: 0,
    y: 0,
    w: 2,
    h: 1
  }
}
```

### Styling Your Widget

Widgets automatically inherit theme styles. Use the CSS variables for consistency:

```css
.my-custom-widget {
  background: var(--bc-surface);
  border: 1px solid var(--bc-border);
  border-radius: var(--bc-radius-md);
  color: var(--bc-text);
  padding: var(--bc-space-md);
}

.my-custom-widget .accent {
  color: var(--bc-accent);
}
```

---

## Theme Gallery Ideas

### 1. Amber Glow
```
Accent:    #ffb300  (vivid amber)
AccentLight: #ffd54f
AccentDark:  #ff8f00
Background: #121212
Surface:    #1e1e1e
```

### 2. Blood Ruby
```
Accent:    #c62828  (deep red)
AccentLight: #e53935
AccentDark:  #b71c1c
Background: #0a0a0a
Surface:    #1a1a1a
```

### 3. Emerald Noir
```
Accent:    #2e7d32  (forest green)
AccentLight: #43a047
AccentDark:  #1b5e20
Background: #0d0d0d
Surface:    #1a1a1a
```

### 4. Electric Cyan
```
Accent:    #00bcd4  (cyan)
AccentLight: #4dd0e1
AccentDark:  #00838f
Background: #0a0e14
Surface:    #141a21
```

### 5. Royal Purple
```
Accent:    #7b1fa2  (purple)
AccentLight: #9c27b0
AccentDark:  #4a148c
Background: #0d0d14
Surface:    #1a1a24
```

### 6. Warm Sepia (Light Theme)
```
Accent:    #8d6e3f
AccentLight: #a88b5f
AccentDark:  #6d4f2a
Background: #f5f0e8
Surface:    #ede4d5
Text:       #3a3226
```

---

Apply any theme via the Custom CSS editor — just copy the `:root` block and adjust:

```css
:root {
  --bc-accent: #ffb300;
  --bc-accent-light: #ffd54f;
  --bc-accent-dark: #ff8f00;
}
```

---

*See [ARCHITECTURE.md](architecture.md) for technical implementation details.*
