// The design kit: free front-end libraries and tools. Every CDN link is pinned
// to a version checked on 2026-10-12. Each demo is a complete mini page that
// runs in a sandboxed iframe, and students can copy it as a starting point.
(() => {
  const { esc, copyText, flash, whenVisible, SDG_NAMES, LIGHT_TEXT } = window.UND;

  const CATEGORIES = {
    motion: { label: 'Animation', sdg: 10 },
    ui: { label: 'Components & icons', sdg: 17 },
    viz: { label: 'Charts & maps', sdg: 14 },
    art: { label: 'Art & music', sdg: 5 },
    more: { label: 'More free tools', sdg: 15 },
  };

  const USGS = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson';
  // strudel.cc plays whatever code is in its URL, so the beat travels in the link.
  const STRUDEL_TUNE = `// Press play. Change a letter, then play again.
setcps(0.5)
stack(
  s("bd*2, ~ sd, hh*8").bank("RolandTR909"),
  note("<c3 a2 f2 g2>").s("sawtooth").lpf(600)
)`;
  const STRUDEL_URL = `https://strudel.cc/#${encodeURIComponent(btoa(STRUDEL_TUNE))}`;
  const SDG_HEX = ['#e5243b', '#dda63a', '#4c9f38', '#c5192d', '#ff3a21', '#26bde2', '#fcc30b', '#a21942', '#fd6925',
    '#dd1367', '#fd9d24', '#bf8b2e', '#3f7e44', '#0a97d9', '#56c02b', '#00689d', '#19486a'];

  // Strip the shared leading indentation from a template-literal block.
  function dedent(text) {
    const lines = text.replace(/^\n/, '').trimEnd().split('\n');
    const pad = Math.min(...lines.filter((l) => l.trim()).map((l) => l.match(/^ */)[0].length));
    return lines.map((l) => l.slice(pad)).join('\n');
  }
  const indent = (text, n) => text.split('\n').map((l) => (l ? ' '.repeat(n) + l : l)).join('\n');

  // Build a readable, complete HTML page from a demo's parts.
  function page({ include = '', style = '', body, script = '' }) {
    const base = 'body { margin: 0; padding: 20px; font-family: system-ui, sans-serif; }';
    const css = [base, style && dedent(style)].filter(Boolean).join('\n');
    return [
      '<!doctype html>',
      '<html lang="en">',
      '<head>',
      '  <meta charset="utf-8">',
      '  <meta name="viewport" content="width=device-width, initial-scale=1">',
      include && indent(dedent(include), 2),
      `  <style>\n${indent(css, 4)}\n  </style>`,
      '</head>',
      '<body>',
      indent(dedent(body), 2),
      script && `  <script>\n${indent(dedent(script), 4)}\n  </script>`,
      '</body>',
      '</html>',
    ].filter(Boolean).join('\n');
  }

  const KIT = [
    // ---------- Animation ----------
    {
      id: 'anime', name: 'Anime.js', cat: 'motion', link: 'https://animejs.com',
      ask: 'Use Anime.js v4 from the jsDelivr CDN to make the big number count up from 0 when it appears.',
      include: '<script src="https://cdn.jsdelivr.net/npm/animejs@4.5.0/dist/bundles/anime.umd.min.js"></script>',
      demo: {
        style: `
          .num { font-size: 40px; font-weight: 800; }
          .grid { display: grid; grid-template-columns: repeat(10, 16px); gap: 8px; margin-top: 16px; }
          .dot { width: 16px; height: 16px; border-radius: 50%; background: #56c02b; }`,
        body: `
          <div class="num"><span id="count">0</span> species</div>
          <div>spotted near UN Headquarters</div>
          <div class="grid" id="grid"></div>`,
        script: `
          const { animate, stagger } = anime;
          const grid = document.getElementById('grid');
          for (let i = 0; i < 40; i++) grid.insertAdjacentHTML('beforeend', '<div class="dot"></div>');

          const counter = { value: 0 };
          animate(counter, {
            value: 1476,
            duration: 2000,
            ease: 'outExpo',
            onUpdate: () => { document.getElementById('count').textContent = Math.round(counter.value).toLocaleString(); },
          });
          animate('.dot', {
            scale: [0, 1],
            delay: stagger(40, { grid: [10, 4], from: 'center' }),
          });`,
      },
    },
    {
      id: 'aos', name: 'AOS (Animate On Scroll)', cat: 'motion', link: 'https://michalsnik.github.io/aos/',
      ask: 'Use AOS (Animate On Scroll) from the jsDelivr CDN so each section fades up as I scroll.',
      include: `
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/aos@2.3.4/dist/aos.css">
        <script src="https://cdn.jsdelivr.net/npm/aos@2.3.4/dist/aos.js"></script>`,
      demo: {
        style: `
          section { height: 110px; margin-bottom: 20px; border-radius: 16px; display: grid; place-items: center;
            color: white; font-size: 22px; font-weight: 700; }`,
        body: `
          <p>Scroll in here ↓</p>
          <section style="background:#e5243b" data-aos="fade-up">No poverty</section>
          <section style="background:#dda63a" data-aos="fade-right">Zero hunger</section>
          <section style="background:#4c9f38" data-aos="zoom-in">Good health</section>
          <section style="background:#c5192d" data-aos="flip-left">Quality education</section>
          <section style="background:#26bde2" data-aos="fade-up">Clean water</section>`,
        script: 'AOS.init({ once: false });',
      },
    },
    {
      id: 'confetti', name: 'canvas-confetti', cat: 'motion', link: 'https://www.kirilv.com/canvas-confetti/',
      ask: 'When the user gets the answer right, fire confetti with canvas-confetti from the jsDelivr CDN.',
      include: '<script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.4/dist/confetti.browser.js"></script>',
      demo: {
        style: `
          body { display: grid; place-items: center; height: 100vh; box-sizing: border-box; }
          button { font: inherit; font-size: 20px; padding: 12px 20px; }`,
        body: '<button id="yay">I got it right!</button>',
        script: `
          document.getElementById('yay').onclick = () => {
            confetti({ particleCount: 150, spread: 80, origin: { y: 0.7 } });
          };`,
      },
    },

    // ---------- Components & icons ----------
    {
      id: 'tailwind', name: 'Tailwind CSS', cat: 'ui', link: 'https://tailwindcss.com',
      ask: 'Style it with Tailwind CSS using the browser build from the jsDelivr CDN.',
      include: '<script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4.3.3/dist/index.global.js"></script>',
      demo: {
        body: `
          <div class="max-w-sm rounded-2xl bg-white p-6 shadow-xl ring-1 ring-black/5">
            <p class="text-sm font-semibold uppercase tracking-wide text-emerald-700">SDG 15 · Life on land</p>
            <h2 class="mt-2 text-3xl font-bold text-gray-900">1,476 species</h2>
            <p class="mt-1 text-gray-600">spotted near UN Headquarters.</p>
            <button class="mt-4 rounded-full bg-gray-900 px-4 py-2 font-semibold text-white hover:bg-emerald-700">See them</button>
          </div>`,
        height: 280,
      },
    },
    {
      id: 'pico', name: 'Pico CSS', cat: 'ui', link: 'https://picocss.com',
      ask: 'Use Pico CSS from the jsDelivr CDN so the plain HTML looks clean, and don’t add other CSS frameworks.',
      include: '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@picocss/pico@2.1.1/css/pico.min.css">',
      demo: {
        body: `
          <main class="container">
            <article>
              <h2>Air check</h2>
              <p>Is it a good day for a run?</p>
              <label>City <input placeholder="Nairobi"></label>
              <button>Check the air</button>
            </article>
          </main>`,
        height: 340,
      },
    },
    {
      id: 'lucide', name: 'Lucide icons', cat: 'ui', link: 'https://lucide.dev',
      ask: 'Add Lucide icons from the jsDelivr CDN next to each number, using <i data-lucide="..."> and lucide.createIcons().',
      include: '<script src="https://cdn.jsdelivr.net/npm/lucide@1.48.0/dist/umd/lucide.min.js"></script>',
      demo: {
        style: `
          .icons { display: flex; flex-wrap: wrap; gap: 14px; color: #3f7e44; }
          .icons svg { width: 34px; height: 34px; }`,
        body: `
          <div class="icons">
            <i data-lucide="globe"></i><i data-lucide="droplets"></i><i data-lucide="sprout"></i>
            <i data-lucide="sun"></i><i data-lucide="wind"></i><i data-lucide="leaf"></i>
            <i data-lucide="bike"></i><i data-lucide="recycle"></i><i data-lucide="fish"></i>
            <i data-lucide="trees"></i><i data-lucide="heart-pulse"></i><i data-lucide="graduation-cap"></i>
          </div>`,
        script: 'lucide.createIcons();',
        height: 160,
      },
    },

    // ---------- Charts & maps ----------
    {
      id: 'chartjs', name: 'Chart.js', cat: 'viz', link: 'https://www.chartjs.org',
      ask: 'Show the yearly values as a Chart.js line chart, loaded from the jsDelivr CDN.',
      include: '<script src="https://cdn.jsdelivr.net/npm/chart.js@4.5.1/dist/chart.umd.min.js"></script>',
      demo: {
        body: '<canvas id="chart"></canvas>',
        script: `
          fetch('${USGS}')
            .then((response) => response.json())
            .then((data) => {
              const counts = [0, 0, 0, 0, 0, 0];
              for (const quake of data.features) {
                const mag = quake.properties.mag;
                if (mag != null) counts[Math.min(5, Math.max(0, Math.floor(mag)))]++;
              }
              new Chart(document.getElementById('chart'), {
                type: 'bar',
                data: {
                  labels: ['Under 1', '1–2', '2–3', '3–4', '4–5', '5+'],
                  datasets: [{ label: 'Earthquakes today, by magnitude', data: counts, backgroundColor: '#fd6925' }],
                },
              });
            });`,
        height: 260,
      },
    },
    {
      id: 'leaflet', name: 'Leaflet', cat: 'viz', link: 'https://leafletjs.com',
      ask: 'Put the results on a Leaflet map (from the jsDelivr CDN) with OpenStreetMap tiles and a popup on each marker.',
      include: `
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css">
        <script src="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js"></script>`,
      demo: {
        style: `
          body { padding: 0; }
          #map { height: 100vh; }`,
        body: '<div id="map"></div>',
        script: `
          const map = L.map('map').setView([20, 0], 1);
          L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors',
          }).addTo(map);

          fetch('${USGS}')
            .then((response) => response.json())
            .then((data) => {
              for (const quake of data.features) {
                const [lng, lat] = quake.geometry.coordinates;
                const mag = quake.properties.mag || 0;
                L.circleMarker([lat, lng], { radius: Math.max(2, mag * 2.5), color: '#e5243b' })
                  .bindPopup('M' + mag + ', ' + quake.properties.place)
                  .addTo(map);
              }
            });`,
        height: 260,
        sameOrigin: true, // OpenStreetMap refuses map tiles to a sandboxed page with no origin
      },
    },

    // ---------- Art & music ----------
    {
      id: 'strudel', name: 'Strudel', cat: 'art', link: 'https://strudel.cc',
      ask: 'Add this Strudel music player to my page, full width.',
      include: `<iframe src="${STRUDEL_URL}" width="600" height="300"></iframe>`,
      demo: { embed: STRUDEL_URL, height: 320, wide: true },
    },
    {
      id: 'p5', name: 'p5.js', cat: 'art', link: 'https://editor.p5js.org',
      ask: 'Use p5.js from the jsDelivr CDN to draw a moving background in my SDG colors that follows the mouse.',
      include: '<script src="https://cdn.jsdelivr.net/npm/p5@2.3.4/lib/p5.min.js"></script>',
      demo: {
        style: `
          body { padding: 0; }
          canvas { display: block; }`,
        body: '',
        script: `
          const colors = ['#e5243b', '#fcc30b', '#4c9f38', '#26bde2', '#fd6925', '#dd1367'];
          function setup() {
            createCanvas(windowWidth, windowHeight);
            noStroke();
          }
          function draw() {
            background(255, 30); // see-through, so moving dots leave trails
            const t = frameCount * 0.005;
            colors.forEach((hex, i) => {
              fill(hex);
              circle(noise(i, t) * width, noise(i + 9, t) * height, 28);
            });
            if (mouseX + mouseY > 0) {
              fill(random(colors));
              circle(mouseX, mouseY, 16);
            }
          }`,
        height: 240,
        allow: 'accelerometer *; gyroscope *', // p5 listens for phone tilt; without this the console fills with errors
      },
    },
  ];

  // Tools that are websites, not libraries, so there's nothing to demo. Listed under their group.
  const LINKS = {
    art: [
      { name: 'CodePen', note: 'HTML, CSS & JS playground · 18+, or a parent signs up', link: 'https://codepen.io' },
      { name: 'Teachable Machine', note: 'train an AI on your webcam · no account', link: 'https://teachablemachine.withgoogle.com' },
      { name: 'ml5.js', note: 'friendly AI for p5.js', link: 'https://ml5js.org' },
    ],
    more: [
      { name: 'Uiverse', note: 'copy-paste buttons & loaders', link: 'https://uiverse.io' },
      { name: 'Unsplash', note: 'free photos', link: 'https://unsplash.com' },
      { name: 'Coolors', note: 'palette generator', link: 'https://coolors.co' },
    ],
  };

  // ---------- Kit cards with live demos ----------

  const askText = (item) => (item.include ? `${item.ask}\n\nLoad it with:\n${dedent(item.include)}` : item.ask);
  // An embedded site's demo code is just its iframe. Anything else becomes a full mini page (a demo's own include wins).
  const demoHtml = (item) => (item.demo.embed ? item.include : page({ include: item.include, ...item.demo }));

  function cardHtml(item) {
    return `
      <article class="card kit${item.demo.wide ? ' wide' : ''}" id="kit-${item.id}" style="--c: var(--sdg-${CATEGORIES[item.cat].sdg})">
        <div class="kit-top">
          <h3>${esc(item.name)}</h3>
          <a class="copy" href="${esc(item.link)}" target="_blank" rel="noopener">Site ↗</a>
        </div>
        <div class="demo" style="--h: ${item.demo.height || 220}px"></div>
        <div class="api-actions">
          <button type="button" class="btn btn-sm" data-ask>Copy AI sentence</button>
          <button type="button" class="copy" data-code>Copy demo code</button>
        </div>
      </article>`;
  }

  function mountKit(root) {
    const linkHtml = (t) => `<a href="${esc(t.link)}" target="_blank" rel="noopener">${esc(t.name)} <span>${esc(t.note)}</span></a>`;
    root.innerHTML = Object.entries(CATEGORIES).map(([id, cat]) => {
      const cards = KIT.filter((item) => item.cat === id).map(cardHtml).join('');
      const links = (LINKS[id] || []).map(linkHtml).join('');
      return `
      <section class="kit-group" id="group-${id}">
        <h2>${esc(cat.label)}</h2>
        ${cards && `<div class="kit-grid">${cards}</div>`}
        ${links && `<div class="tool-links">${links}</div>`}
      </section>`;
    }).join('');

    for (const item of KIT) {
      const box = document.querySelector(`#kit-${item.id} .demo`);
      whenVisible(box, () => {
        const frame = document.createElement('iframe');
        frame.title = `${item.name} demo`;
        if (item.demo.embed) {
          frame.src = item.demo.embed; // a real site: unsandboxed, so it keeps its own storage and sound
        } else {
          if (!item.demo.sameOrigin) frame.sandbox = 'allow-scripts';
          if (item.demo.allow) frame.allow = item.demo.allow;
          frame.srcdoc = demoHtml(item);
        }
        box.append(frame);
      });
    }

    root.addEventListener('click', async (e) => {
      const button = e.target.closest('[data-ask], [data-code]');
      if (!button) return;
      const item = KIT.find((k) => `kit-${k.id}` === button.closest('.kit').id);
      flash(button, await copyText(button.matches('[data-ask]') ? askText(item) : demoHtml(item)));
    });
  }

  // ---------- Fonts: type once, see it in nine fonts ----------

  const FONTS = [
    { name: 'Bricolage Grotesque', weight: 800 },
    { name: 'Space Grotesk', weight: 700 },
    { name: 'Fraunces', weight: 800 },
    { name: 'DM Serif Display', weight: 400 },
    { name: 'Bebas Neue', weight: 400, scale: 1.3 },
    { name: 'Caveat', weight: 700, scale: 1.25 },
    { name: 'Press Start 2P', weight: 400, scale: 0.6 },
    { name: 'Clash Display', weight: 600, fontshare: 'clash-display' },
    { name: 'Satoshi', weight: 700, fontshare: 'satoshi' },
  ];

  function fontAsk(font) {
    if (!font.fontshare) return `Use the Google Font "${font.name}" (weight ${font.weight}) for headings and "Inter" for body text.`;
    return `Use the Fontshare font "${font.name}" for headings, loaded with `
      + `<link rel="stylesheet" href="https://api.fontshare.com/v2/css?f[]=${font.fontshare}@${font.weight}&display=swap">, `
      + 'and the Google Font "Inter" for body text.';
  }

  function mountFonts(root) {
    const input = document.getElementById('font-text');
    root.innerHTML = FONTS.map((font, i) => `
      <button type="button" class="font-card" data-font="${i}" style="--f: '${font.name}'; --w: ${font.weight}; --s: ${font.scale || 1}">
        <span class="sample"></span>
        <span class="meta"><span>${esc(font.name)} · ${font.fontshare ? 'Fontshare' : 'Google Fonts'}</span><em>Copy</em></span>
      </button>`).join('');
    const samples = root.querySelectorAll('.sample');
    const show = () => { for (const s of samples) s.textContent = input.value.trim() || 'Your app name'; };
    input.addEventListener('input', show);
    show();
    root.addEventListener('click', async (e) => {
      const card = e.target.closest('[data-font]');
      if (card) flash(card.querySelector('em'), await copyText(fontAsk(FONTS[card.dataset.font])));
    });
  }

  // ---------- SDG goals: each one's color and its official pack ----------

  function mountGoals(root) {
    const pick = document.getElementById('goal-pick');
    root.innerHTML = SDG_HEX.map((hex, i) => `
      <button type="button" class="swatch${LIGHT_TEXT.has(i + 1) ? ' light-text' : ''}" style="--c: ${hex}" data-goal="${i + 1}" aria-pressed="false" title="Goal ${i + 1}: ${esc(SDG_NAMES[i + 1])}">
        <b>${i + 1}</b><code>${hex.toUpperCase()}</code>
      </button>`).join('');

    function select(n) {
      const hex = SDG_HEX[n - 1].toUpperCase();
      const file = n === 3 ? 'Goal-3-1' : `Goal-${n}`; // Goal 3's pack has a different file name on un.org
      for (const tile of root.children) tile.setAttribute('aria-pressed', String(tile.dataset.goal === String(n)));
      pick.style.setProperty('--c', hex);
      pick.innerHTML = `<b>Goal ${n} · ${esc(SDG_NAMES[n])}</b>`
        + `<button type="button" class="copy" data-hex="${hex}">Copy ${hex}</button>`
        + `<a class="copy" href="https://www.un.org/sustainabledevelopment/wp-content/uploads/2020/10/${file}.zip">Goal ${n} pack (.zip)</a>`;
    }

    root.addEventListener('click', (e) => {
      const tile = e.target.closest('[data-goal]');
      if (tile) select(Number(tile.dataset.goal));
    });
    pick.addEventListener('click', async (e) => {
      const button = e.target.closest('[data-hex]');
      if (button) flash(button, await copyText(button.dataset.hex));
    });
    select(1);
  }

  // ---------- Glow-up: each prompt changes one mock app ----------

  const GLOW = [
    { name: 'Fonts', cls: 'g-fonts', prompt: 'Use the Google Fonts "Bricolage Grotesque" for headings and "Inter" for everything else, with a warm off-white background (#F6F3EA) and generous spacing.' },
    { name: 'Color', cls: 'g-color', prompt: 'Pick one accent color and use it everywhere it matters: the official SDG 13 green, #3F7E44.' },
    { name: 'Loading', cls: 'g-load', prompt: 'While the data loads, show grey placeholder boxes in the shape of the content instead of a blank screen.' },
    { name: 'Motion', cls: 'g-motion', prompt: 'When the data arrives, animate the cards in one after another with Anime.js from the jsDelivr CDN. Keep it under one second, and skip it for people who turned on “reduce motion”.' },
    { name: 'Phone', cls: 'g-phone', prompt: 'Make it look great on a phone first, then on a laptop. Buttons should be big enough to tap.' },
  ];

  function mountGlow(steps) {
    const app = document.getElementById('glow-app');
    const prompt = document.getElementById('glow-prompt');
    let timer;
    steps.innerHTML = GLOW.map((step, i) => `<li><button type="button" data-step="${i + 1}" aria-pressed="false">${step.name}</button></li>`).join('')
      + '<li><button type="button" data-step="0">Start over</button></li>';

    steps.addEventListener('click', (e) => {
      const button = e.target.closest('[data-step]');
      if (!button) return;
      const level = Number(button.dataset.step);
      GLOW.forEach((step, i) => app.classList.toggle(step.cls, i < level));
      for (const b of steps.querySelectorAll('[data-step]')) {
        const n = Number(b.dataset.step);
        b.classList.toggle('on', n > 0 && n <= level);
        if (n) b.setAttribute('aria-pressed', String(n === level));
      }
      prompt.parentElement.hidden = level === 0;
      if (level) prompt.textContent = GLOW[level - 1].prompt;
      // From the Loading step on, replay a fake load so the placeholders and motion show.
      clearTimeout(timer);
      app.classList.toggle('loading', level >= 3);
      if (level >= 3) timer = setTimeout(() => app.classList.remove('loading'), 1200);
    });
  }

  const mounts = { goals: mountGoals, 'font-grid': mountFonts, kit: mountKit, 'glow-steps': mountGlow };
  for (const [id, mount] of Object.entries(mounts)) {
    const el = document.getElementById(id);
    if (el) mount(el);
  }
  // The cards render after the browser has already jumped to #hash, so jump again.
  document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: 'instant' });
})();
