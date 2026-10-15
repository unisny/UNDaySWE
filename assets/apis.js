// The live-data catalog. Every endpoint below was tested on 2026-10-12 from a
// browser-style request: HTTPS, no key, and CORS headers that let any web page
// call it directly. `peek` turns a live response into a few real rows
// ({ cols, rows, total, images }) so students see the data, not a description.
(() => {
  const { SDG_NAMES, SKELETON, esc, sdgChip, starterPrompt, copyText, flash, whenVisible } = window.UND;

  const HQ = 'latitude=40.7489&longitude=-73.968'; // UN Headquarters, New York

  const CATEGORIES = {
    un: 'UN & countries',
    climate: 'Weather & climate',
    earth: 'Earth & space',
    nature: 'Nature & food',
    nyc: 'NYC',
    words: 'Words & art',
    fun: 'Just for fun',
  };

  // ---------- formatting helpers ----------

  const num = (n, digits = 0) => Number(n).toLocaleString('en-US', { maximumFractionDigits: digits });
  const https = (url) => (typeof url === 'string' && url.startsWith('https://') ? url : '');

  function ago(time) {
    const mins = Math.round((Date.now() - new Date(time).getTime()) / 60000);
    if (mins < 60) return `${mins} min ago`;
    const hours = Math.round(mins / 60);
    return hours < 48 ? `${hours} h ago` : `${Math.round(hours / 24)} days ago`;
  }

  // Open-Meteo sends parallel arrays ({ time: [...], temp: [...] }); turn them into rows.
  const zip = (obj, keys) => obj[keys[0]].map((_, i) => keys.map((k) => obj[k][i]));
  const table = (obj, keys) => ({ cols: keys, rows: zip(obj, keys) });

  // ---------- the catalog ----------

  const APIS = [
    {
      id: 'unsdg', name: 'UN SDG API (official)', cat: 'un', sdg: [17, 7],
      what: 'The UN’s official data for all 17 goals and 231 indicators: the numbers countries report to the UN.',
      idea: 'Pick one SDG target and build an “Are we on track for 2030?” meter for a country.',
      url: 'https://unstats.un.org/sdgapi/v1/sdg/Indicator/Data?indicator=7.1.1&areaCode=404&pageSize=200',
      docs: 'https://unstats.un.org/sdgapi/swagger/',
      note: 'Countries use UN number codes (Kenya = 404, USA = 840); list them with /v1/sdg/GeoArea/List. Indicator 7.1.1 is the share of people with electricity.',
      peek: (d) => ({
        total: d.data.length,
        cols: ['timePeriodStart', 'Location', 'value'],
        rows: [...d.data].sort((a, b) => b.timePeriodStart - a.timePeriodStart)
          .map((r) => [r.timePeriodStart, r.dimensions.Location, r.value]),
      }),
    },
    {
      id: 'worldbank', name: 'World Bank Indicators', cat: 'un', sdg: [1, 4, 9],
      what: 'Thousands of indicators for every country from 1960 to now: internet use, electricity, income, schooling, health.',
      idea: '“If our class were 30 people from Kenya”: how many would have internet, power, a diploma?',
      url: 'https://api.worldbank.org/v2/country/KEN;IND;USA;BRA/indicator/IT.NET.USER.ZS?format=json&mrnev=1',
      docs: 'https://datahelpdesk.worldbank.org/knowledgebase/articles/889392',
      note: 'Codes: IT.NET.USER.ZS internet, EG.ELC.ACCS.ZS electricity, SP.DYN.LE00.IN life expectancy. mrnev=1 means “most recent value”. It can take a few seconds.',
      manual: true,
      peek: (d) => ({ cols: ['country', 'date', 'value'], rows: d[1].map((r) => [r.country.value, r.date, num(r.value, 1)]) }),
    },
    {
      id: 'owid', name: 'Our World in Data', cat: 'un', sdg: [13, 3, 1],
      what: 'The data behind every chart on ourworldindata.org, as a CSV file: CO₂, poverty, vaccines, energy, child mortality and thousands more.',
      idea: 'A “your country vs the world” slider for any topic you care about.',
      url: 'https://ourworldindata.org/grapher/co-emissions-per-capita.csv?v=1&csvType=filtered&useColumnShortNames=true&country=USA~CHN~IND~KEN',
      docs: 'https://docs.owid.io/projects/etl/api/',
      format: 'csv',
      note: 'It’s a CSV file, not JSON. Find any chart on ourworldindata.org, take its name from the URL, and add .csv.',
      peek: (csv) => {
        const [header, ...lines] = csv.trim().split('\n');
        const latest = new Map(lines.map((line) => line.split(',')).map((row) => [row[0], row]));
        return { total: lines.length, cols: header.split(','), rows: [...latest.values()].map((r) => [r[0], r[1], r[2], num(r[3], 2)]) };
      },
    },
    {
      id: 'unhcr', name: 'UNHCR Refugee Statistics', cat: 'un', sdg: [10, 16],
      what: 'How many people have been forced to flee their homes, by country of origin and country of asylum, since 1951.',
      idea: 'Put the number in perspective: compare refugees from one country with the population of your city.',
      url: 'https://api.unhcr.org/population/v1/population/?yearFrom=2015&yearTo=2025&coo=SYR&limit=20',
      docs: 'https://api.unhcr.org/docs/refugee-statistics.html',
      note: 'coo = country of origin, coa = country of asylum (3-letter codes).',
      peek: (d) => ({
        total: d.items.length,
        cols: ['year', 'coo_name', 'refugees'],
        rows: [...d.items].sort((a, b) => b.year - a.year).map((r) => [r.year, r.coo_name, num(r.refugees)]),
      }),
    },
    {
      id: 'weather', name: 'Open-Meteo Weather', cat: 'climate', sdg: [13, 11],
      what: 'Current weather and a 16-day forecast for any point on Earth: temperature, rain, wind, UV and more.',
      idea: 'A "should I bike to school?" app that turns the whole forecast into one yes-or-no answer.',
      url: `https://api.open-meteo.com/v1/forecast?${HQ}&current=temperature_2m,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&forecast_days=5&timezone=auto`,
      docs: 'https://open-meteo.com/en/docs',
      note: 'Add &temperature_unit=fahrenheit for °F. Free for non-commercial use (10,000 calls a day).',
      peek: (d) => table(d.daily, ['time', 'temperature_2m_max', 'temperature_2m_min', 'precipitation_probability_max']),
    },
    {
      id: 'air', name: 'Open-Meteo Air Quality', cat: 'climate', sdg: [3, 11],
      what: 'Live air quality for any coordinates: US AQI, PM2.5, ozone and NO₂, plus pollen in Europe.',
      idea: 'A live leaderboard: the air in your city right now vs Delhi, Lagos and São Paulo.',
      url: `https://air-quality-api.open-meteo.com/v1/air-quality?${HQ}&current=us_aqi&hourly=us_aqi,pm2_5,ozone&forecast_hours=5&timezone=auto`,
      docs: 'https://open-meteo.com/en/docs/air-quality-api',
      note: 'US AQI: 0–50 good, 51–100 moderate, 101–150 unhealthy for sensitive groups, 151+ unhealthy.',
      peek: (d) => table(d.hourly, ['time', 'us_aqi', 'pm2_5', 'ozone']),
    },
    {
      id: 'history', name: 'Open-Meteo Historical Weather', cat: 'climate', sdg: [13],
      what: 'Daily and hourly weather for any place on Earth, all the way back to 1940.',
      idea: 'Type your birthday and see how that date’s weather has changed, decade by decade.',
      url: `https://archive-api.open-meteo.com/v1/archive?${HQ}&start_date=1945-10-22&end_date=1945-10-26&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`,
      docs: 'https://open-meteo.com/en/docs/historical-weather-api',
      note: 'The sample is the week the UN was founded (October 24, 1945). Requests longer than two weeks count as several calls toward the daily limit.',
      peek: (d) => table(d.daily, ['time', 'temperature_2m_max', 'temperature_2m_min', 'precipitation_sum']),
    },
    {
      id: 'future', name: 'Open-Meteo Climate Projections', cat: 'climate', sdg: [13],
      what: 'Day-by-day output from climate models, from 1950 to 2050, for any place.',
      idea: '“Your 2050 summer”: what July will feel like when you’re in your 40s.',
      url: `https://climate-api.open-meteo.com/v1/climate?${HQ}&start_date=2050-07-01&end_date=2050-07-31&models=MRI_AGCM3_2_S,MPI_ESM1_2_XR,CMCC_CM2_VHR4&daily=temperature_2m_max`,
      docs: 'https://open-meteo.com/en/docs/climate-api',
      note: 'These are model projections, not forecasts, so show the range across models rather than one number.',
      peek: (d) => {
        const keys = Object.keys(d.daily);
        return { total: d.daily.time.length, cols: keys.map((k) => k.replace('temperature_2m_max_', '')), rows: zip(d.daily, keys) };
      },
    },
    {
      id: 'quakes', name: 'USGS Earthquakes', cat: 'earth', sdg: [11],
      what: 'Every earthquake recorded on Earth in the past hour, day, week or month. Updated every minute.',
      idea: '“While you slept”: a morning recap of every quake since bedtime, on a map.',
      url: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson',
      docs: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php',
      note: 'Swap all_day for all_hour, all_week, 4.5_week or significant_month.',
      peek: (d) => ({
        total: d.features.length,
        cols: ['mag', 'place', 'time'],
        rows: d.features.map(({ properties: p }) => [p.mag?.toFixed(1), p.place, ago(p.time)]),
      }),
    },
    {
      id: 'eonet', name: 'NASA EONET', cat: 'earth', sdg: [13, 15],
      what: 'Natural events happening right now, tracked by NASA: wildfires, severe storms, volcanoes and sea ice.',
      idea: 'A live “what is Earth doing today?” board, with one card per event.',
      url: 'https://eonet.gsfc.nasa.gov/api/v3/events?status=open&days=30',
      docs: 'https://eonet.gsfc.nasa.gov/docs/v3',
      peek: (d) => ({
        total: d.events.length,
        cols: ['title', 'category', 'date'],
        rows: d.events.map((e) => [e.title, e.categories[0].title, e.geometry.at(-1).date.slice(0, 10)]),
      }),
    },
    {
      id: 'iss', name: 'Where the ISS at?', cat: 'earth', sdg: [9, 17],
      what: 'Live position, height and speed of the International Space Station.',
      idea: 'Track the ISS and show the weather wherever it is right now (mash it up with Open-Meteo).',
      url: 'https://api.wheretheiss.at/v1/satellites/25544',
      docs: 'https://wheretheiss.at/w/developer',
      note: 'Keep it to about one request per second.',
      peek: (d) => ({
        cols: ['latitude', 'longitude', 'altitude', 'velocity', 'visibility'],
        rows: [[d.latitude.toFixed(2), d.longitude.toFixed(2), num(d.altitude), num(d.velocity), d.visibility]],
      }),
    },
    {
      id: 'inat', name: 'iNaturalist', cat: 'nature', sdg: [15, 14],
      what: 'Wildlife sightings from people’s phones all over the world, with photos, names and locations.',
      idea: 'A real-life Pokédex of species spotted near you, with photos and “caught” badges.',
      url: 'https://api.inaturalist.org/v1/observations?lat=40.7489&lng=-73.968&radius=2&per_page=5&order_by=observed_on&photos=true&quality_grade=research',
      docs: 'https://api.inaturalist.org/v1/docs/',
      note: 'Try /v1/observations/species_counts for a ranked list of every species seen in an area.',
      peek: (d) => ({
        total: d.total_results,
        images: d.results.map((o) => ({
          src: https(o.photos[0]?.url).replace('/square.', '/small.'),
          caption: o.taxon?.preferred_common_name || o.taxon?.name,
        })),
      }),
    },
    {
      id: 'food', name: 'Open Food Facts', cat: 'nature', sdg: [12, 3],
      what: 'A crowd-built database of millions of food products by barcode: Nutri-Score, Eco-Score, how processed it is, packaging.',
      idea: 'Snack Battle: two barcodes enter, one wins on health and on the planet.',
      url: 'https://world.openfoodfacts.org/api/v2/product/0028400090896.json?fields=product_name,brands,nutriscore_grade,ecoscore_grade,nova_group,packaging_materials_tags,image_front_small_url',
      docs: 'https://openfoodfacts.github.io/openfoodfacts-server/api/',
      note: 'The barcode is the number under the stripes. Nutri-Score and Eco-Score go from A (best) to E; NOVA goes from 1 (whole food) to 4 (ultra-processed). To search by name: /api/v2/search?categories_tags_en=chips',
      peek: ({ product: p }) => ({
        cols: ['product_name', 'nutriscore_grade', 'ecoscore_grade', 'nova_group'],
        rows: [[`${p.brands} ${p.product_name}`, p.nutriscore_grade, p.ecoscore_grade, p.nova_group]],
        images: [{ src: https(p.image_front_small_url), caption: p.product_name }],
      }),
    },
    {
      id: 'meals', name: 'TheMealDB', cat: 'nature', sdg: [2, 12],
      what: 'Recipes with photos from around the world, searchable by ingredient, country or category.',
      idea: 'Leftover Rescue: pick what’s in your fridge, get dinner ideas, waste less food.',
      url: 'https://www.themealdb.com/api/json/v1/1/filter.php?i=rice',
      docs: 'https://www.themealdb.com/api.php',
      note: 'The 1 in the URL is the free public test key, so there’s nothing to sign up for. Get a full recipe with lookup.php?i=MEAL_ID.',
      peek: (d) => ({
        total: d.meals.length,
        images: d.meals.map((m) => ({ src: https(m.strMealThumb) && `${m.strMealThumb}/preview`, caption: m.strMeal })),
      }),
    },
    {
      id: 'nyc311', name: 'NYC Open Data: 311', cat: 'nyc', sdg: [11, 3],
      what: 'Every complaint New Yorkers report to 311 (rats, noise, heat, potholes), updated daily. One of thousands of NYC datasets.',
      idea: 'A “rat radar” for your zip code, or a map of noise complaints around school.',
      url: 'https://data.cityofnewyork.us/resource/erm2-nwe9.json?complaint_type=Rodent&$order=created_date%20DESC&$limit=5&$select=created_date,descriptor,borough,incident_zip',
      docs: 'https://dev.socrata.com/foundry/data.cityofnewyork.us/erm2-nwe9',
      note: 'It can take a few seconds. Try complaint_type=Noise - Residential or HEAT/HOT WATER. More datasets at opendata.cityofnewyork.us.',
      manual: true,
      peek: (d) => ({
        cols: ['created_date', 'descriptor', 'borough', 'incident_zip'],
        rows: d.map((r) => [ago(r.created_date), r.descriptor, r.borough, r.incident_zip]),
      }),
    },
    {
      id: 'citibike', name: 'Citi Bike Live', cat: 'nyc', sdg: [11, 13],
      what: 'Live count of bikes, e-bikes and empty docks at every Citi Bike station in New York City (NYC).',
      idea: '“Is there a bike?”: check the three docks nearest school before the bell rings.',
      url: 'https://gbfs.citibikenyc.com/gbfs/en/station_status.json',
      docs: 'https://github.com/MobilityData/gbfs/blob/master/gbfs.md',
      note: 'Station names and locations are in station_information.json in the same folder. Big file (about 1 MB).',
      manual: true,
      peek: (d) => ({
        total: d.data.stations.length,
        cols: ['station_id', 'num_bikes_available', 'num_ebikes_available', 'num_docks_available'],
        rows: d.data.stations.map((s) => [s.station_id, s.num_bikes_available, s.num_ebikes_available, s.num_docks_available]),
      }),
    },
    {
      id: 'wikipedia', name: 'Wikipedia', cat: 'words', sdg: [4],
      what: 'A clean summary and picture for any Wikipedia article, plus “On this day” history.',
      idea: 'A “today in history” feed that only shows events connected to one SDG.',
      url: 'https://en.wikipedia.org/api/rest_v1/page/summary/Sustainable_Development_Goals',
      docs: 'https://en.wikipedia.org/api/rest_v1/',
      note: 'On this day: /api/rest_v1/feed/onthisday/events/10/24 (month/day). Swap “en” for “fr”, “es”, “ar” and 300+ other languages.',
      peek: (d) => ({
        cols: ['title', 'description', 'extract'],
        rows: [[d.title, d.description, d.extract]],
        images: d.thumbnail ? [{ src: https(d.thumbnail.source), caption: d.title }] : [],
      }),
    },
    {
      id: 'art', name: 'Art Institute of Chicago', cat: 'words', sdg: [4, 11],
      what: 'Search more than 100,000 artworks, with high-resolution images.',
      idea: 'A gallery that pairs each SDG with art about it.',
      url: 'https://api.artic.edu/api/v1/artworks/search?q=ocean&limit=8&fields=id,title,image_id,artist_title',
      docs: 'https://api.artic.edu/docs/',
      note: 'Image URL pattern: https://www.artic.edu/iiif/2/IMAGE_ID/full/843,/0/default.jpg',
      peek: (d) => ({
        total: d.pagination.total,
        images: d.data.filter((a) => a.image_id).map((a) => ({
          src: `https://www.artic.edu/iiif/2/${encodeURIComponent(a.image_id)}/full/200,/0/default.jpg`,
          caption: a.title,
        })),
      }),
    },
    {
      id: 'itunes', name: 'iTunes Search', cat: 'fun', sdg: [],
      what: 'Search music: songs, albums and podcasts. Results include cover art and 30-second previews.',
      idea: 'A soundtrack for your SDG: a playlist page with previews you can play.',
      url: 'https://itunes.apple.com/search?term=ocean&entity=song&limit=5&explicit=No',
      docs: 'https://performance-partners.apple.com/search-api',
      note: 'explicit=No leaves out explicit tracks. previewUrl is a 30-second clip you can play with an <audio> tag.',
      peek: (d) => ({ total: d.resultCount, images: d.results.map((r) => ({ src: https(r.artworkUrl100), caption: `${r.trackName}, ${r.artistName}` })) }),
    },
    {
      id: 'pokeapi', name: 'PokéAPI', cat: 'fun', sdg: [],
      what: 'Every Pokémon, with types, stats, moves and artwork.',
      idea: 'Warm-up: practice fetching and showing data before your real project.',
      url: 'https://pokeapi.co/api/v2/pokemon/pikachu',
      docs: 'https://pokeapi.co/docs/v2',
      peek: (d) => ({
        cols: ['name', 'height', 'weight', 'types'],
        rows: [[d.name, d.height, d.weight, d.types.map((t) => t.type.name).join(', ')]],
        images: [{ src: https(d.sprites.other?.['official-artwork']?.front_default || d.sprites.front_default), caption: d.name }],
      }),
    },
  ];
  const byId = Object.fromEntries(APIS.map((api) => [api.id, api]));

  // ---------- live peek: a few real rows from any API ----------

  const RELOAD = '<button type="button" class="peek-reload" data-reload title="Load again" aria-label="Load again">↻</button>';

  function peekHtml(view, seconds) {
    const rows = (view.rows || []).slice(0, 5);
    const images = (view.images || []).filter((img) => img.src).slice(0, 5);
    const shown = rows.length || images.length;
    const total = view.total ?? shown;
    const count = total > shown ? `${shown} of ${num(total)}` : num(shown);
    let html = `<div class="peek-status"><span class="dot" aria-hidden="true"></span>live · ${seconds} s · ${count} result${total === 1 ? '' : 's'}${RELOAD}</div>`;
    if (rows.length) {
      const cell = (v) => `<td title="${esc(v)}">${esc(v ?? '–')}</td>`;
      html += `<div class="peek-scroll"><table class="peek-table"><thead><tr>${view.cols.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead>`
        + `<tbody>${rows.map((row) => `<tr>${row.map(cell).join('')}</tr>`).join('')}</tbody></table></div>`;
    }
    // no-referrer: some image hosts (artic.edu) refuse images to a page on localhost.
    if (images.length) {
      html += `<div class="thumbs">${images.map((img) => `<figure><img src="${esc(img.src)}" alt="${esc(img.caption)}" loading="lazy" referrerpolicy="no-referrer">`
        + `<figcaption title="${esc(img.caption)}">${esc(img.caption)}</figcaption></figure>`).join('')}</div>`;
    }
    return html;
  }

  async function fetchText(url, timeoutMs = 25000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) throw new Error(`the server answered ${res.status}`);
      return await res.text();
    } catch (err) {
      throw err.name === 'AbortError' ? new Error('it took too long to answer') : err;
    } finally {
      clearTimeout(timer);
    }
  }

  async function loadPeek(api, box) {
    box.innerHTML = SKELETON;
    const started = performance.now();
    try {
      const raw = await fetchText(api.url);
      const view = api.peek(api.format === 'csv' ? raw : JSON.parse(raw));
      box.innerHTML = peekHtml(view, ((performance.now() - started) / 1000).toFixed(1));
    } catch (err) {
      box.innerHTML = `<div class="peek-status err">Couldn’t load it: ${esc(err.message)}. Try again in a minute.${RELOAD}</div>`;
    }
  }

  // Any <div data-peek="api-id"> on any page shows that API's live rows once it
  // scrolls into view. Heavy, slow or rate-limited APIs wait for a click.
  function mountPeek(box) {
    const api = byId[box.dataset.peek];
    if (api.manual) box.innerHTML = '<button type="button" class="btn btn-sm btn-ghost" data-reload>▶ Load live data</button>';
    else whenVisible(box, () => loadPeek(api, box));
  }
  document.addEventListener('click', (e) => {
    const button = e.target.closest('[data-reload]');
    const box = button?.closest('[data-peek]');
    if (box) loadPeek(byId[box.dataset.peek], box);
  });

  // ---------- catalog page ----------

  const apiPrompt = (api) => starterPrompt({ idea: api.idea, url: api.url, docs: api.docs, extra: api.note && `Good to know: ${api.note}` });

  function cardHtml(api) {
    const color = api.sdg.length ? `var(--sdg-${api.sdg[0]})` : 'var(--line-2)';
    return `
      <article class="card api" id="api-${api.id}" style="--c: ${color}">
        <div class="api-top">
          <h3>${esc(api.name)}</h3>
          <div class="chips">${api.sdg.map((n) => sdgChip(n, { button: true })).join('')}</div>
        </div>
        <p class="idea">${esc(api.idea)}</p>
        <div class="peek" data-peek="${api.id}" aria-live="polite"></div>
        <div class="api-actions">
          <button type="button" class="btn btn-sm" data-prompt>Copy starter prompt</button>
          <button type="button" class="copy" data-copy-url>Copy URL</button>
          <a class="copy" href="${esc(api.docs)}" target="_blank" rel="noopener">Docs ↗</a>
        </div>
      </article>`;
  }

  function mountCatalog(grid) {
    const filters = document.getElementById('filters');
    const search = document.getElementById('search');
    const status = document.getElementById('result-note');
    const state = { cat: 'all', sdg: null, q: '' };
    const listed = APIS.filter((api) => api.id !== 'unsdg'); // the SDG explorer above is the UN's card

    grid.innerHTML = listed.map(cardHtml).join('');
    filters.insertAdjacentHTML('afterbegin', [['all', 'All'], ...Object.entries(CATEGORIES)]
      .map(([id, label]) => `<button type="button" class="filter" data-cat="${id}" aria-pressed="${id === 'all'}">${esc(label)}</button>`)
      .join(''));

    function apply() {
      let shown = 0;
      for (const api of listed) {
        const text = `${api.name} ${api.what} ${api.idea} ${CATEGORIES[api.cat]}`.toLowerCase();
        const visible = (state.cat === 'all' || api.cat === state.cat)
          && (!state.sdg || api.sdg.includes(state.sdg))
          && (!state.q || text.includes(state.q));
        document.getElementById(`api-${api.id}`).hidden = !visible;
        shown += visible;
      }
      for (const b of filters.querySelectorAll('[data-cat]')) b.setAttribute('aria-pressed', String(b.dataset.cat === state.cat));
      status.innerHTML = `${shown} of ${listed.length} APIs`
        + (state.sdg ? ` for <b>Goal ${state.sdg}: ${esc(SDG_NAMES[state.sdg])}</b> <button type="button" class="copy" data-clear-sdg>Show all goals</button>` : '');
    }

    filters.addEventListener('click', (e) => {
      const b = e.target.closest('[data-cat]');
      if (!b) return;
      state.cat = b.dataset.cat;
      apply();
    });
    search.addEventListener('input', () => {
      state.q = search.value.trim().toLowerCase();
      apply();
    });

    document.addEventListener('click', async (e) => {
      if (e.target.closest('[data-clear-sdg]')) {
        state.sdg = null;
        apply();
        return;
      }
      const card = e.target.closest('.api');
      const button = e.target.closest('button');
      if (!card || !button) return;
      const api = byId[card.id.slice('api-'.length)];
      if (button.matches('[data-sdg]')) {
        state.sdg = Number(button.dataset.sdg);
        state.cat = 'all';
        apply();
        status.scrollIntoView({ block: 'nearest' });
      } else if (button.matches('[data-copy-url]')) {
        flash(button, await copyText(api.url));
      } else if (button.matches('[data-prompt]')) {
        flash(button, await copyText(apiPrompt(api)));
      }
    });

    apply();
    document.getElementById(location.hash.slice(1))?.scrollIntoView();
  }

  // "Your first fetch": runs this page's own snippet (static HTML, never user
  // input) with a stand-in console, and prints what it logs.
  function mountRunner(button) {
    const out = document.getElementById('console');
    const AsyncFunction = (async () => {}).constructor;
    const snippet = new AsyncFunction('console', document.getElementById('snippet-js').textContent);
    button.addEventListener('click', async () => {
      out.innerHTML = '<span class="dim">Running…</span>';
      const lines = [];
      const log = (...args) => { lines.push(args.join(' ')); out.textContent = lines.join('\n'); };
      try {
        await snippet({ log });
      } catch (err) {
        log(`Error: ${err.message}`);
      }
    });
  }

  window.UND.APIS = APIS;
  const grid = document.getElementById('api-grid');
  if (grid) mountCatalog(grid);
  for (const box of document.querySelectorAll('[data-peek]')) mountPeek(box);
  const run = document.getElementById('run');
  if (run) mountRunner(run);
})();
