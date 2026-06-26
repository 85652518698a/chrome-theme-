/**
 * Brutalist Chrome — Color System
 * Dark monochrome palette with warm gold accents
 */

export const palette = {
  primary: '#1a1a1a',
  primaryLight: '#2a2a2a',
  primaryDark: '#111111',

  secondary: '#2a2a2a',
  secondaryLight: '#333333',
  secondaryDark: '#222222',

  surface: '#222222',
  surfaceLight: '#2e2e2e',
  surfaceDark: '#1a1a1a',

  background: '#111111',
  backgroundLight: '#1a1a1a',

  text: '#f0ece4',
  textSecondary: '#a09888',
  textMuted: '#706858',
  textInverse: '#111111',

  accent: '#c4a882',
  accentLight: '#d4c4a8',
  accentDark: '#a08860',
  accentMuted: '#8a7a62',

  border: '#333333',
  borderLight: '#444444',
  borderDark: '#222222',

  success: '#4caf50',
  successLight: '#66bb6a',
  successDark: '#388e3c',

  warning: '#ff9800',
  warningLight: '#ffb333',
  warningDark: '#e68900',

  error: '#f44336',
  errorLight: '#ef5350',
  errorDark: '#d32f2f',

  info: '#2196f3',
  infoLight: '#42a5f5',
  infoDark: '#1976d2',

  gradientStart: '#1a1a2e',
  gradientEnd: '#16213e',

  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',
  overlayDark: 'rgba(0, 0, 0, 0.7)',

  scrollbar: '#444444',
  scrollbarTrack: '#1a1a1a',
  scrollbarHover: '#555555',

  selection: '#c4a882',
  selectionText: '#1a1a1a',

  focus: '#c4a882',
  focusInset: '#1a1a1a',
};

export const chromeThemeColors = {
  frame: palette.primary,
  frame_inactive: palette.primaryDark,
  frame_incognito: palette.primaryDark,
  toolbar: palette.primaryLight,
  toolbar_button_icon: '#c0c0c0',
  toolbar_text: palette.text,
  tab_background_color: palette.secondaryDark,
  tab_background_text: palette.textSecondary,
  tab_text: palette.text,
  bookmark_text: palette.text,
  ntp_background: palette.background,
  ntp_text: palette.text,
  ntp_link: palette.accent,
  ntp_snippet: palette.textSecondary,
  ntp_header: palette.text,
  button_background: palette.secondaryLight,
  control_background: palette.secondaryDark,
  control_border: palette.secondaryLight,
  omnibox_background: palette.secondaryDark,
  omnibox_text: palette.text,
  omnibox_dropdown_background: palette.primary,
  omnibox_dropdown_text: palette.text,
  omnibox_dropdown_selection: palette.secondaryLight,
  side_panel_background: palette.primary,
  side_panel_content_background: palette.secondaryDark,
  side_panel_header_background: palette.primary,
  side_panel_border: palette.secondaryLight,
  background_tab_strip_background: palette.primary,
};

export const darkTheme = {
  primary: '#1a1a1a',
  secondary: '#2a2a2a',
  surface: '#222222',
  background: '#111111',
  text: '#f0ece4',
  textSecondary: '#a09888',
  accent: '#c4a882',
  border: '#333333',
};

export const lightTheme = {
  primary: '#f5f0eb',
  secondary: '#e8e4de',
  surface: '#ffffff',
  background: '#fafafa',
  text: '#1a1a1a',
  textSecondary: '#706858',
  accent: '#a08860',
  border: '#d4ccc4',
};

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b]
    .map(x => Math.round(Math.min(255, Math.max(0, x))))
    .map(x => x.toString(16).padStart(2, '0'))
    .join('');
}

function darken(hex, amount = 0.1) {
  const { r, g, b } = hexToRgb(hex);
  const factor = 1 - Math.min(1, Math.max(0, amount));
  return rgbToHex(r * factor, g * factor, b * factor);
}

function lighten(hex, amount = 0.1) {
  const { r, g, b } = hexToRgb(hex);
  const factor = 1 + amount;
  return rgbToHex(
    Math.min(255, r * factor),
    Math.min(255, g * factor),
    Math.min(255, b * factor),
  );
}

function getLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const [rs, gs, bs] = [r, g, b].map(c => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function getContrast(hex1, hex2) {
  const l1 = getLuminance(hex1);
  const l2 = getLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function generatePalette(hex, steps = 10) {
  const { r, g, b } = hexToRgb(hex);
  const palette = [];
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    const factor = 0.2 + t * 0.8;
    palette.push(rgbToHex(r * factor, g * factor, b * factor));
  }
  return palette;
}

function alpha(hex, opacity) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

function toHsl(hex) {
  const { r, g, b } = hexToRgb(hex);
  const [rs, gs, bs] = [r, g, b].map(c => c / 255);
  const max = Math.max(rs, gs, bs);
  const min = Math.min(rs, gs, bs);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rs: h = ((gs - bs) / d + (gs < bs ? 6 : 0)) / 6; break;
      case gs: h = ((bs - rs) / d + 2) / 6; break;
      case bs: h = ((rs - gs) / d + 4) / 6; break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

function isLight(hex) {
  return getLuminance(hex) > 0.5;
}

function contrastColor(hex) {
  return isLight(hex) ? '#111111' : '#f0ece4';
}

export {
  hexToRgb,
  rgbToHex,
  darken,
  lighten,
  getLuminance,
  getContrast,
  generatePalette,
  alpha,
  toHsl,
  isLight,
  contrastColor,
};

export default palette;
