// The live-data catalog. Every endpoint below was tested on 2026-10-12 from a
// browser-style request: HTTPS, no key, and CORS headers that let any web page
// call it directly. `render` turns a live response into a short preview.
(() => {
  const { SDG_NAMES, esc, sdgChip, starterPrompt, copyText, flash } = window.UND;

  const HQ = 'latitude=40.7489&longitude=-73.968'; // UN Headquarters, New York

  const CATEGORIES = {
    climate: 'Weather & climate',
    earth: 'Earth right now',
    nature: 'Nature & wildlife',
    food: 'Food & stuff we buy',
    people: 'People & countries',
    cities: 'Cities & maps',
    knowledge: 'Words, books & art',
    space: 'Space & sky',
    fun: 'Warm-ups',
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

  function weatherWord(code) {
    if (code === 0) return 'clear sky';
    if (code <= 2) return 'partly cloudy';
    if (code === 3) return 'overcast';
    if (code <= 48) return 'fog';
    if (code <= 57) return 'drizzle';
    if (code <= 67) return 'rain';
    if (code <= 77) return 'snow';
    if (code <= 82) return 'rain showers';
    if (code <= 86) return 'snow showers';
    return 'thunderstorm';
  }

  function aqiWord(aqi) {
    if (aqi <= 50) return 'Good';
    if (aqi <= 100) return 'Moderate';
    if (aqi <= 150) return 'Unhealthy for sensitive groups';
    if (aqi <= 200) return 'Unhealthy';
    if (aqi <= 300) return 'Very unhealthy';
    return 'Hazardous';
  }

  const stripTags = (html) => new DOMParser().parseFromString(html, 'text/html').body.textContent;
  const nyTime = (iso) => new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' });

  // ---------- the catalog ----------

  const APIS = [
    {
      id: 'weather', name: 'Open-Meteo Weather', cat: 'climate', sdg: [13, 11],
      what: 'Current weather and a 16-day forecast for any point on Earth: temperature, rain, wind, UV and more.',
      idea: 'A "should I bike to school?" app that turns the whole forecast into one yes-or-no answer.',
      url: `https://api.open-meteo.com/v1/forecast?${HQ}&current=temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&forecast_days=3&timezone=auto`,
      docs: 'https://open-meteo.com/en/docs',
      note: 'Add &temperature_unit=fahrenheit for °F. Free for non-commercial use (10,000 calls a day). The same team runs marine, flood and geocoding APIs.',
      render: (d) => ({
        facts: [
          ['Right now at the UN', `${d.current.temperature_2m} °C, ${weatherWord(d.current.weather_code)}`],
          ['Feels like', `${d.current.apparent_temperature} °C`],
          ['Wind', `${d.current.wind_speed_10m} km/h`],
          ...d.daily.time.map((day, i) => [
            new Date(`${day}T12:00`).toLocaleDateString('en-US', { weekday: 'long' }),
            `${d.daily.temperature_2m_min[i]}–${d.daily.temperature_2m_max[i]} °C · ${d.daily.precipitation_probability_max[i]}% chance of rain`,
          ]),
        ],
      }),
    },
    {
      id: 'history', name: 'Open-Meteo Historical Weather', cat: 'climate', sdg: [13],
      what: 'Daily and hourly weather for any place on Earth, all the way back to 1940.',
      idea: 'Type your birthday and see how that date’s weather has changed, decade by decade.',
      url: `https://archive-api.open-meteo.com/v1/archive?${HQ}&start_date=1945-10-24&end_date=1945-10-24&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`,
      docs: 'https://open-meteo.com/en/docs/historical-weather-api',
      note: 'The sample asks for October 24, 1945: the day the UN was founded. One request can cover 80+ years of days.',
      render: (d) => ({
        facts: [
          ['Where', 'New York, by today’s UN Headquarters'],
          ['When', 'Oct 24, 1945, the UN’s first day'],
          ['High', `${d.daily.temperature_2m_max[0]} °C`],
          ['Low', `${d.daily.temperature_2m_min[0]} °C`],
          ['Rain', `${d.daily.precipitation_sum[0]} mm`],
        ],
      }),
    },
    {
      id: 'future', name: 'Open-Meteo Climate Projections', cat: 'climate', sdg: [13],
      what: 'Day-by-day output from climate models, from 1950 to 2050, for any place.',
      idea: '“Your 2050 summer”: what July will feel like when you’re in your 40s.',
      url: `https://climate-api.open-meteo.com/v1/climate?${HQ}&start_date=2050-07-01&end_date=2050-07-31&models=MRI_AGCM3_2_S,MPI_ESM1_2_XR,CMCC_CM2_VHR4&daily=temperature_2m_max`,
      docs: 'https://open-meteo.com/en/docs/climate-api',
      note: 'These are model projections, not forecasts. That’s why the sample asks three models at once: show the range, not one number.',
      render: (d) => ({
        facts: [
          ['New York, July 2050', 'average daily high by model'],
          ...Object.entries(d.daily).filter(([key]) => key !== 'time').map(([key, temps]) => {
            const highs = temps.filter((t) => t != null);
            const avg = highs.reduce((a, b) => a + b, 0) / highs.length;
            return [key.replace('temperature_2m_max_', ''), `${avg.toFixed(1)} °C, ${highs.filter((t) => t >= 30).length} days at 30 °C+`];
          }),
        ],
      }),
    },
    {
      id: 'air', name: 'Open-Meteo Air Quality', cat: 'climate', sdg: [3, 11],
      what: 'Live air quality for any coordinates: US AQI, PM2.5, ozone and NO₂, plus pollen in Europe.',
      idea: 'A live leaderboard: the air in your city right now vs Delhi, Lagos and São Paulo.',
      url: `https://air-quality-api.open-meteo.com/v1/air-quality?${HQ}&current=us_aqi,pm2_5,ozone,nitrogen_dioxide`,
      docs: 'https://open-meteo.com/en/docs/air-quality-api',
      render: (d) => ({
        facts: [
          ['US AQI at the UN', `${d.current.us_aqi} (${aqiWord(d.current.us_aqi)})`],
          ['PM2.5', `${d.current.pm2_5} µg/m³`],
          ['Ozone', `${d.current.ozone} µg/m³`],
          ['NO₂', `${d.current.nitrogen_dioxide} µg/m³`],
        ],
      }),
    },
    {
      id: 'warming', name: 'Global Warming API', cat: 'climate', sdg: [13],
      what: 'Ready-made climate series: global temperature since 1880, CO₂, methane, nitrous oxide and Arctic sea ice.',
      idea: 'A “climate stripes” poster running from the year you were born to now.',
      url: 'https://global-warming.org/api/temperature-api',
      docs: 'https://global-warming.org/',
      note: 'Swap the end of the URL for co2-api, methane-api, nitrous-oxide-api or arctic-api. Temperatures are differences from the 1951–1980 average (NASA GISTEMP).',
      render: (d) => {
        const rows = d.result;
        const first = rows[0];
        const last = rows[rows.length - 1];
        return {
          facts: [
            ['Monthly readings', `${num(rows.length)}, from ${Math.floor(first.time)} to ${Math.floor(last.time)}`],
            ['Latest (station / land)', `${last.station} / ${last.land} °C`],
            ['First, 1880 (station / land)', `${first.station} / ${first.land} °C`],
          ],
        };
      },
    },
    {
      id: 'quakes', name: 'USGS Earthquakes', cat: 'earth', sdg: [11],
      what: 'Every earthquake recorded on Earth in the past hour, day, week or month. Updated every minute.',
      idea: '“While you slept”: a morning recap of every quake since bedtime, on a map.',
      url: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson',
      docs: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php',
      note: 'Swap all_day for all_hour, all_week, 4.5_week or significant_month.',
      render: (d) => {
        const quakes = d.features.map((f) => f.properties).filter((p) => p.mag != null);
        const biggest = quakes.reduce((a, b) => (b.mag > a.mag ? b : a));
        return {
          facts: [
            ['Earthquakes in the last 24 h', num(d.features.length)],
            ['Magnitude 4.5 or bigger', quakes.filter((p) => p.mag >= 4.5).length],
            ['Biggest', `M${biggest.mag.toFixed(1)}, ${biggest.place || 'unknown place'}, ${ago(biggest.time)}`],
          ],
        };
      },
    },
    {
      id: 'eonet', name: 'NASA EONET', cat: 'earth', sdg: [13, 15],
      what: 'Natural events happening right now, tracked by NASA: wildfires, severe storms, volcanoes and sea ice.',
      idea: 'A live “what is Earth doing today?” board, with one card per event.',
      url: 'https://eonet.gsfc.nasa.gov/api/v3/events?status=open&days=30',
      docs: 'https://eonet.gsfc.nasa.gov/docs/v3',
      render: (d) => {
        const counts = {};
        for (const e of d.events) {
          const category = e.categories[0].title;
          counts[category] = (counts[category] || 0) + 1;
        }
        return {
          facts: [['Open events (30 days)', d.events.length], ...Object.entries(counts).sort((a, b) => b[1] - a[1])],
          list: d.events.slice(0, 4).map((e) => e.title),
        };
      },
    },
    {
      id: 'tides', name: 'NOAA Tides & Currents', cat: 'earth', sdg: [14, 13],
      what: 'Live water levels and water temperatures from US coastal stations, including The Battery at the tip of Manhattan.',
      idea: 'A “how high is the harbor?” gauge that updates every 6 minutes, with sea-level-rise context.',
      url: 'https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?station=8518750&product=water_level&datum=MLLW&date=latest&units=metric&time_zone=lst_ldt&format=json',
      docs: 'https://api.tidesandcurrents.noaa.gov/api/prod/',
      note: 'Station 8518750 is The Battery, NYC. Try product=water_temperature, or find other stations on tidesandcurrents.noaa.gov.',
      render: (d) => ({
        facts: [
          ['Station', d.metadata.name],
          ['Water level', `${d.data[0].v} m above average low tide`],
          ['Measured', `${d.data[0].t} (local time)`],
        ],
      }),
    },
    {
      id: 'inat', name: 'iNaturalist', cat: 'nature', sdg: [15, 14],
      what: 'Wildlife sightings from people’s phones all over the world, with photos, names and locations.',
      idea: 'A real-life Pokédex of species spotted near you, with photos and “caught” badges.',
      url: 'https://api.inaturalist.org/v1/observations?lat=40.7489&lng=-73.968&radius=2&per_page=8&order_by=observed_on&photos=true&quality_grade=research',
      docs: 'https://api.inaturalist.org/v1/docs/',
      note: 'Try /v1/observations/species_counts for a ranked list of every species seen in an area.',
      render: (d) => ({
        facts: [['Verified sightings within 2 km of the UN', num(d.total_results)]],
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
      render: (d) => ({
        facts: [['African elephant records', num(d.count)]],
        list: d.results.map((r) => `${r.country || 'Unknown country'}, ${r.eventDate ? r.eventDate.slice(0, 10) : r.year || 'no date'}`),
      }),
    },
    {
      id: 'food', name: 'Open Food Facts', cat: 'food', sdg: [12, 3],
      what: 'A crowd-built database of millions of food products by barcode: Nutri-Score, Eco-Score, how processed it is, packaging.',
      idea: 'Snack Battle: two barcodes enter, one wins on health and on the planet.',
      url: 'https://world.openfoodfacts.org/api/v2/product/0028400090896.json?fields=product_name,brands,nutriscore_grade,ecoscore_grade,nova_group,packaging_materials_tags,image_front_small_url',
      docs: 'https://openfoodfacts.github.io/openfoodfacts-server/api/',
      note: 'The barcode is the number under the stripes. To search by name: /api/v2/search?categories_tags_en=chips',
      render: (d) => {
        const p = d.product;
        return {
          facts: [
            ['Product', `${p.brands} ${p.product_name}`],
            ['Nutri-Score (health)', p.nutriscore_grade?.toUpperCase()],
            ['Eco-Score (planet)', p.ecoscore_grade?.toUpperCase()],
            ['NOVA (1 = whole food, 4 = ultra-processed)', p.nova_group],
            ['Packaging', (p.packaging_materials_tags || []).map((t) => t.replace(/^en:/, '')).join(', ') || 'unknown'],
          ],
          images: [{ src: https(p.image_front_small_url), caption: p.product_name }],
        };
      },
    },
    {
      id: 'meals', name: 'TheMealDB', cat: 'food', sdg: [2, 12],
      what: 'Recipes with photos from around the world, searchable by ingredient, country or category.',
      idea: 'Leftover Rescue: pick what’s in your fridge, get dinner ideas, waste less food.',
      url: 'https://www.themealdb.com/api/json/v1/1/filter.php?i=rice',
      docs: 'https://www.themealdb.com/api.php',
      note: 'The 1 in the URL is the free public test key, so there’s nothing to sign up for. Get a full recipe with lookup.php?i=MEAL_ID.',
      render: (d) => ({
        facts: [['Recipes with rice', d.meals.length]],
        images: d.meals.slice(0, 6).map((m) => ({ src: https(m.strMealThumb) && `${m.strMealThumb}/preview`, caption: m.strMeal })),
      }),
    },
    {
      id: 'worldbank', name: 'World Bank Indicators', cat: 'people', sdg: [1, 4, 9],
      what: 'Thousands of indicators for every country from 1960 to now: internet use, electricity, income, schooling, health.',
      idea: '“If our class were 30 people from Kenya”: how many would have internet, power, a diploma?',
      url: 'https://api.worldbank.org/v2/country/KEN;IND;USA;BRA/indicator/IT.NET.USER.ZS?format=json&mrnev=1',
      docs: 'https://datahelpdesk.worldbank.org/knowledgebase/articles/889392',
      note: 'Codes: IT.NET.USER.ZS internet, EG.ELC.ACCS.ZS electricity, SP.DYN.LE00.IN life expectancy. mrnev=1 means “most recent value”. Can take a few seconds.',
      slow: true,
      render: (d) => ({
        facts: d[1].map((r) => [`${r.country.value} (${r.date})`, `${r.value.toFixed(0)}% use the internet`]),
      }),
    },
    {
      id: 'unsdg', name: 'UN SDG API', cat: 'people', sdg: [17, 7],
      what: 'The UN’s official data for all 17 goals and 231 indicators: the numbers countries report to the UN.',
      idea: 'Pick one SDG target and build an “Are we on track for 2030?” meter for a country.',
      url: 'https://unstats.un.org/sdgapi/v1/sdg/Indicator/Data?indicator=7.1.1&areaCode=404&pageSize=200',
      docs: 'https://unstats.un.org/sdgapi/swagger/',
      note: 'Countries use UN number codes (Kenya = 404, USA = 840); list them with /v1/sdg/GeoArea/List. Indicator 7.1.1 is the share of people with electricity.',
      render: (d) => {
        const latest = {};
        for (const r of d.data) {
          const where = r.dimensions.Location;
          if (!latest[where] || r.timePeriodStart > latest[where].timePeriodStart) latest[where] = r;
        }
        const label = { ALLAREA: 'Everyone', URBAN: 'In cities', RURAL: 'In the countryside' };
        return {
          facts: [
            ['Indicator 7.1.1', 'Kenyans with electricity'],
            ...Object.entries(label).filter(([k]) => latest[k]).map(([k, name]) => [`${name} (${latest[k].timePeriodStart})`, `${latest[k].value}%`]),
          ],
        };
      },
    },
    {
      id: 'owid', name: 'Our World in Data', cat: 'people', sdg: [13, 3, 1],
      what: 'The data behind every chart on ourworldindata.org, as a CSV file: CO₂, poverty, vaccines, energy, child mortality and thousands more.',
      idea: 'A “your country vs the world” slider for any topic you care about.',
      url: 'https://ourworldindata.org/grapher/co-emissions-per-capita.csv?v=1&csvType=filtered&useColumnShortNames=true&country=USA~CHN~IND~KEN',
      docs: 'https://docs.owid.io/projects/etl/api/',
      format: 'csv',
      note: 'Find any chart on ourworldindata.org, take its name from the URL, and add .csv. This one compares CO₂ per person in China, India, Kenya and the US.',
      render: (csv) => {
        const latest = {};
        for (const line of csv.trim().split('\n').slice(1)) {
          const [entity, , year, value] = line.split(',');
          latest[entity] = [year, Number(value)];
        }
        return { facts: Object.entries(latest).map(([who, [year, v]]) => [`${who} (${year})`, `${v.toFixed(1)} t of CO₂ per person`]) };
      },
    },
    {
      id: 'unhcr', name: 'UNHCR Refugee Statistics', cat: 'people', sdg: [10, 16],
      what: 'How many people have been forced to flee their homes, by country of origin and country of asylum, since 1951.',
      idea: 'Put the number in perspective: compare refugees from one country with the population of your city.',
      url: 'https://api.unhcr.org/population/v1/population/?yearFrom=2015&yearTo=2025&coo=SYR&limit=20',
      docs: 'https://api.unhcr.org/docs/refugee-statistics.html',
      note: 'coo = country of origin, coa = country of asylum (3-letter codes).',
      render: (d) => {
        const rows = d.items.map((r) => [r.year, Number(r.refugees)]);
        const peak = rows.reduce((a, b) => (b[1] > a[1] ? b : a));
        const last = rows[rows.length - 1];
        return {
          facts: [
            ['Refugees from Syria, peak', `${num(peak[1])} in ${peak[0]}`],
            [`Refugees from Syria, ${last[0]}`, num(last[1])],
          ],
        };
      },
    },
    {
      id: 'holidays', name: 'Nager.Date Public Holidays', cat: 'people', sdg: [10],
      what: 'Public holidays in 100+ countries, for any year.',
      idea: 'A class calendar showing which of your classmates’ home countries are celebrating today.',
      url: 'https://date.nager.at/api/v3/PublicHolidays/2026/KE',
      docs: 'https://date.nager.at/Api',
      render: (d) => {
        const today = new Date().toISOString().slice(0, 10);
        const next = d.find((h) => h.date >= today);
        return {
          facts: [
            ['Kenya’s public holidays in 2026', d.length],
            ['Next one', next ? `${next.name} (${next.localName}), ${next.date}` : 'none left this year'],
          ],
        };
      },
    },
    {
      id: 'currency', name: 'Frankfurter Exchange Rates', cat: 'people', sdg: [8, 10],
      what: 'Daily exchange rates for about 30 currencies, published by the European Central Bank, back to 1999.',
      idea: '“What does $5 buy?”: convert lunch money and compare what it gets you around the world.',
      url: 'https://api.frankfurter.dev/v1/latest?base=USD&symbols=EUR,GBP,INR,JPY,BRL,ZAR',
      docs: 'https://frankfurter.dev/',
      render: (d) => ({
        facts: [['Date', d.date], ...Object.entries(d.rates).map(([code, rate]) => [`1 USD in ${code}`, num(rate, 3)])],
      }),
    },
    {
      id: 'nyc311', name: 'NYC Open Data: 311', cat: 'cities', sdg: [11, 3],
      what: 'Every complaint New Yorkers report to 311 (rats, noise, heat, potholes), updated daily. One of thousands of NYC datasets.',
      idea: 'A “rat radar” for your zip code, or a map of noise complaints around school.',
      url: 'https://data.cityofnewyork.us/resource/erm2-nwe9.json?complaint_type=Rodent&$order=created_date%20DESC&$limit=20&$select=created_date,descriptor,borough,incident_zip',
      docs: 'https://dev.socrata.com/foundry/data.cityofnewyork.us/erm2-nwe9',
      note: 'Can take a few seconds. Try complaint_type=Noise - Residential or HEAT/HOT WATER. Browse more at opendata.cityofnewyork.us.',
      slow: true,
      render: (d) => ({
        facts: [['Latest rodent reports', d.length]],
        list: d.slice(0, 5).map((r) => `${r.descriptor}, ${r.borough} ${r.incident_zip || ''}, ${ago(r.created_date)}`),
      }),
    },
    {
      id: 'citibike', name: 'Citi Bike Live', cat: 'cities', sdg: [11, 13],
      what: 'Live count of bikes, e-bikes and empty docks at every Citi Bike station in New York City (NYC).',
      idea: '“Is there a bike?”: check the three docks nearest school before the bell rings.',
      url: 'https://gbfs.citibikenyc.com/gbfs/en/station_status.json',
      docs: 'https://github.com/MobilityData/gbfs/blob/master/gbfs.md',
      note: 'Station names and locations are in station_information.json in the same folder. Big file (about 1 MB).',
      render: (d) => {
        const live = d.data.stations.filter((s) => s.is_renting);
        const sum = (key) => live.reduce((a, s) => a + (s[key] || 0), 0);
        return {
          facts: [
            ['Stations renting right now', num(live.length)],
            ['Bikes available (incl. e-bikes)', num(sum('num_bikes_available'))],
            ['E-bikes available', num(sum('num_ebikes_available'))],
            ['Empty docks', num(sum('num_docks_available'))],
          ],
        };
      },
    },
    {
      id: 'overpass', name: 'Overpass (OpenStreetMap)', cat: 'cities', sdg: [6, 11],
      what: 'Ask the world’s open map for anything near a point: water fountains, bike racks, parks, recycling bins, ramps.',
      idea: '“Thirsty”: find the nearest free drinking water in any city.',
      url: 'https://overpass-api.de/api/interpreter?data=[out:json][timeout:25];node[amenity=drinking_water](around:1000,40.7489,-73.968);out;',
      fallbacks: ['https://maps.mail.ru/osm/tools/overpass/api/interpreter?data=[out:json][timeout:25];node[amenity=drinking_water](around:1000,40.7489,-73.968);out;'],
      docs: 'https://wiki.openstreetmap.org/wiki/Overpass_API',
      note: 'Queries use their own language, so ask your AI to write them. The public server gets busy and can time out. If it does, swap the start of the URL for https://maps.mail.ru/osm/tools/overpass/api/interpreter.',
      slow: true,
      render: (d) => ({
        facts: [['Drinking fountains within 1 km of the UN', d.elements.length]],
        list: d.elements.slice(0, 5).map((e) => `${e.tags?.name || e.tags?.description || 'Drinking water'} (${e.lat.toFixed(4)}, ${e.lon.toFixed(4)})`),
      }),
    },
    {
      id: 'geocode', name: 'Open-Meteo Geocoding', cat: 'cities', sdg: [11],
      what: 'Turns a place name into latitude and longitude. Most APIs on this page need those two numbers.',
      idea: 'Let people type “Lagos” instead of “6.45, 3.39”.',
      url: 'https://geocoding-api.open-meteo.com/v1/search?name=Nairobi&count=3',
      docs: 'https://open-meteo.com/en/docs/geocoding-api',
      render: (d) => ({
        facts: d.results.map((r) => [`${r.name}, ${r.country}`, `${r.latitude}, ${r.longitude}`]),
      }),
    },
    {
      id: 'wikipedia', name: 'Wikipedia', cat: 'knowledge', sdg: [4],
      what: 'A clean summary and picture for any Wikipedia article, plus “On this day” history.',
      idea: 'A “today in history” feed that only shows events connected to one SDG.',
      url: 'https://en.wikipedia.org/api/rest_v1/page/summary/Sustainable_Development_Goals',
      docs: 'https://en.wikipedia.org/api/rest_v1/',
      note: 'On this day: /api/rest_v1/feed/onthisday/events/10/24 (month/day). Swap “en” for “fr”, “es”, “ar” and 300+ other languages.',
      render: (d) => ({
        facts: [['Article', d.title]],
        list: [d.extract.length > 280 ? `${d.extract.slice(0, 280)}…` : d.extract],
        images: d.thumbnail ? [{ src: https(d.thumbnail.source), caption: d.title }] : [],
      }),
    },
    {
      id: 'books', name: 'Open Library', cat: 'knowledge', sdg: [4],
      what: 'Search millions of books by title, author or subject, with cover images.',
      idea: 'A “read the goals” shelf: one book for each SDG, with covers.',
      url: 'https://openlibrary.org/search.json?q=climate+change&limit=6&fields=title,author_name,first_publish_year,cover_i',
      docs: 'https://openlibrary.org/developers/api',
      note: 'Covers come from https://covers.openlibrary.org/b/id/COVER_ID-M.jpg. Searches can take a few seconds.',
      slow: true,
      render: (d) => ({
        facts: [['Books found', num(d.numFound)]],
        images: d.docs.filter((b) => b.cover_i).map((b) => ({
          src: `https://covers.openlibrary.org/b/id/${Number(b.cover_i)}-M.jpg`,
          caption: b.title,
        })),
      }),
    },
    {
      id: 'wiktionary', name: 'Wiktionary', cat: 'knowledge', sdg: [4],
      what: 'Dictionary definitions from Wikipedia’s sister project, for words in many languages.',
      idea: 'Word of the day in all six UN languages: Arabic, Chinese, English, French, Russian and Spanish.',
      url: 'https://en.wiktionary.org/api/rest_v1/page/definition/sustainable',
      docs: 'https://en.wiktionary.org/api/rest_v1/',
      note: 'Definitions come back with little HTML links inside. Ask your AI to strip them.',
      render: (d) => ({
        facts: [['Word', 'sustainable']],
        list: (d.en || []).flatMap((sense) => sense.definitions.map((def) => `${sense.partOfSpeech}: ${stripTags(def.definition)}`)).slice(0, 3),
      }),
    },
    {
      id: 'datamuse', name: 'Datamuse', cat: 'knowledge', sdg: [4],
      what: 'Finds words that rhyme, mean the same thing, or sound alike.',
      idea: 'A protest-sign slogan generator that actually rhymes.',
      url: 'https://api.datamuse.com/words?ml=ocean&max=10',
      docs: 'https://www.datamuse.com/api/',
      note: 'rel_rhy=planet for rhymes, ml=ocean for “means like”, sl= for “sounds like”.',
      render: (d) => ({ facts: [['Words that mean “ocean”', d.map((w) => w.word).join(', ')]] }),
    },
    {
      id: 'art', name: 'Art Institute of Chicago', cat: 'knowledge', sdg: [4, 11],
      what: 'Search more than 100,000 artworks, with high-resolution images.',
      idea: 'A gallery that pairs each SDG with art about it.',
      url: 'https://api.artic.edu/api/v1/artworks/search?q=ocean&limit=6&fields=id,title,image_id,artist_title',
      docs: 'https://api.artic.edu/docs/',
      note: 'Image URL pattern: https://www.artic.edu/iiif/2/IMAGE_ID/full/843,/0/default.jpg',
      render: (d) => ({
        facts: [['Artworks matching “ocean”', num(d.pagination.total)]],
        images: d.data.filter((a) => a.image_id).map((a) => ({
          src: `https://www.artic.edu/iiif/2/${encodeURIComponent(a.image_id)}/full/400,/0/default.jpg`,
          caption: `${a.title}${a.artist_title ? `, ${a.artist_title}` : ''}`,
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
      render: (d) => ({
        facts: [
          ['Position', `${d.latitude.toFixed(2)}, ${d.longitude.toFixed(2)}`],
          ['Height', `${num(d.altitude)} km`],
          ['Speed', `${num(d.velocity)} km/h`],
          ['Sunlight', d.visibility === 'daylight' ? 'In sunlight' : 'In Earth’s shadow'],
        ],
      }),
    },
    {
      id: 'sun', name: 'Sunrise-Sunset', cat: 'space', sdg: [7],
      what: 'Sunrise, sunset, day length and twilight times for any coordinates and date.',
      idea: 'A solar-panel planner: compare daylight hours in Nairobi and Oslo across the year.',
      url: 'https://api.sunrise-sunset.org/json?lat=40.7489&lng=-73.968&formatted=0',
      docs: 'https://sunrise-sunset.org/api',
      note: 'Times come back in UTC. Add &date=2026-12-21 for any day.',
      render: (d) => {
        const secs = d.results.day_length;
        return {
          facts: [
            ['Sunrise in New York', nyTime(d.results.sunrise)],
            ['Sunset', nyTime(d.results.sunset)],
            ['Daylight', `${Math.floor(secs / 3600)} h ${Math.round((secs % 3600) / 60)} min`],
          ],
        };
      },
    },
    {
      id: 'itunes', name: 'iTunes Search', cat: 'fun', sdg: [],
      what: 'Search songs, albums and podcasts. Results include cover art and 30-second previews.',
      idea: 'A soundtrack for your SDG: a playlist page with previews you can play.',
      url: 'https://itunes.apple.com/search?term=ocean&entity=song&limit=6&explicit=No',
      docs: 'https://performance-partners.apple.com/search-api',
      note: 'explicit=No leaves out explicit tracks.',
      render: (d) => ({
        images: d.results.map((r) => ({ src: https(r.artworkUrl100), caption: `${r.trackName}, ${r.artistName}` })),
      }),
    },
    {
      id: 'trivia', name: 'Open Trivia DB', cat: 'fun', sdg: [],
      what: 'Thousands of multiple-choice trivia questions, by category and difficulty.',
      idea: 'An SDG quiz game with a scoreboard for your class.',
      url: 'https://opentdb.com/api.php?amount=5&category=17&type=multiple',
      docs: 'https://opentdb.com/api_config.php',
      note: 'One request per 5 seconds per network, so load questions once and reuse them.',
      render: (d) => ({ list: d.results.map((q) => stripTags(q.question)) }),
    },
    {
      id: 'pokeapi', name: 'PokéAPI', cat: 'fun', sdg: [],
      what: 'Every Pokémon, with types, stats, moves and artwork.',
      idea: 'Warm-up: practice fetching and showing data before your real project.',
      url: 'https://pokeapi.co/api/v2/pokemon/pikachu',
      docs: 'https://pokeapi.co/docs/v2',
      render: (d) => ({
        facts: [['Name', d.name], ['Types', d.types.map((t) => t.type.name).join(', ')]],
        images: [{ src: https(d.sprites.other?.['official-artwork']?.front_default || d.sprites.front_default), caption: d.name }],
      }),
    },
    {
      id: 'dogs', name: 'Dog CEO', cat: 'fun', sdg: [],
      what: 'Random dog photos, by breed if you like. The simplest API on this page.',
      idea: 'Your very first fetch: a button that shows a new dog on every click.',
      url: 'https://dog.ceo/api/breeds/image/random',
      docs: 'https://dog.ceo/dog-api/documentation',
      render: (d) => ({ images: [{ src: https(d.message), caption: 'A random good dog' }] }),
    },
  ];

  // ---------- rendering ----------

  function previewHtml(view) {
    let html = '';
    if (view.facts?.length) {
      html += `<dl>${view.facts.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>`;
    }
    if (view.list?.length) html += `<ul>${view.list.map((item) => `<li>${esc(item)}</li>`).join('')}</ul>`;
    const images = (view.images || []).filter((img) => img.src);
    if (images.length) {
      html += `<div class="thumbs">${images.map((img) => `<figure><img src="${esc(img.src)}" alt="${esc(img.caption)}" loading="lazy"><figcaption>${esc(img.caption)}</figcaption></figure>`).join('')}</div>`;
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

  async function tryApi(api, card) {
    const out = card.querySelector('.preview');
    const button = card.querySelector('[data-try]');
    out.hidden = false;
    out.innerHTML = '<div class="status">Loading live data…</div>';
    button.disabled = true;
    const started = performance.now();
    let lastError;
    try {
      for (const url of [api.url, ...(api.fallbacks || [])]) {
        try {
          const raw = await fetchText(url);
          const isCsv = api.format === 'csv';
          const data = isCsv ? raw : JSON.parse(raw);
          const seconds = ((performance.now() - started) / 1000).toFixed(1);
          const sample = isCsv ? raw : JSON.stringify(data, null, 2);
          out.innerHTML = `<div class="status">Live, loaded in ${seconds} s</div>${previewHtml(api.render(data))}`
            + `<details><summary>Raw data (first 2,000 characters)</summary><pre>${esc(sample.slice(0, 2000))}</pre></details>`;
          return;
        } catch (err) {
          lastError = err;
        }
      }
      throw lastError;
    } catch (err) {
      out.innerHTML = `<div class="status err">Couldn’t load it: ${esc(err.message)}.</div>`
        + '<p class="small">Public APIs hiccup sometimes. Wait a minute and try again, or open the URL directly in a new tab.</p>';
    } finally {
      button.disabled = false;
    }
  }

  function cardHtml(api) {
    const color = api.sdg.length ? `var(--sdg-${api.sdg[0]})` : 'var(--line-2)';
    const badges = '<span class="badge">No key</span><span class="badge">Works in browser</span>'
      + (api.slow ? '<span class="badge slow">Can be slow</span>' : '');
    return `
      <article class="card api" id="api-${api.id}" style="--c: ${color}">
        <div class="api-top">
          <div><div class="cat">${esc(CATEGORIES[api.cat])}</div><h3>${esc(api.name)}</h3></div>
          <div class="chips">${api.sdg.map((n) => sdgChip(n, { button: true })).join('')}</div>
        </div>
        <p>${esc(api.what)}</p>
        <div class="idea"><b>Build idea</b>${esc(api.idea)}</div>
        <div class="endpoint"><code>${esc(api.url)}</code><button type="button" class="copy" data-copy-url>Copy URL</button></div>
        <div class="api-actions">
          <button type="button" class="btn btn-sm" data-try>Try it live</button>
          <button type="button" class="btn btn-sm btn-ghost" data-prompt>Copy starter prompt</button>
          <a class="btn btn-sm btn-ghost" href="${esc(api.docs)}" target="_blank" rel="noopener">Docs ↗</a>
        </div>
        <div class="badges">${badges}</div>
        ${api.note ? `<p class="note">${esc(api.note)}</p>` : ''}
        <div class="preview" hidden aria-live="polite"></div>
      </article>`;
  }

  function mountCatalog(grid) {
    const filters = document.getElementById('filters');
    const search = document.getElementById('search');
    const status = document.getElementById('result-note');
    const byId = Object.fromEntries(APIS.map((api) => [api.id, api]));
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
      } else if (button.matches('[data-try]')) {
        tryApi(api, card);
      } else if (button.matches('[data-copy-url]')) {
        flash(button, await copyText(api.url));
      } else if (button.matches('[data-prompt]')) {
        flash(button, await copyText(starterPrompt({ idea: api.idea, url: api.url, docs: api.docs })));
      }
    });

    apply();
    const target = location.hash && document.getElementById(location.hash.slice(1));
    if (target) {
      target.scrollIntoView();
      target.querySelector('[data-try]')?.focus({ preventScroll: true });
    }
  }

  window.UND.APIS = APIS;
  const grid = document.getElementById('api-grid');
  if (grid) mountCatalog(grid);
})();
