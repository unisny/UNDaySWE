// Ship page: the "Air Right Now" demo project runs live with its starter prompt,
// and the GitHub Pages step builds https://USERNAME.github.io/REPO/ as you type.
(() => {
  const { esc, starterPrompt, copyText, flash, whenVisible, store } = window.UND;

  // ---------- Demo project: Air Right Now ----------

  const CITIES = [
    { name: 'New York', lat: 40.75, lon: -73.97 },
    { name: 'Delhi', lat: 28.61, lon: 77.21 },
    { name: 'Lagos', lat: 6.52, lon: 3.38 },
    { name: 'São Paulo', lat: -23.55, lon: -46.63 },
  ];
  const AIR_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality'
    + `?latitude=${CITIES.map((c) => c.lat).join(',')}&longitude=${CITIES.map((c) => c.lon).join(',')}&current=us_aqi,pm2_5`;
  // US AQI bands, worst first: [lowest AQI, label, SDG color].
  const LEVELS = [[151, 'Unhealthy', 1], [101, 'Unhealthy for sensitive groups', 11], [51, 'Moderate', 7], [0, 'Good', 3]];

  // A city with no reading yet is a grey placeholder card of the same size.
  function cityCard({ name, aqi, pm }) {
    const [, label, sdg] = aqi == null ? [0, '…'] : LEVELS.find(([min]) => aqi >= min);
    return `<article class="card air-city" style="--c: ${sdg ? `var(--sdg-${sdg})` : 'var(--line-2)'}"><h3>${esc(name)}</h3>`
      + `<span class="v">${aqi == null ? '–' : Number(aqi)}</span>`
      + `<span class="tags"><span>${label}</span><span>PM2.5 ${pm == null ? '…' : Number(pm)}</span></span></article>`;
  }

  // If the cards are above the screen (say, after a jump to #online), keep what's on
  // screen in place when their height changes.
  const air = document.getElementById('air');
  function showAir(html) {
    const below = air.nextElementSibling;
    const before = below.getBoundingClientRect().top;
    air.innerHTML = html;
    if (air.getBoundingClientRect().top < 0) window.scrollBy(0, below.getBoundingClientRect().top - before);
  }

  air.innerHTML = CITIES.map(cityCard).join('');
  whenVisible(air, async () => {
    try {
      const res = await fetch(AIR_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const rows = (await res.json())
        .map((r, i) => ({ name: CITIES[i].name, aqi: r.current.us_aqi, pm: r.current.pm2_5 }))
        .sort((a, b) => (a.aqi ?? Infinity) - (b.aqi ?? Infinity));
      showAir(rows.map(cityCard).join(''));
    } catch {
      showAir('<p class="note">Couldn’t load the air data. Try again in a minute.</p>');
    }
  });

  const AIR_PROMPT = {
    idea: '"Air Right Now": a live leaderboard of the air in New York, Delhi, Lagos and São Paulo, cleanest city first.',
    url: AIR_URL,
    docs: 'https://open-meteo.com/en/docs/air-quality-api',
    extra: [
      'Details:',
      '- The API returns an array in this order: New York, Delhi, Lagos, São Paulo.',
      '- One big card per city: current.us_aqi as a huge number, current.pm2_5 underneath.',
      '- Color each card by US AQI: 0–50 green "Good", 51–100 yellow "Moderate", 101–150 orange "Unhealthy for sensitive groups", 151+ red "Unhealthy".',
      '- Add a Refresh button.',
    ].join('\n'),
  };
  const airCopy = document.getElementById('air-copy');
  airCopy.addEventListener('click', async () => flash(airCopy, await copyText(starterPrompt(AIR_PROMPT))));

  // ---------- GitHub Pages link builder ----------

  const user = document.getElementById('gh-user');
  const repo = document.getElementById('gh-repo');
  const open = document.getElementById('gh-open');
  function updateLink() {
    const name = user.value.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    const project = repo.value.trim().replace(/[^\w.-]/g, '');
    for (const input of [user, repo]) {
      input.style.width = `${Math.max(input.placeholder.length, input.value.length) + 2}ch`;
      store.set(input.id, input.value);
    }
    open.hidden = !(name && project);
    open.href = `https://${name}.github.io/${project}/`;
  }
  for (const input of [user, repo]) {
    input.value = store.get(input.id) || '';
    input.addEventListener('input', updateLink);
  }
  updateLink();
})();
