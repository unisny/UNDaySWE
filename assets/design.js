// The design kit: free front-end libraries and tools. Every CDN link is pinned
// to a version checked on 2026-10-12. Each demo is a complete mini page that
// runs in a sandboxed iframe, and students can copy it as a starting point.
(() => {
  const { esc, copyText, flash, SDG_NAMES } = window.UND;

  const CATEGORIES = {
    motion: { label: 'Animation', sdg: 10 },
    ui: { label: 'Components & styling', sdg: 17 },
    type: { label: 'Fonts & icons', sdg: 9 },
    viz: { label: 'Charts & maps', sdg: 14 },
    look: { label: 'Images & color', sdg: 15 },
  };

  const USGS = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson';
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
      id: 'gsap', name: 'GSAP', cat: 'motion', link: 'https://gsap.com',
      what: 'The animation library professionals use. Slide, fade, bounce, or animate as you scroll. Now completely free, plugins included.',
      ask: 'Use GSAP from the jsDelivr CDN to animate the cards in one after another when the data loads. Keep it under one second.',
      include: '<script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>',
      demo: {
        style: `
          .row { display: flex; gap: 10px; flex-wrap: wrap; }
          .box { width: 56px; height: 56px; border-radius: 12px; }
          button { margin-top: 20px; font: inherit; padding: 8px 14px; }`,
        body: `
          <div class="row">
            <div class="box" style="background:#e5243b"></div>
            <div class="box" style="background:#fcc30b"></div>
            <div class="box" style="background:#4c9f38"></div>
            <div class="box" style="background:#26bde2"></div>
            <div class="box" style="background:#3f7e44"></div>
            <div class="box" style="background:#19486a"></div>
          </div>
          <button id="again">Play again</button>`,
        script: `
          function play() {
            gsap.fromTo('.box',
              { y: 80, opacity: 0, rotation: -45, scale: 0.5 },
              { y: 0, opacity: 1, rotation: 0, scale: 1, duration: 0.9, stagger: 0.1, ease: 'back.out(1.7)' });
          }
          play();
          document.getElementById('again').onclick = play;`,
      },
    },
    {
      id: 'anime', name: 'Anime.js', cat: 'motion', link: 'https://animejs.com',
      what: 'A light animation engine that is great at staggering: ripple a grid, count numbers up, draw SVG lines.',
      ask: 'Use Anime.js v4 from the jsDelivr CDN to make the big number count up from 0 when it appears.',
      include: '<script src="https://cdn.jsdelivr.net/npm/animejs@4.5.0/dist/bundles/anime.umd.min.js"></script>',
      demo: {
        style: `
          .num { font-size: 44px; font-weight: 800; }
          .grid { display: grid; grid-template-columns: repeat(10, 18px); gap: 8px; margin-top: 16px; }
          .dot { width: 18px; height: 18px; border-radius: 50%; background: #56c02b; }`,
        body: `
          <div class="num"><span id="count">0</span> species</div>
          <div>spotted within 2 km of UN Headquarters</div>
          <div class="grid" id="grid"></div>`,
        script: `
          const { animate, stagger } = anime;
          const grid = document.getElementById('grid');
          for (let i = 0; i < 50; i++) grid.insertAdjacentHTML('beforeend', '<div class="dot"></div>');

          const counter = { value: 0 };
          animate(counter, {
            value: 1476,
            duration: 2000,
            ease: 'outExpo',
            onUpdate: () => { document.getElementById('count').textContent = Math.round(counter.value).toLocaleString(); },
          });
          animate('.dot', {
            scale: [0, 1],
            delay: stagger(40, { grid: [10, 5], from: 'center' }),
          });`,
      },
    },
    {
      id: 'motion', name: 'Motion', cat: 'motion', link: 'https://motion.dev',
      what: 'Smooth, springy, physics-based animation from the makers of Framer Motion. Works in plain JavaScript and in React.',
      ask: 'Use Motion (motion.dev) from the jsDelivr CDN to give the result card a springy pop-in when it appears.',
      include: '<script src="https://cdn.jsdelivr.net/npm/motion@13.4.4/dist/motion.js"></script>',
      demo: {
        style: `
          .card { width: 220px; padding: 18px; border-radius: 16px; background: #0a97d9; color: white; }
          .card b { font-size: 32px; display: block; }
          button { margin-top: 18px; font: inherit; padding: 8px 14px; }`,
        body: `
          <div class="card" id="card"><b>AQI 41</b>Good day for a run</div>
          <button id="pop">Pop it in</button>`,
        script: `
          const { animate } = Motion;
          function pop() {
            animate('#card', { scale: [0.4, 1], rotate: [-12, 0] }, { type: 'spring', stiffness: 260, damping: 12 });
          }
          pop();
          document.getElementById('pop').onclick = pop;`,
      },
    },
    {
      id: 'animatecss', name: 'Animate.css', cat: 'motion', link: 'https://animate.style',
      what: 'Ready-made CSS animations: bounce, tada, rubber band, heartbeat. Add two class names and you’re done.',
      ask: 'Add Animate.css from cdnjs and make the winner card bounce in with animate__bounceIn.',
      include: '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css">',
      demo: {
        style: `
          h1 { font-size: 40px; margin: 10px 0 20px; display: inline-block; }
          button { font: inherit; padding: 6px 12px; margin: 0 6px 6px 0; }`,
        body: `
          <h1 id="title">Winner!</h1>
          <div>
            <button data-a="bounce">bounce</button>
            <button data-a="tada">tada</button>
            <button data-a="rubberBand">rubberBand</button>
            <button data-a="heartBeat">heartBeat</button>
            <button data-a="flip">flip</button>
            <button data-a="jackInTheBox">jackInTheBox</button>
          </div>`,
        script: `
          const title = document.getElementById('title');
          for (const button of document.querySelectorAll('button')) {
            button.onclick = () => {
              title.className = '';
              void title.offsetWidth; // lets the same animation play again
              title.className = 'animate__animated animate__' + button.dataset.a;
            };
          }`,
      },
    },
    {
      id: 'aos', name: 'AOS (Animate On Scroll)', cat: 'motion', link: 'https://michalsnik.github.io/aos/',
      what: 'Sections fade, slide or zoom in as you scroll down the page. One attribute per element.',
      ask: 'Use AOS (Animate On Scroll) from the jsDelivr CDN so each section fades up as I scroll.',
      include: `
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/aos@2.3.4/dist/aos.css">
        <script src="https://cdn.jsdelivr.net/npm/aos@2.3.4/dist/aos.js"></script>`,
      note: 'Scroll inside the demo box to see it work.',
      demo: {
        style: `
          section { height: 120px; margin-bottom: 24px; border-radius: 16px; display: grid; place-items: center;
            color: white; font-size: 22px; font-weight: 700; }`,
        body: `
          <p>Scroll down ↓</p>
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
      what: 'Confetti. That’s it. Perfect for “you got it right!” moments.',
      ask: 'When the user gets the answer right, fire confetti with canvas-confetti from the jsDelivr CDN.',
      include: '<script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.4/dist/confetti.browser.js"></script>',
      demo: {
        style: 'button { font: inherit; font-size: 20px; padding: 12px 20px; }',
        body: '<button id="yay">I got it right!</button>',
        script: `
          document.getElementById('yay').onclick = () => {
            confetti({ particleCount: 150, spread: 80, origin: { y: 0.7 } });
          };`,
      },
    },
    {
      id: 'lottie', name: 'LottieFiles', cat: 'motion', link: 'https://lottiefiles.com/free-animations', account: '13+',
      what: 'Thousands of free, designer-made animations (loaders, weather icons, celebrations) that you drop in with one tag.',
      ask: 'Show this Lottie animation while the data loads, using the dotlottie-wc web component from the jsDelivr CDN: PASTE-THE-ANIMATION-LINK',
      include: '<script type="module" src="https://cdn.jsdelivr.net/npm/@lottiefiles/dotlottie-wc@0.9.28/dist/dotlottie-wc.js"></script>',
      note: 'Browse free animations without an account. To download one or copy its link you need a free LottieFiles account (13+). Free animations can be used and changed without paying.',
      demo: {
        body: `
          <dotlottie-wc
            src="https://lottie.host/4db68bbd-31f6-4cd8-84eb-189de081159a/IGmMCqhzpt.lottie"
            style="width: 240px; height: 240px"
            autoplay loop>
          </dotlottie-wc>`,
      },
    },
    {
      id: 'animista', name: 'Animista', cat: 'motion', link: 'https://animista.net',
      what: 'Play with CSS animations, tweak the speed and style, then copy the code. Nothing to install.',
      ask: 'Here is a CSS animation from Animista: PASTE-THE-CSS. Use it on the headline when the page loads.',
    },

    // ---------- Components & styling ----------
    {
      id: 'shadcn', name: 'shadcn/ui', cat: 'ui', link: 'https://ui.shadcn.com', react: true,
      what: 'The component set behind a huge number of today’s apps: buttons, dialogs, cards, tabs, charts. You copy the code into your project, so you own it.',
      ask: 'Build this as a React app with Tailwind and shadcn/ui components.',
      note: 'Needs a React project, for example ChatGPT’s Canvas in React mode or Lane 3 (Codespaces). Want the same look in a single HTML file? Use Basecoat, next.',
    },
    {
      id: 'basecoat', name: 'Basecoat', cat: 'ui', link: 'https://basecoatui.com',
      what: 'The shadcn/ui look with plain HTML classes and no React. Add one stylesheet, then use classes like btn, card and input.',
      ask: 'Style the page with Basecoat (the shadcn/ui look for plain HTML) from the jsDelivr CDN: use its btn, card, input and badge classes.',
      include: '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/basecoat-css@1.0.2/dist/basecoat.cdn.min.css">',
      demo: {
        body: `
          <div class="card" style="max-width: 380px">
            <header>
              <h2>Snack Battle</h2>
              <p>Two snacks enter. One wins.</p>
            </header>
            <section style="display: grid; gap: 12px">
              <input class="input" placeholder="Barcode, e.g. 0028400090896">
              <div><span class="badge">Nutri-Score C</span> <span class="badge" data-variant="secondary">Eco-Score B</span></div>
            </section>
            <footer style="display: flex; gap: 8px">
              <button class="btn">Battle!</button>
              <button class="btn" data-variant="outline">Reset</button>
            </footer>
          </div>`,
        height: 320,
      },
    },
    {
      id: 'magicui', name: 'Magic UI', cat: 'ui', link: 'https://magicui.design', react: true,
      what: 'Free animated components built on shadcn/ui: shimmer buttons, marquees, number tickers, spinning globes.',
      ask: 'In my React app, use Magic UI’s Number Ticker for the big statistic.',
      note: 'Needs React, like shadcn/ui. The free components are open source; some templates cost money.',
    },
    {
      id: 'tailwind', name: 'Tailwind CSS', cat: 'ui', link: 'https://tailwindcss.com',
      what: 'Style everything with short class names right in your HTML, like p-6 rounded-2xl shadow-xl. Most AI tools already write Tailwind.',
      ask: 'Style it with Tailwind CSS using the browser build from the jsDelivr CDN.',
      include: '<script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4.3.3/dist/index.global.js"></script>',
      note: 'The browser build is meant for prototypes, which is exactly what you’re making today.',
      demo: {
        body: `
          <div class="max-w-sm rounded-2xl bg-white p-6 shadow-xl ring-1 ring-black/5">
            <p class="text-sm font-semibold uppercase tracking-wide text-emerald-700">SDG 15 · Life on land</p>
            <h2 class="mt-2 text-3xl font-bold text-gray-900">1,476 species</h2>
            <p class="mt-1 text-gray-600">spotted within 2 km of UN Headquarters.</p>
            <button class="mt-4 rounded-full bg-gray-900 px-4 py-2 font-semibold text-white hover:bg-emerald-700">See them</button>
          </div>`,
      },
    },
    {
      id: 'daisyui', name: 'daisyUI', cat: 'ui', link: 'https://daisyui.com',
      what: 'Ready-made Tailwind components (buttons, cards, badges, progress bars) plus 30+ color themes you switch with one attribute.',
      ask: 'Use Tailwind plus daisyUI from the jsDelivr CDN, with the "cupcake" theme.',
      include: `
        <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4.3.3/dist/index.global.js"></script>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/daisyui@5.7.46/daisyui.css">
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/daisyui@5.7.46/themes.css">`,
      demo: {
        body: `
          <select class="select select-sm" id="theme">
            <option>cupcake</option><option>synthwave</option><option>retro</option>
            <option>forest</option><option>aqua</option><option>light</option><option>dark</option>
          </select>
          <div class="mt-4 flex flex-wrap gap-2">
            <button class="btn btn-primary">Primary</button>
            <button class="btn btn-secondary">Secondary</button>
            <button class="btn btn-accent btn-outline">Accent</button>
          </div>
          <div class="mt-4 flex gap-2"><span class="badge badge-success">SDG 13</span><span class="badge badge-info">SDG 14</span></div>
          <progress class="progress progress-primary mt-4 w-64" value="77" max="100"></progress>
          <div class="alert alert-info mt-4 max-w-sm">77% of Kenyans have electricity.</div>`,
        script: `
          document.documentElement.dataset.theme = 'cupcake';
          document.getElementById('theme').onchange = (e) => { document.documentElement.dataset.theme = e.target.value; };`,
        height: 340,
      },
    },
    {
      id: 'pico', name: 'Pico CSS', cat: 'ui', link: 'https://picocss.com',
      what: 'Write plain HTML, add one line, and it instantly looks clean, with dark mode built in. No class names to learn.',
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
        height: 330,
      },
    },
    {
      id: 'uiverse', name: 'Uiverse', cat: 'ui', link: 'https://uiverse.io',
      what: 'Thousands of free, community-made buttons, loaders, toggles and cards in plain CSS or Tailwind. Copy, paste, done.',
      ask: 'Here is a loader from Uiverse: PASTE-THE-HTML-AND-CSS. Show it while the data loads.',
    },

    // ---------- Fonts & icons ----------
    {
      id: 'googlefonts', name: 'Google Fonts', cat: 'type', link: 'https://fonts.google.com',
      what: 'Over a thousand free font families. Pick one for headings and one for text, then paste one link tag.',
      ask: 'Use the Google Fonts "Bricolage Grotesque" for headings and "Inter" for body text.',
      include: '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@800&family=Inter&display=swap">',
      demo: {
        include: '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@800&family=Space+Grotesk:wght@700&family=Fraunces:wght@800&family=DM+Serif+Display&family=Bebas+Neue&family=Caveat:wght@700&family=Press+Start+2P&family=Inter&display=swap">',
        style: `
          #sample { font-size: 34px; line-height: 1.15; margin: 16px 0 8px; }
          p { font-family: 'Inter', sans-serif; color: #555; }`,
        body: `
          <select id="font">
            <option>Bricolage Grotesque</option><option>Space Grotesk</option><option>Fraunces</option>
            <option>DM Serif Display</option><option>Bebas Neue</option><option>Caveat</option><option>Press Start 2P</option>
          </select>
          <div id="sample">While you slept, Earth shook 82 times.</div>
          <p>Body text in Inter, which is easy to read at small sizes.</p>`,
        script: `
          const sample = document.getElementById('sample');
          const pick = document.getElementById('font');
          const show = () => { sample.style.fontFamily = "'" + pick.value + "', sans-serif"; };
          pick.onchange = show;
          show();`,
      },
    },
    {
      id: 'fontshare', name: 'Fontshare', cat: 'type', link: 'https://www.fontshare.com',
      what: 'Free, high-quality fonts from the Indian Type Foundry, like Satoshi and Clash Display. Free for personal and commercial use.',
      ask: 'Use the Fontshare fonts "Clash Display" for headings and "Satoshi" for text, with one link tag per font.',
      include: `
        <link rel="stylesheet" href="https://api.fontshare.com/v2/css?f[]=clash-display@600&display=swap">
        <link rel="stylesheet" href="https://api.fontshare.com/v2/css?f[]=satoshi@400&display=swap">`,
      demo: {
        style: `
          h1 { font-family: 'Clash Display', sans-serif; font-size: 40px; margin: 0 0 8px; }
          p { font-family: 'Satoshi', sans-serif; font-size: 18px; }`,
        body: `
          <h1>Snack Battle</h1>
          <p>Two barcodes enter. One leaves. Health, planet and processing: best of three.</p>`,
      },
    },
    {
      id: 'lucide', name: 'Lucide icons', cat: 'type', link: 'https://lucide.dev',
      what: 'More than a thousand clean, matching icons. The same set shadcn/ui uses.',
      ask: 'Add Lucide icons from the jsDelivr CDN next to each number, using <i data-lucide="..."> and lucide.createIcons().',
      include: '<script src="https://cdn.jsdelivr.net/npm/lucide@1.48.0/dist/umd/lucide.min.js"></script>',
      demo: {
        style: `
          .icons { display: flex; flex-wrap: wrap; gap: 14px; color: #3f7e44; }
          .icons svg { width: 36px; height: 36px; }`,
        body: `
          <div class="icons">
            <i data-lucide="globe"></i><i data-lucide="droplets"></i><i data-lucide="sprout"></i>
            <i data-lucide="sun"></i><i data-lucide="wind"></i><i data-lucide="leaf"></i>
            <i data-lucide="bike"></i><i data-lucide="recycle"></i><i data-lucide="fish"></i>
            <i data-lucide="trees"></i><i data-lucide="heart-pulse"></i><i data-lucide="graduation-cap"></i>
          </div>`,
        script: 'lucide.createIcons();',
      },
    },
    {
      id: 'phosphor', name: 'Phosphor Icons', cat: 'type', link: 'https://phosphoricons.com',
      what: 'A big, flexible icon family with six weights, from thin to fill. Add a stylesheet, then type <i class="ph ph-leaf"></i>.',
      ask: 'Use Phosphor Icons from the jsDelivr CDN (regular and fill styles) for the icons.',
      include: `
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@phosphor-icons/web@2.1.2/src/regular/style.css">
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@phosphor-icons/web@2.1.2/src/fill/style.css">`,
      demo: {
        style: '.icons { display: flex; flex-wrap: wrap; gap: 14px; font-size: 40px; color: #0a97d9; }',
        body: `
          <div class="icons">
            <i class="ph ph-globe-hemisphere-west"></i><i class="ph-fill ph-drop"></i><i class="ph ph-plant"></i>
            <i class="ph-fill ph-sun"></i><i class="ph ph-wind"></i><i class="ph-fill ph-leaf"></i>
            <i class="ph ph-bicycle"></i><i class="ph ph-recycle"></i><i class="ph-fill ph-fish"></i>
          </div>`,
      },
    },

    // ---------- Charts & maps ----------
    {
      id: 'chartjs', name: 'Chart.js', cat: 'viz', link: 'https://www.chartjs.org',
      what: 'Bar, line, pie and radar charts from your data in a few lines. The easiest way to chart real data.',
      ask: 'Show the yearly values as a Chart.js line chart, loaded from the jsDelivr CDN.',
      include: '<script src="https://cdn.jsdelivr.net/npm/chart.js@4.5.1/dist/chart.umd.min.js"></script>',
      note: 'The demo charts live earthquake data from the last 24 hours.',
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
                  datasets: [{ label: 'Earthquakes in the last 24 hours, by magnitude', data: counts, backgroundColor: '#fd6925' }],
                },
              });
            });`,
      },
    },
    {
      id: 'leaflet', name: 'Leaflet', cat: 'viz', link: 'https://leafletjs.com',
      what: 'Interactive maps with free OpenStreetMap tiles. Zoom, pan, markers, popups. No key needed.',
      ask: 'Put the results on a Leaflet map (from the jsDelivr CDN) with OpenStreetMap tiles and a popup on each marker.',
      include: `
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css">
        <script src="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js"></script>`,
      note: 'The demo maps every earthquake from the last 24 hours. Click a circle.',
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
        height: 320,
      },
    },
    {
      id: 'd3', name: 'D3.js', cat: 'viz', link: 'https://d3js.org',
      what: 'The most powerful data-visualization library, behind many newsroom graphics. Harder to learn, but your AI knows it well.',
      ask: 'Use D3.js v7 from the jsDelivr CDN to draw an animated bubble chart of the data.',
      include: '<script src="https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js"></script>',
    },

    // ---------- Images & color ----------
    {
      id: 'undraw', name: 'unDraw', cat: 'look', link: 'https://undraw.co',
      what: 'Free illustrations you can recolor to match your app before downloading. No credit line needed.',
      ask: 'Use this unDraw illustration on the empty state, recolored to my accent color: PASTE-THE-SVG',
    },
    {
      id: 'unsplash', name: 'Unsplash', cat: 'look', link: 'https://unsplash.com',
      what: 'Millions of free, high-quality photos. Free to use; crediting the photographer is a nice touch.',
      ask: 'Use this Unsplash photo as the header background with a dark overlay so the text stays readable: PASTE-THE-IMAGE-URL',
    },
    {
      id: 'coolors', name: 'Coolors', cat: 'look', link: 'https://coolors.co', account: 'optional',
      what: 'Press the spacebar to generate color palettes that work together. Lock the colors you like and keep going.',
      ask: 'Use this color palette from Coolors throughout the app: PASTE-THE-HEX-CODES',
    },
    {
      id: 'realtimecolors', name: 'Realtime Colors', cat: 'look', link: 'https://www.realtimecolors.com',
      what: 'Try your colors and fonts on a realistic website before you commit, then export them as CSS.',
      ask: 'Use these CSS color variables from Realtime Colors: PASTE-THE-CSS',
    },
  ];

  // ---------- rendering ----------

  const badge = (text, slow) => `<span class="badge${slow ? ' slow' : ''}">${text}</span>`;

  function cardHtml(item) {
    const cat = CATEGORIES[item.cat];
    const account = { '13+': 'Free account, 13+', optional: 'Account optional' }[item.account] || 'No account';
    const badges = badge(item.react ? 'Needs React' : 'One HTML file', item.react)
      + badge(account, item.account === '13+');
    const include = item.include ? `
        <div class="codeblock"><pre id="inc-${item.id}">${esc(dedent(item.include))}</pre><button type="button" class="copy" data-copy="#inc-${item.id}">Copy</button></div>` : '';
    return `
      <article class="card api" id="kit-${item.id}" style="--c: var(--sdg-${cat.sdg})">
        <div class="api-top">
          <h3>${esc(item.name)}</h3>
          <div class="badges">${badges}</div>
        </div>
        <p>${esc(item.what)}</p>
        <div class="idea"><b>Tell your AI</b><span id="ask-${item.id}">${esc(item.ask)}</span></div>
        ${include}
        <div class="api-actions">
          ${item.demo ? '<button type="button" class="btn btn-sm" data-demo>Try it live</button>' : ''}
          <button type="button" class="btn btn-sm btn-ghost" data-copy="#ask-${item.id}">Copy AI sentence</button>
          <a class="btn btn-sm btn-ghost" href="${esc(item.link)}" target="_blank" rel="noopener">Website ↗</a>
        </div>
        ${item.note ? `<p class="note">${esc(item.note)}</p>` : ''}
        <div class="demo" hidden></div>
      </article>`;
  }

  function showDemo(item, card) {
    const box = card.querySelector('.demo');
    const html = page({ include: item.include, ...item.demo }); // a demo's own include wins
    box.hidden = false;
    box.innerHTML = `
      <iframe title="${esc(item.name)} demo" sandbox="allow-scripts" loading="lazy" style="--h: ${item.demo.height || 260}px"></iframe>
      <details>
        <summary>See the code for this demo</summary>
        <div class="codeblock"><pre id="demo-${item.id}"></pre><button type="button" class="copy" data-copy="#demo-${item.id}">Copy</button></div>
      </details>`;
    box.querySelector('iframe').srcdoc = html;
    box.querySelector('pre').textContent = html;
    card.querySelector('[data-demo]').textContent = 'Restart demo';
  }

  function mountKit(root) {
    root.innerHTML = Object.entries(CATEGORIES).map(([id, cat]) => `
      <section class="kit-group" id="group-${id}">
        <h2>${esc(cat.label)}</h2>
        <div class="api-grid">${KIT.filter((item) => item.cat === id).map(cardHtml).join('')}</div>
      </section>`).join('');

    root.addEventListener('click', (e) => {
      const button = e.target.closest('[data-demo]');
      if (!button) return;
      const card = button.closest('.api');
      showDemo(KIT.find((item) => `kit-${item.id}` === card.id), card);
    });
  }

  function mountPalette(root) {
    root.innerHTML = SDG_HEX.map((hex, i) => `
      <button type="button" class="swatch" style="--c: ${hex}" data-hex="${hex}" title="Copy ${hex}">
        <span class="chip" aria-hidden="true"></span>
        <span><b>SDG ${i + 1}</b> ${esc(SDG_NAMES[i + 1])}</span>
        <code>${hex.toUpperCase()}</code>
      </button>`).join('');
    root.addEventListener('click', async (e) => {
      const swatch = e.target.closest('[data-hex]');
      if (!swatch) return;
      const code = swatch.querySelector('code');
      flash(code, await copyText(swatch.dataset.hex.toUpperCase()));
    });
  }

  const kit = document.getElementById('kit');
  if (kit) mountKit(kit);
  const palette = document.getElementById('palette');
  if (palette) mountPalette(palette);
  // The cards render after the browser has already jumped to #hash, so jump again.
  document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: 'instant' });
})();
