// Weather via Open-Meteo (no API key). Geocoding via Nominatim.
// Usage: await Weather.init(events) → then Weather.getTemp('2026-07-01') → "24°"

const Weather = (() => {
  const SITGES = { lat: 41.2347, lon: 1.8052, name: 'Sitges' };
  const geocodeCache = {};   // location string → { lat, lon }
  const weatherCache = {};   // "lat,lon" → { date → maxTemp }
  let tempByDate = {};       // "YYYY-MM-DD" → "24°"

  function weatherEmoji(code) {
    if (code === 0)               return '☀️';
    if (code <= 2)                return '🌤️';
    if (code === 3)               return '☁️';
    if (code <= 49)               return '🌫️'; // fog/haze
    if (code <= 57)               return '🌦️'; // drizzle
    if (code <= 67)               return '🌧️'; // rain
    if (code <= 77)               return '❄️'; // snow
    if (code <= 82)               return '🌧️'; // showers
    if (code <= 86)               return '🌨️'; // snow showers
    if (code <= 99)               return '⛈️'; // thunderstorm
    return '';
  }

  function dateKey(d) {
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  async function geocode(locationStr) {
    if (!locationStr) return null;
    const key = locationStr.trim().toLowerCase();
    if (geocodeCache[key]) return geocodeCache[key];
    try {
      const url = 'https://nominatim.openstreetmap.org/search?q=' +
        encodeURIComponent(locationStr) + '&format=json&limit=1';
      const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
      const data = await res.json();
      if (data && data[0]) {
        const coord = { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
        geocodeCache[key] = coord;
        return coord;
      }
    } catch (e) { console.warn('Geocode failed:', locationStr, e); }
    return null;
  }

  async function fetchWeatherForCoord(lat, lon) {
    const cacheKey = lat.toFixed(2) + ',' + lon.toFixed(2);
    if (weatherCache[cacheKey]) return weatherCache[cacheKey];
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
        `&daily=temperature_2m_max,weathercode&timezone=auto&forecast_days=16`;
      const res  = await fetch(url);
      const data = await res.json();
      const result = {};
      (data.daily.time || []).forEach((d, i) => {
        result[d] = {
          temp: Math.round(data.daily.temperature_2m_max[i]),
          code: data.daily.weathercode[i]
        };
      });
      weatherCache[cacheKey] = result;
      return result;
    } catch (e) { console.warn('Weather fetch failed:', e); }
    return null;
  }

  async function getDefaultCoord() {
    return new Promise(resolve => {
      if (!navigator.geolocation) return resolve(SITGES);
      navigator.geolocation.getCurrentPosition(
        pos => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        ()  => resolve(SITGES),
        { timeout: 4000 }
      );
    });
  }

  async function init(events) {
    tempByDate = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Collect future dates and the first location found per date
    const dateLocations = {};
    events.forEach(ev => {
      const d = new Date(ev.start.getFullYear(), ev.start.getMonth(), ev.start.getDate());
      if (d < today) return;
      const k = dateKey(d);
      if (!dateLocations[k] && ev.location && ev.location.trim()) {
        dateLocations[k] = ev.location.trim();
      }
    });

    // Find all unique locations we need to geocode
    const uniqueLocations = [...new Set(Object.values(dateLocations))];
    await Promise.all(uniqueLocations.map(loc => geocode(loc)));

    // Get default coord for dates with no location
    const defaultCoord = await getDefaultCoord();

    // Fetch weather for each unique coord needed
    const coordsNeeded = new Set();
    const coordKey = c => c.lat.toFixed(2) + ',' + c.lon.toFixed(2);

    // Dates with a location
    Object.entries(dateLocations).forEach(([, loc]) => {
      const coord = geocodeCache[loc.trim().toLowerCase()];
      if (coord) coordsNeeded.add(coordKey(coord));
    });
    // Default coord for remaining dates
    coordsNeeded.add(coordKey(defaultCoord));

    // Fetch all needed weather data
    await Promise.all([...coordsNeeded].map(ck => {
      const [lat, lon] = ck.split(',').map(Number);
      return fetchWeatherForCoord(lat, lon);
    }));

    // Build tempByDate map using 16 days from today
    for (let i = 0; i < 16; i++) {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
      const k = dateKey(d);
      const loc = dateLocations[k];
      let coord = null;
      if (loc) coord = geocodeCache[loc.trim().toLowerCase()];
      if (!coord) coord = defaultCoord;
      const temps = weatherCache[coordKey(coord)];
      if (temps && temps[k] !== undefined) {
        const { temp, code } = temps[k];
        tempByDate[k] = weatherEmoji(code) + ' ' + temp + '°';
      }
    }
  }

  function getTemp(dateOrKey) {
    const k = typeof dateOrKey === 'string' ? dateOrKey :
      dateKey(dateOrKey);
    return tempByDate[k] || null;
  }

  return { init, getTemp };
})();
