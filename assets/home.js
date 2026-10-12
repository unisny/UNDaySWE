// Home page: fills in the four spark prompts and runs the 3-sentence pitch builder.
(() => {
  const { esc, starterPrompt, store, APIS } = window.UND;

  const GEOCODE = 'https://geocoding-api.open-meteo.com/v1/search?name=CITY&count=1';

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

  for (const pre of document.querySelectorAll('pre[data-spark]')) {
    const spark = SPARKS[pre.dataset.spark];
    pre.textContent = starterPrompt({ ...spark, extra: spark.extra.join('\n') });
  }

  // ---------- "Live right now" panel ----------

  const degrees = (value, pos, neg) => `${Math.abs(value).toFixed(1)}°${value >= 0 ? pos : neg}`;
  const LIVE = [
    { api: 'quakes', sdg: 11, label: 'earthquakes on Earth in the last 24 hours', pick: (d) => d.features.length.toLocaleString('en-US') },
    { api: 'air', sdg: 3, label: 'air quality index at the UN right now (0–50 is good)', pick: (d) => d.current.us_aqi },
    { api: 'iss', sdg: 17, label: 'where the space station is right now', pick: (d) => `${degrees(d.latitude, 'N', 'S')}, ${degrees(d.longitude, 'E', 'W')}` },
    {
      api: 'inat', sdg: 15, label: 'latest verified wildlife sighting near the UN',
      url: 'https://api.inaturalist.org/v1/observations?lat=40.7489&lng=-73.968&radius=2&per_page=1&order_by=observed_on&quality_grade=research',
      pick: (d) => d.results[0]?.taxon?.preferred_common_name || d.results[0]?.taxon?.name,
    },
  ];

  const liveList = document.getElementById('live-list');
  if (liveList) {
    liveList.innerHTML = LIVE.map((item, i) => `<li style="--c: var(--sdg-${item.sdg})"><a href="apis.html#api-${item.api}">`
      + `<span class="v" id="live-${i}">…</span><span class="k">${esc(item.label)}</span></a></li>`).join('');
    LIVE.forEach(async (item, i) => {
      const valueEl = document.getElementById(`live-${i}`);
      try {
        const res = await fetch(item.url || APIS.find((api) => api.id === item.api).url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        valueEl.textContent = item.pick(await res.json()) ?? '–';
      } catch {
        valueEl.textContent = '–';
      }
    });
  }

  // ---------- pitch builder ----------

  const form = document.getElementById('pitch-form');
  if (!form) return;

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
      ? 'Pitch ready. Practice saying it out loud in under a minute, then copy your prompt.'
      : `Fill in ${missing} more blank${missing > 1 ? 's' : ''} before you prompt the AI.`;
    out.wrap.hidden = !ready;

    if (ready) {
      const pitch = `Right now, people who care about ${v.topic} have to deal with ${v.pain}. `
        + `My app makes this instantly better by ${v.feature}. `
        + `If it existed tomorrow, it would change how people ${v.change}.`;
      out.prompt.textContent = starterPrompt({ idea: pitch, url: api?.url, docs: api?.docs });
    }
  }

  form.addEventListener('input', update);
  form.addEventListener('submit', (e) => e.preventDefault());
  update();
})();
