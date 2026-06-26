# Contributing to Brutalist Chrome

First off, thank you for considering contributing! Every contribution helps make this project better.

## Code of Conduct

By participating, you agree to uphold our [Code of Conduct](#code-of-conduct). Be respectful, inclusive, and constructive.

### Our Pledge

We pledge to make participation in this project a harassment-free experience for everyone, regardless of age, body size, disability, ethnicity, gender identity, level of experience, education, socio-economic status, nationality, personal appearance, race, religion, or sexual identity and orientation.

### Our Standards

Examples of behavior that contributes to a positive environment:

- Using welcoming and inclusive language
- Being respectful of differing viewpoints and experiences
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards other community members

Examples of unacceptable behavior:

- Tawdry or offensive language/imagery and unwelcome sexual attention
- Trolling, insulting/derogatory comments, and personal or political attacks
- Public or private harassment
- Publishing others' private information without explicit permission
- Other conduct which could reasonably be considered inappropriate in a professional setting

---

## How to Contribute

### Reporting Bugs

1. Check the [issues](https://github.com/yourusername/Brutalist-Chrome/issues) to avoid duplicates
2. Use the bug report template
3. Include:
   - Chrome version
   - OS
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots if applicable
   - Console errors

### Suggesting Features

1. Open a feature request issue
2. Describe the feature clearly
3. Explain why it fits the brutalist design philosophy
4. Include mockups or examples if possible

### Pull Requests

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/your-feature`)
3. Make your changes
4. Run the linter and tests
5. Commit with a descriptive message (see conventions below)
6. Push and open a Pull Request

---

## Development Setup

```bash
# Fork and clone
git clone https://github.com/yourusername/Brutalist-Chrome.git
cd Brutalist-Chrome

# Install dependencies
npm install

# Start development build with watch
npm run dev

# Build for production
npm run build

# Lint code
npm run lint
```

### Project Commands

| Command | Description |
|---------|-------------|
| `npm run build` | Build extension + theme to `dist/` |
| `npm run dev` | Watch mode with auto-rebuild |
| `npm run lint` | Lint JavaScript and CSS |
| `npm run format` | Format code with Prettier |

---

## Code Style Guide

### JavaScript

- **ES Modules** — Use `import`/`export` (no CommonJS)
- **Naming** — `camelCase` for variables/functions, `PascalCase` for classes
- **Indentation** — 2 spaces
- **Semicolons** — Required
- **Quotes** — Double quotes (`"`) for strings
- **Async** — Use `async/await` over raw promises
- **Types** — Use JSDoc comments for function signatures
- **No jQuery** — Use native DOM APIs

```js
/**
 * Fetches bookmarks matching the query.
 * @param {string} query - Search string
 * @returns {Promise<BookmarkTreeNode[]>}
 */
async function searchBookmarks(query) {
  const tree = await chrome.bookmarks.getTree();
  return flattenBookmarkTree(tree).filter(b =>
    b.title.toLowerCase().includes(query.toLowerCase())
  );
}
```

### CSS

- **Custom Properties** — Use `--bc-*` prefix for theme variables
- **Classes** — Use `bc-*` prefix to avoid conflicts
- **Indentation** — 2 spaces
- **Selectors** — Prefer classes over IDs
- **Colors** — Use CSS variables, never hardcode hex values in components

```css
.widget {
  background: var(--bc-surface);
  border: 1px solid var(--bc-border);
  color: var(--bc-text);
  border-radius: 4px;
  padding: 16px;
}
```

### HTML

- Use semantic HTML5 elements
- Keep accessibility in mind (aria labels, roles)
- Minimize inline styles

---

## Commit Message Conventions

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

| Type | Description |
|------|-------------|
| `feat` | A new feature |
| `fix` | A bug fix |
| `refactor` | Code change without feature/fix |
| `style` | Formatting, missing semicolons, etc. |
| `docs` | Documentation only |
| `perf` | Performance improvement |
| `test` | Adding or fixing tests |
| `chore` | Build process, dependencies, etc. |

### Examples

```
feat(bookmarks): add folder tree navigation
fix(theme): resolve flash on page load
docs(readme): update installation instructions
refactor(storage): migrate to async queue pattern
style(popup): fix indentation
```

---

## Pull Request Process

1. Ensure your code passes `npm run lint`
2. Update documentation if you change behavior
3. Add or update tests as needed
4. Keep PRs focused — one feature/fix per PR
5. Reference related issues in the description
6. Squash commits before merge if messy

### Review Checklist

- [ ] Code follows style guide
- [ ] Linter passes
- [ ] No console.log debugging left in
- [ ] Error states are handled
- [ ] Chrome API calls have permission checks
- [ ] Storage keys follow naming conventions
- [ ] UI respects dark/light theme
- [ ] Accessibility basics covered

---

## Questions?

Open a [discussion](https://github.com/yourusername/Brutalist-Chrome/discussions) or reach out in issues.

Thank you for contributing!
