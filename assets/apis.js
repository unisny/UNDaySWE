// The live-data catalog. Every endpoint below was tested on 2026-10-12 from a
// browser-style request: HTTPS, no key, and CORS headers that let any web page
// call it directly. `peek` turns a live response into a few real rows
// ({ cols, rows, total, images }) so students see the data, not a description.
(() => {
  const { SDG_NAMES, SKELETON, esc, sdgChip, starterPrompt, copyText, flash, whenVisible } = window.UND;

  const HQ = 'latitude=40.7489&longitude=-73.968'; // UN Headquarters, New York

  const CATEGORIES = {
    climate: 'Weather & climate',
    earth: 'Earth right now',
    nature: 'Nature',
    food: 'Food',
    people: 'People & countries',
    cities: 'Cities & maps',
    knowledge: 'Words, books & art',
    space: 'Space',
    fun: 'Warm-ups',
  };

  // ---------- formatting helpers ----------

  const num = (n, digits = 0) => Number(n).toLocaleString('en-US', { maximumFractionDigits: digits });
  const https = (url) => (typeof url === 'string' && url.startsWith('https://') ? url : '');
  const stripTags = (html) => new DOMParser().parseFromString(html, 'text/html').body.textContent;
  const nyTime = (iso) => new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' });

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
      id: 'unsdg', name: 'UN SDG API (official)', cat: 'people', sdg: [17, 7],
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
      id: 'weather', name: 'Open-Meteo Weather', cat: 'climate', sdg: [13, 11],
      what: 'Current weather and a 16-day forecast for any point on Earth: temperature, rain, wind, UV and more.',
      idea: 'A "should I bike to school?" app that turns the whole forecast into one yes-or-no answer.',
      url: `https://api.open-meteo.com/v1/forecast?${HQ}&current=temperature_2m,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&forecast_days=5&timezone=auto`,
      docs: 'https://open-meteo.com/en/docs',
      note: 'Add &temperature_unit=fahrenheit for °F. Free for non-commercial use (10,000 calls a day).',
      peek: (d) => table(d.daily, ['time', 'temperature_2m_max', 'temperature_2m_min', 'precipitation_probability_max']),
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
      id: 'air', name: 'Open-Meteo Air Quality', cat: 'climate', sdg: [3, 11],
      what: 'Live air quality for any coordinates: US AQI, PM2.5, ozone and NO₂, plus pollen in Europe.',
      idea: 'A live leaderboard: the air in your city right now vs Delhi, Lagos and São Paulo.',
      url: `https://air-quality-api.open-meteo.com/v1/air-quality?${HQ}&current=us_aqi&hourly=us_aqi,pm2_5,ozone&forecast_hours=5&timezone=auto`,
      docs: 'https://open-meteo.com/en/docs/air-quality-api',
      note: 'US AQI: 0–50 good, 51–100 moderate, 101–150 unhealthy for sensitive groups, 151+ unhealthy.',
      peek: (d) => table(d.hourly, ['time', 'us_aqi', 'pm2_5', 'ozone']),
    },
    {
      id: 'warming', name: 'Global Warming API', cat: 'climate', sdg: [13],
      what: 'Ready-made climate series: global temperature since 1880, CO₂, methane, nitrous oxide and Arctic sea ice.',
      idea: 'A “climate stripes” poster running from the year you were born to now.',
      url: 'https://global-warming.org/api/temperature-api',
      docs: 'https://global-warming.org/',
      note: 'Swap the end of the URL for co2-api, methane-api, nitrous-oxide-api or arctic-api. Temperatures are differences from the 1951–1980 average (NASA GISTEMP).',
      peek: (d) => ({ total: d.result.length, cols: ['time', 'station', 'land'], rows: d.result.slice(-5).map((r) => [r.time, r.station, r.land]) }),
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
      id: 'tides', name: 'NOAA Tides & Currents', cat: 'earth', sdg: [14, 13],
      what: 'Live water levels and water temperatures from US coastal stations, including The Battery at the tip of Manhattan.',
      idea: 'A “how high is the harbor?” gauge that updates every 6 minutes, with sea-level-rise context.',
      url: 'https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?station=8518750&product=water_level&datum=MLLW&range=1&units=metric&time_zone=lst_ldt&format=json',
      docs: 'https://api.tidesandcurrents.noaa.gov/api/prod/',
      note: 'Station 8518750 is The Battery, NYC. v is meters above average low tide. range=1 means the last hour; try product=water_temperature.',
      peek: (d) => ({ total: d.data.length, cols: ['t', 'v'], rows: d.data.slice(-5).reverse().map((r) => [r.t, r.v]) }),
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
      id: 'gbif', name: 'GBIF', cat: 'nature', sdg: [15, 14],
      what: 'Billions of records of where species have been found, from museums, scientists and citizen scientists.',
      idea: 'Map every African elephant record by decade. Where have they disappeared from?',
      url: 'https://api.gbif.org/v1/occurrence/search?scientificName=Loxodonta%20africana&limit=5',
      docs: 'https://techdocs.gbif.org/en/openapi/v1/occurrence',
      peek: (d) => ({
        total: d.count,
        cols: ['country', 'stateProvince', 'year', 'basisOfRecord'],
        rows: d.results.map((r) => [r.country, r.stateProvince, r.year, r.basisOfRecord]),
      }),
    },
    {
      id: 'food', name: 'Open Food Facts', cat: 'food', sdg: [12, 3],
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
      id: 'meals', name: 'TheMealDB', cat: 'food', sdg: [2, 12],
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
      id: 'worldbank', name: 'World Bank Indicators', cat: 'people', sdg: [1, 4, 9],
      what: 'Thousands of indicators for every country from 1960 to now: internet use, electricity, income, schooling, health.',
      idea: '“If our class were 30 people from Kenya”: how many would have internet, power, a diploma?',
      url: 'https://api.worldbank.org/v2/country/KEN;IND;USA;BRA/indicator/IT.NET.USER.ZS?format=json&mrnev=1',
      docs: 'https://datahelpdesk.worldbank.org/knowledgebase/articles/889392',
      note: 'Codes: IT.NET.USER.ZS internet, EG.ELC.ACCS.ZS electricity, SP.DYN.LE00.IN life expectancy. mrnev=1 means “most recent value”. It can take a few seconds.',
      manual: true,
      peek: (d) => ({ cols: ['country', 'date', 'value'], rows: d[1].map((r) => [r.country.value, r.date, num(r.value, 1)]) }),
    },
    {
      id: 'owid', name: 'Our World in Data', cat: 'people', sdg: [13, 3, 1],
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
      id: 'unhcr', name: 'UNHCR Refugee Statistics', cat: 'people', sdg: [10, 16],
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
      id: 'holidays', name: 'Nager.Date Public Holidays', cat: 'people', sdg: [10],
      what: 'Public holidays in 100+ countries, for any year.',
      idea: 'A class calendar showing which of your classmates’ home countries are celebrating today.',
      url: 'https://date.nager.at/api/v3/PublicHolidays/2026/KE',
      docs: 'https://date.nager.at/Api',
      peek: (d) => {
        const today = new Date().toISOString().slice(0, 10);
        const upcoming = d.filter((h) => h.date >= today);
        return { total: d.length, cols: ['date', 'localName', 'name'], rows: (upcoming.length ? upcoming : d).map((h) => [h.date, h.localName, h.name]) };
      },
    },
    {
      id: 'currency', name: 'Frankfurter Exchange Rates', cat: 'people', sdg: [8, 10],
      what: 'Daily exchange rates for about 30 currencies, published by the European Central Bank, back to 1999.',
      idea: '“What does $5 buy?”: convert lunch money and compare what it gets you around the world.',
      url: 'https://api.frankfurter.dev/v1/latest?base=USD&symbols=EUR,GBP,INR,JPY,BRL',
      docs: 'https://frankfurter.dev/',
      peek: (d) => ({ cols: ['date', 'currency', '1 USD ='], rows: Object.entries(d.rates).map(([code, rate]) => [d.date, code, num(rate, 3)]) }),
    },
    {
      id: 'nyc311', name: 'NYC Open Data: 311', cat: 'cities', sdg: [11, 3],
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
      id: 'citibike', name: 'Citi Bike Live', cat: 'cities', sdg: [11, 13],
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
      id: 'overpass', name: 'Overpass (OpenStreetMap)', cat: 'cities', sdg: [6, 11],
      what: 'Ask the world’s open map for anything near a point: water fountains, bike racks, parks, recycling bins, ramps.',
      idea: '“Thirsty”: find the nearest free drinking water in any city.',
      url: 'https://overpass-api.de/api/interpreter?data=[out:json][timeout:25];node[amenity=drinking_water](around:1000,40.7489,-73.968);out;',
      fallbacks: ['https://maps.mail.ru/osm/tools/overpass/api/interpreter?data=[out:json][timeout:25];node[amenity=drinking_water](around:1000,40.7489,-73.968);out;'],
      docs: 'https://wiki.openstreetmap.org/wiki/Overpass_API',
      note: 'Queries use their own language. The public server gets busy and can time out; if it does, swap the start of the URL for https://maps.mail.ru/osm/tools/overpass/api/interpreter.',
      manual: true,
      peek: (d) => ({
        total: d.elements.length,
        cols: ['id', 'lat', 'lon', 'tags.name'],
        rows: d.elements.map((e) => [e.id, e.lat.toFixed(4), e.lon.toFixed(4), e.tags?.name]),
      }),
    },
    {
      id: 'geocode', name: 'Open-Meteo Geocoding', cat: 'cities', sdg: [11],
      what: 'Turns a place name into latitude and longitude. Most APIs on this page need those two numbers.',
      idea: 'Let people type “Lagos” instead of “6.45, 3.39”.',
      url: 'https://geocoding-api.open-meteo.com/v1/search?name=Nairobi&count=3',
      docs: 'https://open-meteo.com/en/docs/geocoding-api',
      peek: (d) => ({ cols: ['name', 'country', 'latitude', 'longitude'], rows: d.results.map((r) => [r.name, r.country, r.latitude, r.longitude]) }),
    },
    {
      id: 'wikipedia', name: 'Wikipedia', cat: 'knowledge', sdg: [4],
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
      id: 'books', name: 'Open Library', cat: 'knowledge', sdg: [4],
      what: 'Search millions of books by title, author or subject, with cover images.',
      idea: 'A “read the goals” shelf: one book for each SDG, with covers.',
      url: 'https://openlibrary.org/search.json?q=climate+change&limit=8&fields=title,author_name,first_publish_year,cover_i',
      docs: 'https://openlibrary.org/developers/api',
      note: 'Covers come from https://covers.openlibrary.org/b/id/COVER_ID-M.jpg. Searches can take a few seconds.',
      manual: true,
      peek: (d) => ({
        total: d.numFound,
        images: d.docs.filter((b) => b.cover_i).map((b) => ({ src: `https://covers.openlibrary.org/b/id/${Number(b.cover_i)}-M.jpg`, caption: b.title })),
      }),
    },
    {
      id: 'wiktionary', name: 'Wiktionary', cat: 'knowledge', sdg: [4],
      what: 'Dictionary definitions from Wikipedia’s sister project, for words in many languages.',
      idea: 'Word of the day in all six UN languages: Arabic, Chinese, English, French, Russian and Spanish.',
      url: 'https://en.wiktionary.org/api/rest_v1/page/definition/sustainable',
      docs: 'https://en.wiktionary.org/api/rest_v1/',
      note: 'Definitions come back with little HTML links inside, so strip the tags before showing them.',
      peek: (d) => ({
        cols: ['partOfSpeech', 'definition'],
        rows: (d.en || []).flatMap((sense) => sense.definitions.map((def) => [sense.partOfSpeech, stripTags(def.definition)])),
      }),
    },
    {
      id: 'datamuse', name: 'Datamuse', cat: 'knowledge', sdg: [4],
      what: 'Finds words that rhyme, mean the same thing, or sound alike.',
      idea: 'A protest-sign slogan generator that actually rhymes.',
      url: 'https://api.datamuse.com/words?rel_rhy=planet&max=5',
      docs: 'https://www.datamuse.com/api/',
      note: 'rel_rhy=planet for rhymes, ml=ocean for “means like”, sl= for “sounds like”.',
      peek: (d) => ({ cols: ['word', 'score'], rows: d.map((w) => [w.word, w.score]) }),
    },
    {
      id: 'art', name: 'Art Institute of Chicago', cat: 'knowledge', sdg: [4, 11],
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
      id: 'iss', name: 'Where the ISS at?', cat: 'space', sdg: [9, 17],
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
      id: 'sun', name: 'Sunrise-Sunset', cat: 'space', sdg: [7],
      what: 'Sunrise, sunset, day length and twilight times for any coordinates and date.',
      idea: 'A solar-panel planner: compare daylight hours in Nairobi and Oslo across the year.',
      url: 'https://api.sunrise-sunset.org/json?lat=40.7489&lng=-73.968&formatted=0',
      docs: 'https://sunrise-sunset.org/api',
      note: 'Times come back in UTC. Add &date=2026-12-21 for any day.',
      peek: ({ results: r }) => ({
        cols: ['sunrise (NYC)', 'sunset (NYC)', 'day_length'],
        rows: [[nyTime(r.sunrise), nyTime(r.sunset), `${Math.floor(r.day_length / 3600)} h ${Math.round((r.day_length % 3600) / 60)} min`]],
      }),
    },
    {
      id: 'itunes', name: 'iTunes Search', cat: 'fun', sdg: [],
      what: 'Search songs, albums and podcasts. Results include cover art and 30-second previews.',
      idea: 'A soundtrack for your SDG: a playlist page with previews you can play.',
      url: 'https://itunes.apple.com/search?term=ocean&entity=song&limit=5&explicit=No',
      docs: 'https://performance-partners.apple.com/search-api',
      note: 'explicit=No leaves out explicit tracks. previewUrl is a 30-second clip you can play with an <audio> tag.',
      peek: (d) => ({ total: d.resultCount, images: d.results.map((r) => ({ src: https(r.artworkUrl100), caption: `${r.trackName}, ${r.artistName}` })) }),
    },
    {
      id: 'trivia', name: 'Open Trivia DB', cat: 'fun', sdg: [],
      what: 'Thousands of multiple-choice trivia questions, by category and difficulty.',
      idea: 'An SDG quiz game with a scoreboard for your class.',
      url: 'https://opentdb.com/api.php?amount=5&category=17&type=multiple',
      docs: 'https://opentdb.com/api_config.php',
      note: 'One request per 5 seconds per network, so load questions once and reuse them. Questions contain HTML codes like &quot; to decode.',
      manual: true,
      peek: (d) => ({ cols: ['difficulty', 'question'], rows: d.results.map((q) => [q.difficulty, stripTags(q.question)]) }),
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
    {
      id: 'dogs', name: 'Dog CEO', cat: 'fun', sdg: [],
      what: 'Random dog photos, by breed if you like. The simplest API on this page.',
      idea: 'Your very first fetch: a button that shows a new dog on every click.',
      url: 'https://dog.ceo/api/breeds/image/random',
      docs: 'https://dog.ceo/dog-api/documentation',
      peek: (d) => ({ images: [{ src: https(d.message), caption: d.message.split('/breeds/')[1]?.split('/')[0] || 'a good dog' }] }),
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
    if (images.length) {
      html += `<div class="thumbs">${images.map((img) => `<figure><img src="${esc(img.src)}" alt="${esc(img.caption)}" loading="lazy">`
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
    let lastError;
    for (const url of [api.url, ...(api.fallbacks || [])]) {
      try {
        const raw = await fetchText(url);
        const view = api.peek(api.format === 'csv' ? raw : JSON.parse(raw));
        box.innerHTML = peekHtml(view, ((performance.now() - started) / 1000).toFixed(1));
        return;
      } catch (err) {
        lastError = err;
      }
    }
    box.innerHTML = `<div class="peek-status err">Couldn’t load it: ${esc(lastError.message)}. Try again in a minute.${RELOAD}</div>`;
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

    grid.innerHTML = APIS.map(cardHtml).join('');
    filters.insertAdjacentHTML('afterbegin', [['all', 'All'], ...Object.entries(CATEGORIES)]
      .map(([id, label]) => `<button type="button" class="filter" data-cat="${id}" aria-pressed="${id === 'all'}">${esc(label)}</button>`)
      .join(''));

    function apply() {
      let shown = 0;
      for (const api of APIS) {
        const text = `${api.name} ${api.what} ${api.idea} ${CATEGORIES[api.cat]}`.toLowerCase();
        const visible = (state.cat === 'all' || api.cat === state.cat)
          && (!state.sdg || api.sdg.includes(state.sdg))
          && (!state.q || text.includes(state.q));
        document.getElementById(`api-${api.id}`).hidden = !visible;
        shown += visible;
      }
      for (const b of filters.querySelectorAll('[data-cat]')) b.setAttribute('aria-pressed', String(b.dataset.cat === state.cat));
      status.innerHTML = `${shown} of ${APIS.length} APIs`
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
