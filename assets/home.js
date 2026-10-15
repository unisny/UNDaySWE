// Home page: the four sparks (prompts plus a live glimpse of each one's data),
// the "Live right now" panel, the 3-sentence pitch builder, and the stat counters.
(() => {
  const { SKELETON, esc, starterPrompt, store, copyText, flash, whenVisible, reducedMotion, APIS } = window.UND;

  const HQ = 'latitude=40.7489&longitude=-73.968'; // UN Headquarters, New York
  const GEOCODE = 'https://geocoding-api.open-meteo.com/v1/search?name=CITY&count=1';

  async function getJson(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  const SPARKS = {
    quakes: {
      idea: '"While You Slept", a morning text from planet Earth. It tells me how many earthquakes happened while I was asleep, shows the biggest one, and puts them all on a map.',
      url: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson',
      docs: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php',
      extra: [
        'Details:',
        '- Let me set when I went to sleep and woke up (default 11 p.m. to 7 a.m.). Only count quakes in that window.',
        '- Start with one big sentence, like "While you slept, Earth shook __ times." Then show the biggest quake: magnitude, place and time.',
        '- Plot every quake on a world map using Leaflet with OpenStreetMap tiles (no key needed). Bigger circles for bigger quakes.',
      ],
    },
    birthday: {
      idea: '"Birthday Heat": I type my birthday and a city, and the app shows how the weather on my birthday has changed since 1940.',
      url: 'https://archive-api.open-meteo.com/v1/archive?latitude=LAT&longitude=LON&start_date=1940-01-01&end_date=2025-12-31&daily=temperature_2m_max&timezone=auto',
      docs: 'https://open-meteo.com/en/docs/historical-weather-api',
      extra: [
        'Details:',
        `- First turn the city into LAT and LON with ${GEOCODE} (also free, no key).`,
        "- One request covers every day from 1940 to 2025. For each year, average the 7 days around my birthday so one freak day doesn't skew it.",
        '- Draw a chart of those yearly values with a trend line. Chart.js from a CDN is fine.',
        '- End with one sentence I could share, like "My birthday in New York is __ °C warmer than in the 1950s", using the real numbers.',
      ],
    },
    snacks: {
      idea: '"Snack Battle": I enter the barcodes of two snacks from my bag, and they battle on health, the planet, and how processed they are.',
      url: 'https://world.openfoodfacts.org/api/v2/product/BARCODE.json?fields=product_name,brands,image_front_small_url,nutriscore_grade,ecoscore_grade,nova_group,packaging_materials_tags',
      docs: 'https://openfoodfacts.github.io/openfoodfacts-server/api/',
      extra: [
        'Details:',
        '- Show the two products side by side with their photos.',
        '- Three rounds: Nutri-Score (health, A is best), Eco-Score (planet, A is best) and NOVA group (1 = whole food, 4 = ultra-processed). Announce a winner for each round and overall.',
        '- Some grades come back as "unknown" or "not-applicable", and some barcodes aren\'t in the database. Handle both nicely.',
        '- Test barcodes: 0028400090896 (Doritos) and 0044000032029 (Oreo).',
      ],
    },
    wildlife: {
      idea: '"Real-Life Pokédex": a collection of the wild species people have spotted near me, with photos, rarity, and a way to mark the ones I\'ve "caught" myself.',
      url: 'https://api.inaturalist.org/v1/observations/species_counts?lat=LAT&lng=LON&radius=1&quality_grade=research&per_page=50',
      docs: 'https://api.inaturalist.org/v1/docs/',
      extra: [
        'Details:',
        `- Get LAT and LON from the browser with navigator.geolocation, or let me type a city and use ${GEOCODE} instead.`,
        '- Show each species as a card: photo (taxon.default_photo.medium_url), common name (taxon.preferred_common_name), and how many times it has been seen ("count").',
        '- Species seen fewer times are rarer, so give them a shinier card.',
        '- Let me tap a card to mark it "caught", and remember that with localStorage.',
      ],
    },
  };

  document.addEventListener('click', async (e) => {
    const button = e.target.closest('[data-spark]');
    if (!button) return;
    const spark = SPARKS[button.dataset.spark];
    flash(button, await copyText(starterPrompt({ ...spark, extra: spark.extra.join('\n') })));
  });

  // ---------- "Live right now" panel ----------

  // The specific-prompt mock in "Your AI is a lazy intern" shows the real air quality.
  function showAirSign(aqi) {
    const go = aqi <= 100;
    let verdict = 'not great';
    if (aqi <= 50) verdict = 'good';
    else if (go) verdict = 'okay';
    const sign = document.getElementById('mock-go');
    sign.textContent = go ? 'GO' : 'WAIT';
    document.getElementById('mock-aqi').textContent = `Air quality ${aqi} right now · ${verdict} for a run`;
    if (!go) sign.parentElement.style.background = 'var(--sdg-9)';
  }

  const degrees = (value, pos, neg) => `${Math.abs(value).toFixed(1)}°${value >= 0 ? pos : neg}`;
  const LIVE = [
    { api: 'quakes', sdg: 11, label: 'earthquakes on Earth in the last 24 hours', pick: (d) => d.features.length.toLocaleString('en-US') },
    { api: 'air', sdg: 3, label: 'air quality index at the UN (0–50 is good)', pick: (d) => d.current.us_aqi, onValue: showAirSign },
    { api: 'iss', sdg: 17, label: 'where the space station is right now', pick: (d) => `${degrees(d.latitude, 'N', 'S')}, ${degrees(d.longitude, 'E', 'W')}` },
    {
      api: 'inat', sdg: 15, label: 'latest verified wildlife sighting near the UN',
      url: 'https://api.inaturalist.org/v1/observations?lat=40.7489&lng=-73.968&radius=2&per_page=1&order_by=observed_on&quality_grade=research',
      pick: (d) => d.results[0]?.taxon?.preferred_common_name || d.results[0]?.taxon?.name,
    },
  ];

  const liveList = document.getElementById('live-list');
  liveList.innerHTML = LIVE.map((item, i) => `<li style="--c: var(--sdg-${item.sdg})"><a href="apis.html#api-${item.api}">`
    + `<span class="v" id="live-${i}">…</span><span class="k">${esc(item.label)}</span></a></li>`).join('');
  LIVE.forEach(async (item, i) => {
    const valueEl = document.getElementById(`live-${i}`);
    try {
      const value = item.pick(await getJson(item.url || APIS.find((api) => api.id === item.api).url));
      valueEl.textContent = value ?? '–';
      if (value != null) item.onValue?.(value);
    } catch {
      valueEl.textContent = '–';
    }
  });

  // ---------- Spark 2: birthday heat, five years side by side ----------

  const YEARS = [1945, 1965, 1985, 2005, 2025];
  const bday = document.getElementById('bday');
  const bars = document.getElementById('bday-bars');
  const bdayNote = document.getElementById('bday-note');
  bars.innerHTML = YEARS.map((year) => `<div class="bar"><b>…</b><i></i><small>${year}</small></div>`).join('');
  const isoDay = (date) => date.toISOString().slice(0, 10);
  bday.value = isoDay(new Date());
  let bdayRequest = 0;

  // Average high for the 7 days around the birthday, so one freak day doesn't skew it.
  async function weekHigh(year, month, day) {
    const mid = Date.UTC(year, month - 1, day);
    const span = 3 * 864e5;
    const url = `https://archive-api.open-meteo.com/v1/archive?${HQ}&start_date=${isoDay(new Date(mid - span))}`
      + `&end_date=${isoDay(new Date(mid + span))}&daily=temperature_2m_max&timezone=auto`;
    const highs = (await getJson(url)).daily.temperature_2m_max.filter((t) => t != null);
    return highs.reduce((a, b) => a + b, 0) / highs.length;
  }

  async function drawBirthday() {
    const [, month, day] = bday.value.split('-').map(Number);
    if (!month || !day) return;
    const request = ++bdayRequest;
    for (const b of bars.querySelectorAll('b')) b.textContent = '…';
    try {
      const highs = await Promise.all(YEARS.map((year) => weekHigh(year, month, day)));
      if (request !== bdayRequest) return; // a newer date is already loading
      const low = Math.min(...highs) - 3;
      const range = Math.max(...highs) - low;
      [...bars.children].forEach((bar, i) => {
        const share = (highs[i] - low) / range;
        bar.querySelector('b').textContent = `${highs[i].toFixed(1)}°`;
        bar.querySelector('i').style.cssText = `--h: ${Math.round(10 + share * 75)}%; --p: ${Math.round(share * 100)}%`;
      });
      bdayNote.textContent = 'New York · average high that week, °C';
    } catch {
      if (request === bdayRequest) bdayNote.textContent = 'Couldn’t load the weather. Try again in a minute.';
    }
  }
  bday.addEventListener('change', drawBirthday);
  whenVisible(bars, drawBirthday);

  // ---------- Spark 3: snack battle ----------

  const SNACKS = ['0028400090896', '0044000032029']; // Doritos, Oreo
  const GRADES = { a: '#038141', b: '#85bb2f', c: '#fecb02', d: '#ee8100', e: '#e63e11' };
  const NOVA = { 1: '#038141', 2: '#85bb2f', 3: '#ee8100', 4: '#e63e11' };
  const ROUNDS = [['Health', 'nutriscore_grade', GRADES], ['Planet', 'ecoscore_grade', GRADES], ['Processed', 'nova_group', NOVA]];
  const battle = document.getElementById('battle');

  async function loadBattle() {
    battle.innerHTML = SKELETON;
    try {
      const products = await Promise.all(SNACKS.map(async (code) => {
        const data = await getJson(`https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=brands,image_front_small_url,nutriscore_grade,ecoscore_grade,nova_group`);
        return data.product;
      }));
      const who = products.map((p) => {
        const name = esc(p.brands.split(',')[0]);
        const img = p.image_front_small_url?.startsWith('https://') ? `<img src="${esc(p.image_front_small_url)}" alt="" loading="lazy">` : '';
        return `<div class="who">${img}${name}</div>`;
      }).join('');
      // A lower letter or number wins the round (A beats B, NOVA 1 beats 4).
      const rounds = ROUNDS.map(([label, key, colors]) => {
        const [a, b] = products.map((p) => (colors[p[key]] ? String(p[key]) : '?'));
        const grade = (mine, theirs) => {
          const win = mine !== '?' && (theirs === '?' || mine < theirs);
          return `<span class="grade${win ? ' win' : ''}" style="--g: ${colors[mine] || 'var(--muted)'}">${mine}</span>`;
        };
        return `<span class="k">${label}</span>${grade(a, b)}${grade(b, a)}`;
      }).join('');
      battle.innerHTML = '<div class="peek-status"><span class="dot" aria-hidden="true"></span>live · Open Food Facts</div>'
        + `<div class="battle"><span></span>${who}${rounds}</div>`;
    } catch (err) {
      battle.innerHTML = `<div class="peek-status err">Couldn’t load the snacks: ${esc(err.message)}. Try again in a minute.</div>`;
    }
  }
  whenVisible(battle, loadBattle);

  // ---------- Stats count up when they scroll into view ----------

  const figs = document.querySelectorAll('[data-count]');
  if ('IntersectionObserver' in window && !reducedMotion()) {
    const counter = new IntersectionObserver((entries) => {
      for (const { isIntersecting, target: fig } of entries) {
        if (!isIntersecting) continue;
        counter.unobserve(fig);
        const goal = Number(fig.dataset.count);
        const start = performance.now();
        const tick = (now) => {
          const t = Math.min(1, (now - start) / 1400);
          fig.textContent = `${Math.round(goal * (1 - (1 - t) ** 3))}%`;
          if (t < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.8 });
    for (const fig of figs) {
      fig.textContent = '0%';
      counter.observe(fig);
    }
  }

  // ---------- pitch builder ----------

  const form = document.getElementById('pitch-form');
  const select = form.elements.api;
  select.innerHTML = '<option value="">Let the AI suggest one</option>'
    + APIS.map((api) => `<option value="${api.id}">${esc(api.name)}</option>`).join('');

  const fields = ['topic', 'pain', 'feature', 'api', 'change'];
  for (const name of fields) form.elements[name].value = store.get(`pitch:${name}`) || '';

  const out = {
    text: document.getElementById('pitch-text'),
    gate: document.getElementById('pitch-gate'),
    wrap: document.getElementById('pitch-prompt-wrap'),
    prompt: document.getElementById('pitch-prompt'),
  };

  const clean = (s) => s.trim().replace(/[.!?]+$/, '');
  const slot = (value, blank) => (value
    ? `<span class="filled">${esc(value)}</span>`
    : `<span class="blank">${esc(blank)}</span>`);

  function update() {
    const v = Object.fromEntries(fields.map((name) => [name, clean(form.elements[name].value)]));
    for (const name of fields) store.set(`pitch:${name}`, form.elements[name].value);
    const api = APIS.find((a) => a.id === v.api);
    const using = api ? `, using ${api.name}` : '';

    out.text.innerHTML = `Right now, people who care about ${slot(v.topic, '[topic]')} have to deal with ${slot(v.pain, '[annoying problem]')}. `
      + `Our app makes this instantly better by ${slot(v.feature, '[core feature]')}${esc(using)}. `
      + `If this existed tomorrow, it would change how people ${slot(v.change, '[do, see or understand something]')}.`;

    const missing = ['topic', 'pain', 'feature', 'change'].filter((name) => !v[name]).length;
    const ready = missing === 0;
    out.gate.classList.toggle('ready', ready);
    out.gate.textContent = ready
      ? 'Pitch ready. Say it out loud, then copy your first prompt.'
      : `${missing} blank${missing > 1 ? 's' : ''} to go before you prompt the AI.`;
    out.wrap.hidden = !ready;

    if (ready) {
      const pitch = `Right now, people who care about ${v.topic} have to deal with ${v.pain}. `
        + `My app makes this instantly better by ${v.feature}. `
        + `If it existed tomorrow, it would change how people ${v.change}.`;
      out.prompt.textContent = starterPrompt({ idea: pitch, url: api?.url, docs: api?.docs, extra: api?.note && `Good to know: ${api.note}` });
    }
  }

  form.addEventListener('input', update);
  form.addEventListener('submit', (e) => e.preventDefault());
  update();
})();
