export class QuoteService {
  constructor() {
    this.cache = null;
    this.fallbackQuotes = [
      { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
      { text: "In the middle of difficulty lies opportunity.", author: "Albert Einstein" },
      { text: "Creativity is intelligence having fun.", author: "Albert Einstein" },
      { text: "The future depends on what you do today.", author: "Mahatma Gandhi" },
      { text: "Stay hungry, stay foolish.", author: "Steve Jobs" },
      { text: "Simplicity is the ultimate sophistication.", author: "Leonardo da Vinci" },
      { text: "Design is not just what it looks like and feels like. Design is how it works.", author: "Steve Jobs" },
      { text: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese Proverb" },
      { text: "Everything you can imagine is real.", author: "Pablo Picasso" },
      { text: "The only impossible journey is the one you never begin.", author: "Tony Robbins" },
      { text: "What you do speaks so loudly that I cannot hear what you say.", author: "Ralph Waldo Emerson" },
      { text: "The purpose of life is not to be happy. It is to be useful, to be honorable, to be compassionate.", author: "Ralph Waldo Emerson" },
      { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
      { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
      { text: "Act as if what you do makes a difference. It does.", author: "William James" },
      { text: "What we think, we become.", author: "Buddha" },
      { text: "The only limit to our realization of tomorrow will be our doubts of today.", author: "Franklin D. Roosevelt" },
      { text: "Do what you can, with what you have, where you are.", author: "Theodore Roosevelt" },
      { text: "Be yourself; everyone else is already taken.", author: "Oscar Wilde" },
      { text: "Two roads diverged in a wood, and I took the one less traveled by, and that has made all the difference.", author: "Robert Frost" },
      { text: "You miss 100% of the shots you don't take.", author: "Wayne Gretzky" },
      { text: "Whether you think you can or you think you can't, you're right.", author: "Henry Ford" },
      { text: "The best revenge is massive success.", author: "Frank Sinatra" },
      { text: "I have not failed. I've just found 10,000 ways that won't work.", author: "Thomas Edison" },
      { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" }
    ];
  }

  async getRandomQuote() {
    try {
      const response = await fetch('https://api.quotable.io/random', {
        signal: AbortSignal.timeout(5000)
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      return {
        text: data.content,
        author: data.author
      };
    } catch {
      return this.getLocalQuote();
    }
  }

  getLocalQuote() {
    const index = Math.floor(Math.random() * this.fallbackQuotes.length);
    return { ...this.fallbackQuotes[index] };
  }

  async getQuotesByTag(tag) {
    try {
      const response = await fetch(`https://api.quotable.io/quotes?tags=${encodeURIComponent(tag)}&limit=10`, {
        signal: AbortSignal.timeout(5000)
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      return data.results.map(q => ({
        text: q.content,
        author: q.author
      }));
    } catch {
      return this.fallbackQuotes.slice(0, 10);
    }
  }
}

export class QuoteWidget {
  constructor(config = {}) {
    this.container = config.container || document.body;
    this.service = config.service || new QuoteService();
    this.currentQuote = null;
    this.autoRotate = config.autoRotate !== false;
    this.rotationInterval = config.rotationInterval || 60000;
    this._timer = null;
    this._mounted = false;
  }

  render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <button class="quote-refresh-btn" title="New quote">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="23 4 23 10 17 10"/>
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
        </svg>
      </button>
      <button class="quote-copy-btn" title="Copy quote">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
        </svg>
      </button>
      <div class="quote-text"></div>
      <div class="quote-author"></div>
      <div class="quote-loading skeleton" style="display:none;height:60px;border-radius:8px;"></div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    const refreshBtn = this.container.querySelector('.quote-refresh-btn');
    const copyBtn = this.container.querySelector('.quote-copy-btn');

    refreshBtn.addEventListener('click', () => this.load());
    copyBtn.addEventListener('click', () => this.copyQuote());
  }

  async load() {
    const quoteText = this.container.querySelector('.quote-text');
    const quoteAuthor = this.container.querySelector('.quote-author');
    const loading = this.container.querySelector('.quote-loading');

    quoteText.style.display = 'none';
    quoteAuthor.style.display = 'none';
    loading.style.display = 'block';

    this.currentQuote = await this.service.getRandomQuote();

    loading.style.display = 'none';
    quoteText.style.display = '';
    quoteAuthor.style.display = '';

    quoteText.textContent = this.currentQuote.text;
    quoteAuthor.textContent = `— ${this.currentQuote.author}`;

    this.startAutoRotate();
  }

  startAutoRotate() {
    if (this._timer) clearInterval(this._timer);
    if (this.autoRotate) {
      this._timer = setInterval(() => this.load(), this.rotationInterval);
    }
  }

  stopAutoRotate() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }

  async copyQuote() {
    if (!this.currentQuote) return;

    const text = `"${this.currentQuote.text}" — ${this.currentQuote.author}`;

    try {
      await navigator.clipboard.writeText(text);
      this.showCopiedFeedback();
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        this.showCopiedFeedback();
      } catch {}
      document.body.removeChild(textarea);
    }
  }

  showCopiedFeedback() {
    const copyBtn = this.container.querySelector('.quote-copy-btn');
    const original = copyBtn.innerHTML;
    copyBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>`;
    setTimeout(() => {
      copyBtn.innerHTML = original;
    }, 2000);
  }

  mount() {
    this._mounted = true;
    this.container.style.display = '';
    this.startAutoRotate();
  }

  unmount() {
    this._mounted = false;
    this.container.style.display = 'none';
    this.stopAutoRotate();
  }

  update(config) {
    if (config.autoRotate !== undefined) {
      this.autoRotate = config.autoRotate;
      if (this.autoRotate) this.startAutoRotate();
      else this.stopAutoRotate();
    }
    if (config.rotationInterval) {
      this.rotationInterval = config.rotationInterval;
      if (this.autoRotate) {
        this.startAutoRotate();
      }
    }
  }

  destroy() {
    this.stopAutoRotate();
    this.container.innerHTML = '';
    this.currentQuote = null;
  }
}
