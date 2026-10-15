// Shared helpers for every page: SDG chips, copy buttons, saved checklists,
// and the starter-prompt template. Exposed on window.UND for the other scripts.
// Also turns on the custom cursor for mouse users.
(() => {
  const SDG_NAMES = [
    null,
    'No Poverty', 'Zero Hunger', 'Good Health and Well-being', 'Quality Education',
    'Gender Equality', 'Clean Water and Sanitation', 'Affordable and Clean Energy',
    'Decent Work and Economic Growth', 'Industry, Innovation and Infrastructure',
    'Reduced Inequalities', 'Sustainable Cities and Communities',
    'Responsible Consumption and Production', 'Climate Action', 'Life Below Water',
    'Life on Land', 'Peace, Justice and Strong Institutions', 'Partnerships for the Goals',
  ];
  // Goals whose colour is dark enough for white text (WCAG AA at chip size).
  const LIGHT_TEXT = new Set([1, 4, 8, 10, 13, 16, 17]);

  const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ESCAPES[c]);

  function sdgChip(n, { button = false } = {}) {
    const tag = button ? 'button' : 'span';
    const cls = LIGHT_TEXT.has(n) ? 'sdg light-text' : 'sdg';
    const attrs = button ? ` type="button" data-sdg="${n}" aria-label="Show APIs for Goal ${n}: ${SDG_NAMES[n]}"` : '';
    return `<${tag} class="${cls}" style="--c: var(--sdg-${n})" title="Goal ${n}: ${SDG_NAMES[n]}"${attrs}>SDG ${n}</${tag}>`;
  }

  function starterPrompt({ idea, url, docs, extra }) {
    const lines = [
      "I'm building a small web app at a UN Day coding workshop. I'm new to coding, so keep it simple and explain as you go.",
      '',
      `My idea: ${idea}`,
      '',
    ];
    if (url) {
      lines.push('Data: use this free API. It needs no key and works straight from a web page:', url);
      if (docs) lines.push(`Docs: ${docs}`);
    } else {
      lines.push('Data: suggest 2 or 3 free APIs that need no key and work from a web page (CORS enabled), then use the best one.');
    }
    if (extra) lines.push('', extra);
    lines.push(
      '',
      'Rules:',
      '- Make ONE file called index.html with the CSS and JavaScript inside it. No frameworks, no build step, no API keys.',
      '- Load live data with fetch(). Show a loading message while it waits and a friendly message if the request fails.',
      '- Make it look clean and modern, and make it work on a phone.',
      "- Start simple: get real data on the screen first. We'll improve it together after.",
      '- After the code, explain in 3 short bullets what the main parts do.',
    );
    return lines.join('\n');
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand('copy');
      area.remove();
      return ok;
    }
  }

  function flash(button, ok) {
    const label = button.dataset.label || button.textContent;
    button.dataset.label = label;
    button.textContent = ok ? 'Copied!' : 'Press Ctrl+C';
    button.classList.toggle('done', ok);
    clearTimeout(button._timer);
    button._timer = setTimeout(() => {
      button.textContent = label;
      button.classList.remove('done');
    }, 1600);
  }

  // <button data-copy="#some-pre">Copy</button> copies that element's text.
  document.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-copy]');
    if (!button) return;
    const source = document.querySelector(button.dataset.copy);
    if (source) flash(button, await copyText(source.textContent.trim()));
  });

  const store = {
    get(key) { try { return localStorage.getItem(`undayswe:${key}`); } catch { return null; } },
    set(key, value) { try { localStorage.setItem(`undayswe:${key}`, value); } catch { /* private mode */ } },
  };

  // Checkboxes with data-save="key" remember their state on this device.
  for (const box of document.querySelectorAll('input[type="checkbox"][data-save]')) {
    box.checked = store.get(`check:${box.dataset.save}`) === '1';
    box.addEventListener('change', () => store.set(`check:${box.dataset.save}`, box.checked ? '1' : '0'));
  }

  for (const bar of document.querySelectorAll('.sdg-bar')) {
    bar.innerHTML = Array.from({ length: 17 }, (_, i) => `<span style="background: var(--sdg-${i + 1})"></span>`).join('');
  }

  // Run fn once, the first time el scrolls near the screen. Live previews and
  // demos use this so a page doesn't call 30 APIs the moment it opens.
  const onVisible = new WeakMap();
  const observer = 'IntersectionObserver' in window && new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      observer.unobserve(entry.target);
      onVisible.get(entry.target)();
    }
  }, { rootMargin: '200px' });
  function whenVisible(el, fn) {
    if (!observer) return fn();
    onVisible.set(el, fn);
    observer.observe(el);
  }

  const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Grey placeholder bars shown while a live preview loads.
  const SKELETON = '<div class="skeleton" aria-label="Loading live data"><i></i><i></i><i></i></div>';

  // A custom cursor for mouse users: a dot, plus a ring that trails behind it and
  // cycles through the 17 SDG colors as you move. It grows over anything clickable,
  // pops SDG confetti on click, and steps aside for text fields and embedded demos.
  // Touch screens and "reduce motion" keep the normal cursor.
  function mountCursor() {
    const root = document.documentElement;
    const dot = Object.assign(document.createElement('div'), { className: 'cursor-dot' });
    const ring = Object.assign(document.createElement('div'), { className: 'cursor-ring' });
    document.body.append(ring, dot);
    root.classList.add('has-cursor', 'cursor-off');

    const CLICKABLE = 'a, button, summary, label, select, input[type="checkbox"]';
    const TEXT = 'input:not([type="checkbox"]), textarea';
    let x = 0, y = 0, ringX = 0, ringY = 0, travelled = 0, frame = 0, over = null;

    function trail() {
      ringX += (x - ringX) * 0.22;
      ringY += (y - ringY) * 0.22;
      ring.style.translate = `${ringX}px ${ringY}px`; // not transform, or the CSS hover scale would scale this offset too
      frame = Math.abs(x - ringX) + Math.abs(y - ringY) > 0.3 ? requestAnimationFrame(trail) : 0;
    }

    document.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      if (!over) [ringX, ringY] = [e.clientX, e.clientY]; // (re)entering: start the ring under the pointer
      travelled += Math.hypot(e.clientX - x, e.clientY - y);
      [x, y] = [e.clientX, e.clientY];
      dot.style.translate = `${x}px ${y}px`;
      ring.style.setProperty('--c', `var(--sdg-${(Math.floor(travelled / 160) % 17) + 1})`);
      if (!frame) frame = requestAnimationFrame(trail);
      if (e.target !== over) {
        over = e.target;
        root.classList.toggle('cursor-off', Boolean(over.closest(TEXT)));
        root.classList.toggle('cursor-hover', Boolean(over.closest(CLICKABLE)));
      }
    }, { passive: true });

    // Leaving the window, or moving into an embedded demo, has no new target on this page.
    document.addEventListener('pointerout', (e) => {
      if (e.relatedTarget) return;
      root.classList.add('cursor-off');
      over = null;
    });

    document.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse' || root.classList.contains('cursor-off')) return;
      ring.classList.add('press');
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * 2 * Math.PI + Math.random() * 0.4;
        const distance = 30 + Math.random() * 34;
        const spark = Object.assign(document.createElement('i'), { className: 'cursor-spark' });
        spark.style.cssText = `left: ${e.clientX}px; top: ${e.clientY}px; --c: var(--sdg-${((i * 3) % 17) + 1}); `
          + `--dx: ${Math.cos(angle) * distance}px; --dy: ${Math.sin(angle) * distance}px`;
        spark.addEventListener('animationend', () => spark.remove());
        document.body.append(spark);
      }
    });
    document.addEventListener('pointerup', () => ring.classList.remove('press'));
  }
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches && !reducedMotion()) mountCursor();

  window.UND = { SDG_NAMES, LIGHT_TEXT, SKELETON, esc, sdgChip, starterPrompt, copyText, flash, store, whenVisible, reducedMotion };
})();
