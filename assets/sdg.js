// "Start here" explorer for the UN's official SDG API (unstats.un.org/sdgapi):
// pick a goal, an indicator and a place, and see the official numbers live.
(() => {
  const { esc, starterPrompt, copyText, flash, SDG_NAMES, LIGHT_TEXT } = window.UND;
  const root = document.getElementById('sdg-explorer');
  if (!root) return;

  const API = 'https://unstats.un.org/sdgapi/v1/sdg';
  const DOCS = 'https://unstats.un.org/sdgapi/swagger/';
  // Dimension values that mean "everyone" rather than a breakdown.
  const TOTAL = /^(ALLAREA|BOTHSEX|ALLAGE|_T|TOTAL)$/;

  const $ = (id) => document.getElementById(id);
  const goals = $('sdg-goals');
  const indicatorSelect = $('sdg-indicator');
  const areaSelect = $('sdg-area');
  const result = $('sdg-result');
  const state = { goal: 7, targets: [], url: '', request: 0 };

  async function getJson(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`the UN server answered ${res.status}`);
    return res.json();
  }

  const fmt = (n) => n.toLocaleString('en-US', { maximumFractionDigits: Math.abs(n) >= 100 ? 0 : 1 });

  // For each series, keep the breakdown that best represents "everyone" (e.g. both sexes, all areas).
  function pickSeries(rows) {
    const groups = new Map();
    for (const row of rows) {
      const value = parseFloat(row.value);
      if (!Number.isFinite(value)) continue;
      const reportingType = row.dimensions['Reporting Type'];
      const dims = Object.entries(row.dimensions).filter(([name]) => name !== 'Reporting Type');
      const key = `${row.series}|${reportingType}|${JSON.stringify(dims)}`;
      if (!groups.has(key)) {
        const breakdownDims = dims.filter(([, v]) => !TOTAL.test(v));
        const totals = dims.length - breakdownDims.length;
        groups.set(key, {
          series: row.series, name: row.seriesDescription, units: row.attributes?.Units,
          breakdown: breakdownDims.map(([k, v]) => `${k}: ${v}`).join(', '),
          // Prefer "total" values over breakdowns; a global ('G') figure breaks ties.
          score: 2 * totals - dims.length + (reportingType === 'G' ? 0.5 : 0),
          points: [],
        });
      }
      groups.get(key).points.push([row.timePeriodStart, value]);
    }
    const best = new Map();
    for (const g of groups.values()) {
      const current = best.get(g.series);
      const better = !current || g.score > current.score
        || (g.score === current.score && g.points.length > current.points.length);
      if (better) best.set(g.series, g);
    }
    return [...best.values()].slice(0, 3).map((g) => ({ ...g, points: g.points.sort((a, b) => a[0] - b[0]) }));
  }

  function sparkline(points) {
    if (points.length < 2) return '';
    const xs = points.map((p) => p[0]);
    const ys = points.map((p) => p[1]);
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const coords = points.map(([x, y]) => [((x - x0) / (x1 - x0 || 1)) * 196 + 2, 44 - ((y - y0) / (y1 - y0 || 1)) * 40]);
    const [lx, ly] = coords[coords.length - 1];
    return `<svg class="series-spark" viewBox="0 0 200 48" preserveAspectRatio="none" aria-hidden="true">
      <polyline points="${coords.map((c) => c.map((n) => n.toFixed(1)).join(',')).join(' ')}"></polyline>
      <circle cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="3.5"></circle></svg>`;
  }

  function seriesHtml(s) {
    const [firstYear, first] = s.points[0];
    const [lastYear, last] = s.points[s.points.length - 1];
    const unit = s.units === 'PERCENT' ? '%' : '';
    const range = firstYear < lastYear ? `${firstYear}: ${fmt(first)}${unit} → ${lastYear}: ${fmt(last)}${unit}` : `${lastYear}`;
    return `
      <div class="series">
        <p class="series-name">${esc(s.name)}</p>
        <div class="series-value">${esc(fmt(last))}<small>${unit}</small></div>
        <p class="series-meta">${esc(range)}${s.breakdown ? ` · ${esc(s.breakdown)}` : ''}</p>
        ${sparkline(s.points)}
      </div>`;
  }

  function targetOptgroup(target) {
    const options = target.indicators.map((i) => {
      const text = i.description.length > 90 ? `${i.description.slice(0, 90)}…` : i.description;
      return `<option value="${esc(i.code)}">${esc(i.code)} · ${esc(text)}</option>`;
    });
    return `<optgroup label="Target ${esc(target.code)}">${options.join('')}</optgroup>`;
  }

  const currentTarget = () => state.targets.find((t) => t.indicators.some((i) => i.code === indicatorSelect.value));

  async function loadData() {
    const target = currentTarget();
    if (!target) return;
    $('sdg-target').innerHTML = `<b>The 2030 target · ${esc(target.code)}</b>${esc(target.title)}`;
    state.url = `${API}/Indicator/Data?indicator=${encodeURIComponent(indicatorSelect.value)}&areaCode=${encodeURIComponent(areaSelect.value)}&pageSize=1000`;
    $('sdg-url').textContent = state.url;
    result.innerHTML = '<p class="status">Loading official UN data… (big indicators can take a few seconds)</p>';
    const request = ++state.request;
    try {
      const data = await getJson(state.url);
      if (request !== state.request) return; // a newer choice is already loading
      const series = pickSeries(data.data);
      result.innerHTML = series.length
        ? series.map(seriesHtml).join('')
        : '<p class="status">The UN has no numbers for this indicator here yet. Try World, another country, or another indicator.</p>';
    } catch (err) {
      if (request === state.request) result.innerHTML = `<p class="status err">Couldn’t load it: ${esc(err.message)}. Try again in a minute.</p>`;
    }
  }

  async function loadGoal(goal) {
    state.goal = goal;
    root.style.setProperty('--c', `var(--sdg-${goal})`);
    for (const tile of goals.children) tile.setAttribute('aria-pressed', String(Number(tile.dataset.goal) === goal));
    $('sdg-goal-name').textContent = `Goal ${goal}: ${SDG_NAMES[goal]}`;
    indicatorSelect.disabled = true;
    try {
      const [data] = await getJson(`${API}/Goal/${goal}/Target/List?includechildren=true`);
      if (state.goal !== goal) return;
      state.targets = data.targets;
      indicatorSelect.innerHTML = data.targets.map(targetOptgroup).join('');
      indicatorSelect.disabled = false;
      loadData();
    } catch (err) {
      if (state.goal === goal) result.innerHTML = `<p class="status err">Couldn’t load Goal ${goal}: ${esc(err.message)}. Pick it again in a minute.</p>`;
    }
  }

  async function loadAreas() {
    const areas = await getJson(`${API}/GeoArea/List`);
    const others = areas.filter((a) => a.geoAreaCode !== '1').sort((a, b) => a.geoAreaName.localeCompare(b.geoAreaName));
    areaSelect.innerHTML = '<option value="1">World</option>'
      + others.map((a) => `<option value="${esc(a.geoAreaCode)}">${esc(a.geoAreaName)}</option>`).join('');
  }

  goals.innerHTML = SDG_NAMES.slice(1).map((name, i) => {
    const n = i + 1;
    return `<button type="button" class="goal-tile${LIGHT_TEXT.has(n) ? ' light-text' : ''}" style="--c: var(--sdg-${n})" `
      + `data-goal="${n}" aria-pressed="false" title="Goal ${n}: ${esc(name)}">${n}</button>`;
  }).join('');

  goals.addEventListener('click', (e) => {
    const tile = e.target.closest('[data-goal]');
    if (tile) loadGoal(Number(tile.dataset.goal));
  });
  indicatorSelect.addEventListener('change', loadData);
  areaSelect.addEventListener('change', loadData);
  $('sdg-copy-url').addEventListener('click', async (e) => flash(e.currentTarget, await copyText(state.url)));
  $('sdg-prompt').addEventListener('click', async (e) => {
    const target = currentTarget();
    const indicator = target?.indicators.find((i) => i.code === indicatorSelect.value);
    const place = areaSelect.selectedOptions[0]?.textContent || 'the world';
    const prompt = starterPrompt({
      idea: `An "Are we on track for 2030?" page for ${place}. Show "${indicator?.description}" over the years, and how far it is from the UN's 2030 target: "${target?.title}". Make it feel like a progress bar toward 2030.`,
      url: state.url,
      docs: DOCS,
      extra: [
        'Details:',
        '- The numbers are in "data". Each item has "timePeriodStart" (the year), "value" (a string, so convert it to a number), "seriesDescription" and "dimensions" (breakdowns like Sex or Location).',
        '- Some indicators are split by sex, age or city/countryside. Start with the totals (dimension values like BOTHSEX, ALLAGE or ALLAREA).',
        `- Let me switch countries with a dropdown filled from ${API}/GeoArea/List`,
      ].join('\n'),
    });
    flash(e.currentTarget, await copyText(prompt));
  });

  loadAreas().catch(() => { /* keep the World-only fallback option */ });
  loadGoal(state.goal);
})();
