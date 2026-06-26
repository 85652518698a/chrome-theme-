export class Animations {
  constructor(config = {}) {
    this.config = {
      staggerDelay: 80,
      loadSequenceDelay: 200,
      observeRootMargin: '50px',
      observeThreshold: 0.1,
      ...config
    };

    this.observer = null;
    this.initialized = false;
    this.reducedMotion = false;
  }

  init() {
    if (this.initialized) return;

    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (this.reducedMotion) return;

    this.createObserver();
    this.initLoadSequence();
    this.initMicroInteractions();
    this.initialized = true;
  }

  createObserver() {
    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const el = entry.target;
            const delay = parseInt(el.dataset.animDelay) || 0;
            const animType = el.dataset.animType || 'fadeInUp';

            setTimeout(() => {
              el.style.animation = `${animType} 0.5s ease both`;
              el.style.opacity = '1';
            }, delay);

            this.observer.unobserve(el);
          }
        }
      },
      {
        rootMargin: this.config.observeRootMargin,
        threshold: this.config.observeThreshold
      }
    );
  }

  observeElement(el, options = {}) {
    if (!el || this.reducedMotion) return;

    el.dataset.animType = options.type || 'fadeInUp';
    el.dataset.animDelay = String(options.delay || 0);
    el.style.opacity = '0';

    this.observer.observe(el);
  }

  observeAll(selector, options = {}) {
    if (this.reducedMotion) return;

    const elements = document.querySelectorAll(selector);
    elements.forEach((el, i) => {
      this.observeElement(el, {
        ...options,
        delay: (options.delay || 0) + i * (options.stagger || this.config.staggerDelay)
      });
    });
  }

  initLoadSequence() {
    const sequence = [
      { selector: '.clock-widget', delay: 100 },
      { selector: '.weather-widget', delay: 200 },
      { selector: '.greeting', delay: 300 },
      { selector: '.search-bar-wrapper', delay: 400 },
      { selector: '.quote-card', delay: 550 },
      { selector: '.bookmarks-section', delay: 700 },
      { selector: '.todo-section', delay: 850 },
      { selector: '.notes-section', delay: 1000 },
      { selector: '.sidebar', delay: 300 },
      { selector: '.quick-links', delay: 900 }
    ];

    sequence.forEach(({ selector, delay }) => {
      const elements = document.querySelectorAll(selector);
      elements.forEach((el, i) => {
        setTimeout(() => {
          el.style.opacity = '0';
          el.style.animation = `fadeInUp 0.5s ease both`;
          el.style.opacity = '1';
        }, delay + i * 100);
      });
    });
  }

  staggerGrid(container, delay = 80) {
    if (!container || this.reducedMotion) return;

    const children = Array.from(container.children);
    children.forEach((child, i) => {
      child.style.opacity = '0';
      child.style.animation = `fadeInUp 0.4s ease ${i * delay}ms both`;
      child.style.opacity = '1';
    });
  }

  animateIn(el, type = 'fadeInUp', duration = 500) {
    if (!el || this.reducedMotion) return;

    el.style.animation = `${type} ${duration}ms ease both`;
  }

  animateOut(el, type = 'fadeIn', duration = 300) {
    if (!el || this.reducedMotion) return;

    el.style.animation = `${type} ${duration}ms ease reverse both`;
  }

  pulse(el) {
    if (!el || this.reducedMotion) return;

    el.style.animation = 'none';
    void el.offsetHeight;
    el.style.animation = 'pulse 0.3s ease';
  }

  shake(el) {
    if (!el || this.reducedMotion) return;

    el.style.animation = 'none';
    void el.offsetHeight;
    el.style.animation = 'shake 0.4s ease';
  }

  initMicroInteractions() {
    document.addEventListener('mouseover', (e) => {
      const interactive = e.target.closest(
        '.bookmark-tile, .btn-icon, .quick-link, .todo-checkbox, .todo-delete-btn, .pomodoro-btn, .toggle-switch'
      );
      if (interactive) {
      }
    });

    this.addRippleEffect();
  }

  addRippleEffect() {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.modal-btn, .todo-add-btn, .pomodoro-btn');
      if (!btn || this.reducedMotion) return;

      const ripple = document.createElement('span');
      ripple.style.cssText = `
        position: absolute;
        border-radius: 50%;
        background: rgba(196, 168, 130, 0.3);
        pointer-events: none;
        transform: scale(0);
        animation: rippleEffect 0.6s ease-out;
        width: 100px;
        height: 100px;
        left: ${e.clientX - btn.getBoundingClientRect().left - 50}px;
        top: ${e.clientY - btn.getBoundingClientRect().top - 50}px;
      `;

      if (getComputedStyle(btn).position === 'static') {
        btn.style.position = 'relative';
        btn.style.overflow = 'hidden';
      }

      btn.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);
    });
  }

  createCountUp(el, target, duration = 1000) {
    if (!el || this.reducedMotion) {
      el.textContent = target;
      return;
    }

    const start = parseInt(el.textContent) || 0;
    const diff = target - start;
    const startTime = Date.now();

    const update = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(start + diff * eased);

      if (progress < 1) {
        requestAnimationFrame(update);
      }
    };

    update();
  }

  parallaxBackground(element, strength = 0.5) {
    if (!element || this.reducedMotion) return;

    let ticking = false;

    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const scrollY = window.scrollY;
          element.style.transform = `translateY(${scrollY * strength}px)`;
          ticking = false;
        });
        ticking = true;
      }
    });
  }

  fadeInOnScroll(element) {
    if (!element || this.reducedMotion) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          entry.target.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1 }
    );

    element.style.opacity = '0';
    element.style.transform = 'translateY(20px)';
    observer.observe(element);
  }

  destroy() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.initialized = false;
  }
}

const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.05); }
    100% { transform: scale(1); }
  }

  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-4px); }
    75% { transform: translateX(4px); }
  }

  @keyframes rippleEffect {
    to {
      transform: scale(4);
      opacity: 0;
    }
  }

  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes scaleIn {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  @keyframes slideInRight {
    from {
      opacity: 0;
      transform: translateX(20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @keyframes slideInLeft {
    from {
      opacity: 0;
      transform: translateX(-20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .anim-spin {
    animation: spin 1s linear infinite;
  }
`;

document.head.appendChild(styleSheet);
