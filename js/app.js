const COLORS = ['#4a9eff','#f97583','#85e89d','#ffab70','#b392f0','#79c0ff','#ffa657'];

const DEFAULT_CALENDARS = [
  { url: 'https://calendar.google.com/calendar/ical/29e773d34c93fbcb224c62ecf172e888ecde1066cf93002bcb8f14e0fddef7e1%40group.calendar.google.com/private-4acc890a9462f0189f23f5e9513b1c8f/basic.ics', color: '#4a9eff' }
];

function getStoredCalendars() {
  try {
    const stored = JSON.parse(localStorage.getItem('ics_urls') || '[]');
    return stored.length ? stored : DEFAULT_CALENDARS;
  } catch { return DEFAULT_CALENDARS; }
}

function saveCalendars(list) {
  localStorage.setItem('ics_urls', JSON.stringify(list));
}

let ICS_URLS = getStoredCalendars();

const REFRESH_MS = 10 * 60 * 1000;
const LABELS = {
  en: {
    months:    ['January','February','March','April','May','June','July','August','September','October','November','December'],
    days:      ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
    btn7day:   '7 Days',
    btnMonth:  'Month'
  },
  es: {
    months:    ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'],
    days:      ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'],
    btn7day:   '7 Días',
    btnMonth:  'Mes'
  },
  sv: {
    months:    ['Januari','Februari','Mars','April','Maj','Juni','Juli','Augusti','September','Oktober','November','December'],
    days:      ['Mån','Tis','Ons','Tor','Fre','Lör','Sön'],
    btn7day:   '7 dagar',
    btnMonth:  'Månad'
  },
  cy: {
    months:    ['Ionawr','Chwefror','Mawrth','Ebrill','Mai','Mehefin','Gorffennaf','Awst','Medi','Hydref','Tachwedd','Rhagfyr'],
    days:      ['Llun','Maw','Mer','Iau','Gwe','Sad','Sul'],
    btn7day:   '7 Diwrnod',
    btnMonth:  'Mis'
  },
  ca: {
    months:    ['Gener','Febrer','Març','Abril','Maig','Juny','Juliol','Agost','Setembre','Octubre','Novembre','Desembre'],
    days:      ['Dll','Dm','Dc','Dj','Dv','Ds','Dg'],
    btn7day:   '7 dies',
    btnMonth:  'Mes'
  }
};
const LANG_LOCALES = { en: 'en-GB', es: 'es-ES', sv: 'sv-SE', cy: 'cy-GB', ca: 'ca-ES' };
const LANG_LIST = Object.keys(LABELS);

let lang = LANG_LIST[Math.floor(Math.random() * LANG_LIST.length)];
const BAR_H = 56;   // px per bar lane
const BAR_GAP = 4;  // px between bars

let viewYear, viewMonth, allEvents = [], currentView = '7day', sevenDayOffset = 0;

function showSetup() {
  document.getElementById('setup').classList.add('visible');
  document.getElementById('app').style.display = 'none';
  renderCalList();

  document.getElementById('cal-add-btn').addEventListener('click', () => {
    const input = document.getElementById('cal-input');
    const url = input.value.trim();
    if (!url.includes('calendar.google.com') && !url.includes('.ics')) {
      input.style.borderColor = '#f85149';
      return;
    }
    const list = getStoredCalendars();
    list.push({ url, color: COLORS[list.length % COLORS.length] });
    saveCalendars(list);
    ICS_URLS = list;
    input.value = '';
    input.style.borderColor = '';
    renderCalList();
  });

  document.getElementById('setup-done-btn').addEventListener('click', () => {
    if (getStoredCalendars().length === 0) return;
    document.getElementById('setup').classList.remove('visible');
    document.getElementById('app').style.display = '';
    fetchAllCalendars();
  });
}

function renderCalList() {
  const list = getStoredCalendars();
  const el = document.getElementById('cal-list');
  el.innerHTML = '';
  list.forEach((cal, i) => {
    const row = document.createElement('div');
    row.className = 'cal-entry';
    row.innerHTML = `
      <div class="cal-dot" style="background:${cal.color}"></div>
      <div class="cal-url">${cal.url}</div>
      <button class="cal-remove" data-i="${i}">✕</button>`;
    row.querySelector('.cal-remove').addEventListener('click', () => {
      const l = getStoredCalendars();
      l.splice(i, 1);
      saveCalendars(l);
      ICS_URLS = l;
      renderCalList();
    });
    el.appendChild(row);
  });
}

document.addEventListener('DOMContentLoaded', function() {
  var kf = document.createElement('style');
  kf.textContent = '@keyframes gentlePulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.55; } }';
  document.head.appendChild(kf);

  var s = document.createElement('div');
  s.style.cssText = 'position:fixed;top:0;right:0;background:red;color:white;font-size:20px;padding:4px 10px;z-index:9999;';
  s.textContent = 'v37';
  document.body.appendChild(s);
});

// Word list lives in js/words.js (window.SPANISH_WORDS)
function updateSpanishWord() {
  let el = document.getElementById('word-of-day');
  if (!el) {
    el = document.createElement('div');
    el.id = 'word-of-day';
    el.style.cssText = 'font-size:1.8rem;color:#8b949e;letter-spacing:0.05em;margin-top:2px;';
    document.getElementById('clock-bar').appendChild(el);
  }
  // Days since epoch so the whole list cycles over the years, not just the first 365
  const daysSinceEpoch = Math.floor(Date.now() / 86400000);
  const [es, en] = SPANISH_WORDS[daysSinceEpoch % SPANISH_WORDS.length];
  el.innerHTML = '🇪🇸 <i>' + es + '</i> (' + en + ')';
}

function initAnalogClock() {
  const bar = document.getElementById('clock-bar');
  bar.style.position = 'relative';
  const size = 120;

  const face = document.createElement('div');
  face.id = 'analog-clock';
  face.style.cssText = `position:absolute;right:40px;top:50%;transform:translateY(-50%);width:${size}px;height:${size}px;border:3px solid rgba(255,255,255,0.25);border-radius:50%;`;

  for (let i = 0; i < 12; i++) {
    const major = i % 3 === 0;
    const tick = document.createElement('div');
    tick.style.cssText = `position:absolute;left:50%;top:50%;width:${major ? 3 : 2}px;height:${major ? 10 : 6}px;background:rgba(255,255,255,${major ? 0.5 : 0.28});transform:translate(-50%,-50%) rotate(${i * 30}deg) translateY(-${size / 2 - 9}px);`;
    face.appendChild(tick);
  }

  function makeHand(width, length, color) {
    const hand = document.createElement('div');
    hand.style.cssText = `position:absolute;left:50%;bottom:50%;width:${width}px;height:${length}px;background:${color};transform-origin:50% 100%;border-radius:${width}px;margin-left:${-width / 2}px;`;
    face.appendChild(hand);
    return hand;
  }
  const hourHand = makeHand(5, size * 0.26, '#e6edf3');
  const minHand  = makeHand(3.5, size * 0.38, '#e6edf3');
  const secHand  = makeHand(1.5, size * 0.43, '#f85149');

  const hub = document.createElement('div');
  hub.style.cssText = 'position:absolute;left:50%;top:50%;width:9px;height:9px;background:#f85149;border-radius:50%;transform:translate(-50%,-50%);';
  face.appendChild(hub);
  bar.appendChild(face);

  let lastDraw = 0;
  function draw() {
    lastDraw = Date.now();
    const now = new Date();
    const s = now.getSeconds() + now.getMilliseconds() / 1000;
    const m = now.getMinutes() + s / 60;
    const h = (now.getHours() % 12) + m / 60;
    secHand.style.transform  = `rotate(${s * 6}deg)`;
    minHand.style.transform  = `rotate(${m * 6}deg)`;
    hourHand.style.transform = `rotate(${h * 30}deg)`;
  }
  function frame() {
    draw();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  // Fallback: if rAF is throttled/paused, keep the hands moving (choppier but alive)
  setInterval(() => { if (Date.now() - lastDraw > 500) draw(); }, 250);
}

function startClock() {
  let lastDay = new Date().getDate();
  function tick() {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    document.getElementById('clock-time').textContent = hh + ':' + mm;
    updateClockDate();
    // Midnight rollover: re-render so "today" moves without waiting for the next fetch
    if (now.getDate() !== lastDay) {
      lastDay = now.getDate();
      updateSpanishWord();
      if (currentView === '7day') render7Day(); else renderCalendar();
    }
  }
  tick();
  updateSpanishWord();
  initAnalogClock();
  setInterval(tick, 1000);
}

function init() {
  if (ICS_URLS.length === 0) {
    showSetup();
    return;
  }

  startClock();

  const now = new Date();
  viewYear  = now.getFullYear();
  viewMonth = now.getMonth();

  document.getElementById('btn-prev').addEventListener('click', () => navigateCurrent(-1));
  document.getElementById('btn-next').addEventListener('click', () => navigateCurrent(1));
  LANG_LIST.forEach(code => {
    const btn = document.getElementById('btn-' + code);
    if (btn) btn.addEventListener('click', () => setLang(code));
  });
  document.getElementById('btn-7day').addEventListener('click', () => setView('7day'));
  document.getElementById('btn-month').addEventListener('click', () => setView('month'));
  document.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft')  navigate(-1);
    if (e.key === 'ArrowRight') navigate(1);
  });
  setupSwipe();
  setLang(lang);
  fetchAllCalendars();
  setInterval(fetchAllCalendars, REFRESH_MS);

  // Re-render every minute so finished/ongoing event styling stays current
  setInterval(() => {
    if (currentView === '7day') render7Day(); else renderCalendar();
  }, 60 * 1000);

  // Nightly full page reload at ~04:00 to clear browser memory (fridge freezes otherwise)
  setInterval(() => {
    const now = new Date();
    if (now.getHours() === 4 && now.getMinutes() < 2) location.reload();
  }, 60 * 1000);

  // Auto-update: poll index.html every 5 min; reload when a new ?v= is deployed
  const currentV = (document.querySelector('script[src*="app.js"]') || {}).src || '';
  const myV = (currentV.match(/\?v=(\d+)/) || [])[1];
  if (myV) {
    setInterval(async () => {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 8000);
        const res = await fetch('index.html?ts=' + Date.now(), { cache: 'no-store', signal: ctrl.signal });
        clearTimeout(timer);
        if (!res.ok) return;
        const html = await res.text();
        const newV = (html.match(/app\.js\?v=(\d+)/) || [])[1];
        // Navigate to a cache-busted URL — plain reload() can serve stale cached HTML on Tizen
        if (newV && newV !== myV) location.replace(location.pathname + '?r=' + Date.now());
      } catch {}
    }, 45 * 1000);
  }
}

function setupSwipe() {
  const app = document.getElementById('app');
  let startX = null;
  app.addEventListener('touchstart', e => { startX = e.touches[0].clientX; });
  app.addEventListener('touchend', e => {
    if (startX === null) return;
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 60) navigateCurrent(dx < 0 ? 1 : -1);
    startX = null;
  });
}

let lastFetchOk = null;

function setOfflineBanner(offline) {
  let b = document.getElementById('offline-banner');
  if (!offline) { if (b) b.remove(); return; }
  if (!b) {
    b = document.createElement('div');
    b.id = 'offline-banner';
    b.style.cssText = 'position:fixed;top:8px;left:8px;z-index:999;background:rgba(248,81,73,0.9);color:#fff;font-size:1.6rem;font-weight:600;padding:8px 18px;border-radius:8px;';
    document.body.appendChild(b);
  }
  b.textContent = '⚠ Offline — showing old events' +
    (lastFetchOk ? ' (last update ' + _timeFmt.format(new Date(lastFetchOk)) + ')' : '');
}

async function fetchAllCalendars() {
  setStatus('Updating...');
  const newEvents = [];
  let anySuccess = false;
  await Promise.all(ICS_URLS.map(async ({ url, color }) => {
    try {
      const proxies = [
        () => 'calendar.ics?ts=' + Date.now(),  // cache-bust: fridge caches plain fetches
        u => u,
        u => 'https://corsproxy.io/?' + encodeURIComponent(u),
        u => 'https://api.allorigins.win/raw?url=' + encodeURIComponent(u),
        u => 'https://thingproxy.freeboard.io/fetch/' + u,
      ];
      let res = null;
      for (const proxy of proxies) {
        try {
          setStatus('Fetching calendar...');
          const ctrl = new AbortController();
          const timer = setTimeout(() => ctrl.abort(), 8000);
          res = await fetch(proxy(url), { signal: ctrl.signal });
          clearTimeout(timer);
          if (res && res.ok) break;
        } catch { res = null; }
      }
      if (!res || !res.ok) throw new Error('All proxies failed');
      const ctrl2 = new AbortController();
      const timer2 = setTimeout(() => ctrl2.abort(), 10000);
      const text = await res.text();
      clearTimeout(timer2);
      setStatus('Parsing ' + text.length + ' bytes...');
      const events = parseICS(text).map(e => ({ ...e, color }));
      setStatus('Got ' + events.length + ' events');
      newEvents.push(...events);
      anySuccess = true;
    } catch (err) {
      setStatus('ERROR: ' + err.message);
    }
  }));
  if (anySuccess) {
    allEvents = newEvents;
    lastFetchOk = Date.now();
  }
  setOfflineBanner(!anySuccess);
  await Weather.init(allEvents);
  if (currentView === '7day') {
    render7Day();
  } else {
    renderCalendar();
  }
  setStatus('Updated ' + new Date().toLocaleTimeString());
}

function setView(v) {
  currentView = v;
  document.getElementById('btn-7day').classList.toggle('active', v === '7day');
  document.getElementById('btn-month').classList.toggle('active', v === 'month');

  const calendarGrid  = document.getElementById('calendar-grid');
  const dayLabels     = document.getElementById('day-labels');
  const sevenDay      = document.getElementById('seven-day');
  const btnPrev       = document.getElementById('btn-prev');
  const btnNext       = document.getElementById('btn-next');

  if (v === '7day') {
    calendarGrid.style.display = 'none';
    dayLabels.style.display    = 'none';
    sevenDay.style.cssText = 'display:flex;flex-direction:column;flex:1;min-height:0;gap:5px;';
    sevenDayOffset = 0;
    render7Day();
  } else {
    calendarGrid.style.display = '';
    dayLabels.style.display    = '';
    sevenDay.style.display     = 'none';
    document.getElementById('week-subtitle').style.display = 'none';
    renderCalendar();
  }
  btnPrev.classList.remove('hidden');
  btnNext.classList.remove('hidden');
  if (v === '7day') {
    btnPrev.classList.add('hidden');
    btnNext.classList.add('hidden');
  }
}

function setLang(l) {
  lang = l;
  LANG_LIST.forEach(code => {
    const btn = document.getElementById('btn-' + code);
    if (btn) btn.classList.toggle('active', l === code);
  });
  document.getElementById('btn-7day').textContent  = LABELS[l].btn7day;
  document.getElementById('btn-month').textContent = LABELS[l].btnMonth;
  updateClockDate();
  // Update day labels
  const labels = document.querySelectorAll('#day-labels div');
  LABELS[lang].days.forEach((d, i) => { labels[i].textContent = d; });
  if (currentView === '7day') render7Day(); else renderCalendar();
}

function navigateCurrent(dir) {
  if (currentView === '7day') {
    sevenDayOffset += dir * 7;
    if (sevenDayOffset < 0) sevenDayOffset = 0;
    document.getElementById('btn-prev').classList.toggle('hidden', sevenDayOffset === 0);
    render7Day();
  } else {
    navigate(dir);
  }
}

function navigate(dir) {
  const grid = document.getElementById('calendar-grid');
  grid.classList.add(dir > 0 ? 'slide-left' : 'slide-right');
  setTimeout(() => {
    grid.classList.remove('slide-left', 'slide-right');
    viewMonth += dir;
    if (viewMonth > 11) { viewMonth = 0;  viewYear++; }
    if (viewMonth < 0)  { viewMonth = 11; viewYear--; }
    renderCalendar();
  }, 200);
}

// ── Date helpers ─────────────────────────────────────────────────────────────

function dayOnly(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d, n) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

// True if event visually spans more than one calendar day
function isMultiDay(ev) {
  if (!ev.end) return false;
  const s = dayOnly(ev.start);
  const allDay = ev.start.getHours() === 0 && ev.start.getMinutes() === 0 &&
                 ev.end.getHours()   === 0 && ev.end.getMinutes()   === 0;
  // iCal all-day DTEND is exclusive: single all-day = end is startDay+1
  if (allDay) return (dayOnly(ev.end) - s) > 86400000;
  // Timed: under 24h is a single event on its start day, even crossing midnight (23:00–01:00)
  return (ev.end - ev.start) > 86400000;
}

// Exclusive end date for display (for all-day events, iCal DTEND is already exclusive)
function displayEnd(ev) {
  if (!ev.end) return addDays(ev.start, 1);
  const allDay = ev.start.getHours() === 0 && ev.start.getMinutes() === 0 &&
                 ev.end.getHours()   === 0 && ev.end.getMinutes()   === 0;
  // Timed events: end instant is exclusive, so 00:00 doesn't spill into the next day
  return allDay ? dayOnly(ev.end) : addDays(dayOnly(new Date(ev.end.getTime() - 1)), 1);
}

// ── Render ────────────────────────────────────────────────────────────────────

const WEEK_LABELS = {
  en: { thisWeek:'This week', nextWeek:'Next week', lastWeek:'Last week', inN:'In {n} weeks', nAgo:'{n} weeks ago' },
  es: { thisWeek:'Esta semana', nextWeek:'Próxima semana', lastWeek:'Semana pasada', inN:'En {n} semanas', nAgo:'Hace {n} semanas' },
  sv: { thisWeek:'Denna vecka', nextWeek:'Nästa vecka', lastWeek:'Förra veckan', inN:'Om {n} veckor', nAgo:'{n} veckor sedan' },
  cy: { thisWeek:'Yr wythnos hon', nextWeek:'Wythnos nesaf', lastWeek:'Wythnos diwethaf', inN:'Ymhen {n} wythnos', nAgo:'{n} wythnos yn ôl' },
  ca: { thisWeek:'Aquesta setmana', nextWeek:'La setmana vinent', lastWeek:'La setmana passada', inN:"D'aquí a {n} setmanes", nAgo:'Fa {n} setmanes' }
};

function weekSubtitle(offset) {
  const weeks = offset / 7;
  const wl = WEEK_LABELS[lang];
  if (weeks === 0) return wl.thisWeek;
  if (weeks === 1) return wl.nextWeek;
  if (weeks === -1) return wl.lastWeek;
  if (weeks > 0) return wl.inN.replace('{n}', weeks);
  return wl.nAgo.replace('{n}', Math.abs(weeks));
}

const CLOCK_DAYS = {
  en: ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],
  es: ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'],
  sv: ['Söndag','Måndag','Tisdag','Onsdag','Torsdag','Fredag','Lördag'],
  cy: ['Dydd Sul','Dydd Llun','Dydd Mawrth','Dydd Mercher','Dydd Iau','Dydd Gwener','Dydd Sadwrn'],
  ca: ['Diumenge','Dilluns','Dimarts','Dimecres','Dijous','Divendres','Dissabte']
};
const CLOCK_MONTHS = {
  en: ['January','February','March','April','May','June','July','August','September','October','November','December'],
  es: ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'],
  sv: ['januari','februari','mars','april','maj','juni','juli','augusti','september','oktober','november','december'],
  cy: ['Ionawr','Chwefror','Mawrth','Ebrill','Mai','Mehefin','Gorffennaf','Awst','Medi','Hydref','Tachwedd','Rhagfyr'],
  ca: ['gener','febrer','març','abril','maig','juny','juliol','agost','setembre','octubre','novembre','desembre']
};

function updateClockDate() {
  const now = new Date();
  const d = CLOCK_DAYS[lang][now.getDay()];
  const m = CLOCK_MONTHS[lang][now.getMonth()];
  document.getElementById('clock-date').textContent = d + '  ' + now.getDate() + ' ' + m + ' ' + now.getFullYear();
}


function render7Day() {
  const container = document.getElementById('seven-day');
  container.innerHTML = '';
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  document.getElementById('week-subtitle').textContent = weekSubtitle(sevenDayOffset);
  document.getElementById('week-subtitle').style.display = '';

  const midDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + sevenDayOffset + 3);
  document.getElementById('month-title').textContent =
    LABELS[lang].months[midDate.getMonth()] + ' ' + midDate.getFullYear();
  const l = LABELS[lang];

  // Current-week tint on container
  if (sevenDayOffset === 0) {
    container.style.background = 'rgba(88,166,255,0.06)';
    container.style.borderRadius = '10px';
    container.style.padding = '4px';
  } else {
    container.style.background = '';
    container.style.borderRadius = '';
    container.style.padding = '';
  }

  for (let i = 0; i < 7; i++) {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + sevenDayOffset + i);
    const dow  = date.getDay(); // 0=Sun,6=Sat
    const isWeekend = dow === 0 || dow === 6;
    const isToday   = i === 0 && sevenDayOffset === 0;

    const col = document.createElement('div');
    col.className = 'sd-col' +
      (isWeekend ? ' weekend'   : '') +
      (isToday   ? ' today-col' : '');
    col.style.cssText = 'display:flex;flex-direction:row;flex:1;min-height:0;border-radius:10px;overflow:hidden;' +
      (isWeekend ? 'background:rgba(255,200,100,0.05);' : 'background:rgba(255,255,255,0.03);') +
      (isToday   ? 'background:rgba(88,166,255,0.08);outline:1.5px solid rgba(88,166,255,0.3);' : '');

    // Header
    const header = document.createElement('div');
    header.className = 'sd-header';
    header.style.cssText = 'width:260px;flex-shrink:0;padding:8px 14px;border-right:1px solid rgba(255,255,255,0.05);display:flex;flex-direction:column;justify-content:center;';

    const dayName = document.createElement('div');
    dayName.className = 'sd-dayname';
    dayName.style.cssText = 'font-size:2.4rem;font-weight:600;letter-spacing:0.06em;color:#7d8590;margin-bottom:2px;word-break:break-word;';
    dayName.textContent = CLOCK_DAYS[lang][dow];

    const dateNum = document.createElement('div');
    dateNum.className = 'sd-datenum';
    dateNum.textContent = date.getDate();

    const weatherDiv = document.createElement('div');
    weatherDiv.className = 'sd-weather';
    const temp = Weather.getTemp(date);
    weatherDiv.textContent = temp || '';

    const locWord = Weather.getLocation(date);
    const locDiv = document.createElement('div');
    locDiv.style.cssText = 'font-size:2rem;color:#7d8590;margin-top:2px;';
    locDiv.textContent = locWord || '';

    header.appendChild(dayName);
    header.appendChild(dateNum);
    header.appendChild(weatherDiv);
    if (locWord) header.appendChild(locDiv);
    col.appendChild(header);

    // Events
    const eventsDiv = document.createElement('div');
    eventsDiv.className = 'sd-events';
    eventsDiv.style.cssText = 'flex:1;display:flex;flex-direction:row;align-items:center;gap:5px;padding:5px;min-width:0;overflow:hidden;';

    const dayStart = date;
    const dayEnd   = addDays(date, 1);

    // Multi-day events that cover this day
    allEvents.filter(isMultiDay).filter(ev => {
      const end = displayEnd(ev);
      return ev.start < dayEnd && end > dayStart;
    }).sort((a, b) => a.start - b.start).forEach(ev => {
      const chip = document.createElement('div');
      chip.className = 'sd-event multiday';
      const ms = noteStyle(ev.title || '', date);
      chip.style.cssText = `transform:rotate(${ms.rotation}deg);color:rgba(0,0,0,0.72);flex-shrink:0;aspect-ratio:1/1;height:calc(100% - 10px);display:flex;align-items:center;justify-content:center;text-align:center;padding:6px;border-radius:3px;border-top:3px solid rgba(0,0,0,0.15);font-size:2.8rem;font-weight:600;word-break:break-word;box-shadow:2px 3px 7px rgba(0,0,0,0.25);`;
      applyNoteBg(chip, ms);
      chip.textContent = flagTitle(ev.title) || 'Event';
      chip.addEventListener('click', () => showEventDetail(ev));
      eventsDiv.appendChild(chip);
    });

    // Single-day events
    allEvents.filter(e => !isMultiDay(e))
      .filter(e => e.start >= dayStart && e.start < dayEnd)
      .sort((a, b) => a.start - b.start)
      .forEach(ev => {
        const chip = document.createElement('div');
        chip.className = 'sd-event';
        const ns = noteStyle(ev.title || '', date);
        chip.style.cssText = `transform:rotate(${ns.rotation}deg);color:rgba(0,0,0,0.72);flex-shrink:0;aspect-ratio:1/1;height:calc(100% - 10px);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:6px;border-radius:3px;border-top:3px solid rgba(0,0,0,0.15);font-size:2.8rem;font-weight:600;word-break:break-word;box-shadow:2px 3px 7px rgba(0,0,0,0.25);`;
        applyNoteBg(chip, ns);
        const allDay = ev.start.getHours() === 0 && ev.start.getMinutes() === 0;
        if (!allDay) {
          const timeDiv = document.createElement('div');
          timeDiv.style.fontWeight = '800';
          timeDiv.style.fontSize = '3rem';
          timeDiv.style.whiteSpace = 'nowrap';
          timeDiv.style.marginBottom = '2px';
          timeDiv.textContent = formatTimeRange(ev);
          chip.appendChild(timeDiv);
        }
        const titleDiv = document.createElement('div');
        titleDiv.textContent = flagTitle(ev.title) || 'Event';
        chip.appendChild(titleDiv);
        chip.addEventListener('click', () => showEventDetail(ev));
        applyTimeState(chip, ev);
        eventsDiv.appendChild(chip);
      });

    col.appendChild(eventsDiv);
    container.appendChild(col);
  }
}

function renderCalendar() {
  document.getElementById('month-title').textContent = LABELS[lang].months[viewMonth] + ' ' + viewYear;

  const grid = document.getElementById('calendar-grid');
  grid.innerHTML = '';

  const firstDay  = new Date(viewYear, viewMonth, 1);
  let startOffset = firstDay.getDay() - 1;
  if (startOffset < 0) startOffset = 6;

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrev  = new Date(viewYear, viewMonth,     0).getDate();
  const totalCells  = Math.ceil((startOffset + daysInMonth) / 7) * 7;
  const today       = new Date();

  // Build flat array of day descriptors
  const days = [];
  for (let i = 0; i < totalCells; i++) {
    let day, month, year, otherMonth = false;
    if (i < startOffset) {
      day = daysInPrev - startOffset + 1 + i;
      month = viewMonth - 1; year = viewYear;
      if (month < 0) { month = 11; year--; }
      otherMonth = true;
    } else if (i >= startOffset + daysInMonth) {
      day = i - startOffset - daysInMonth + 1;
      month = viewMonth + 1; year = viewYear;
      if (month > 11) { month = 0; year++; }
      otherMonth = true;
    } else {
      day = i - startOffset + 1; month = viewMonth; year = viewYear;
    }
    const date = new Date(year, month, day);
    const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
    const isPast  = date < dayOnly(today) && !isToday;
    days.push({ day, month, year, isToday, isPast, otherMonth, date });
  }

  // Partition into weeks
  const multiDayEvs  = allEvents.filter(isMultiDay);
  const singleDayEvs = allEvents.filter(e => !isMultiDay(e));

  for (let w = 0; w < days.length / 7; w++) {
    const week = days.slice(w * 7, w * 7 + 7);
    grid.appendChild(buildWeekRow(week, multiDayEvs, singleDayEvs));
  }
}

function buildWeekRow(week, multiDayEvs, singleDayEvs) {
  const weekStart = week[0].date;
  const weekEnd   = addDays(week[6].date, 1);

  const today = new Date();
  const wholeWeekPast = week.every(d => d.date < dayOnly(today));

  const row = document.createElement('div');
  row.className = 'week-row' + (wholeWeekPast ? ' past-week' : '');

  // ── Day number strip ──────────────────────────────────────
  const numStrip = document.createElement('div');
  numStrip.className = 'day-numbers';
  week.forEach(d => {
    const cell = document.createElement('div');
    const dow = d.date.getDay(); // 0=Sun, 6=Sat
    const isWeekend = dow === 0 || dow === 6;
    cell.className = 'day-num-cell' +
      (d.otherMonth ? ' other-month' : '') +
      (d.isToday    ? ' today'       : '') +
      (d.isPast && !d.otherMonth ? ' past' : '') +
      (isWeekend && !d.otherMonth ? ' weekend' : '');
    const numSpan = document.createElement('span');
    numSpan.textContent = d.day;
    cell.appendChild(numSpan);
    if (!d.isPast && !d.otherMonth) {
      const temp = Weather.getTemp(d.date);
      if (temp) {
        const tempSpan = document.createElement('span');
        tempSpan.className = 'day-temp';
        tempSpan.textContent = temp;
        cell.appendChild(tempSpan);
      }
    }
    numStrip.appendChild(cell);
  });
  row.appendChild(numStrip);

  // ── Multi-day bars ────────────────────────────────────────
  const weekMulti = multiDayEvs.filter(ev => {
    const end = displayEnd(ev);
    return ev.start < weekEnd && end > weekStart;
  }).map(ev => {
    const end = displayEnd(ev);
    const colStart = Math.max(0, Math.round((Math.max(ev.start, weekStart) - weekStart) / 86400000));
    const colEnd   = Math.min(7, Math.round((Math.min(end,       weekEnd)   - weekStart) / 86400000));
    return { ev, colStart, colSpan: colEnd - colStart,
             startsHere: ev.start >= weekStart,
             endsHere:   end <= weekEnd };
  }).filter(b => b.colSpan > 0);

  // Sort: longer events first so they claim lower lanes
  weekMulti.sort((a, b) => b.colSpan - a.colSpan);

  // Lane assignment
  const laneEnds = [];
  weekMulti.forEach(b => {
    let lane = laneEnds.findIndex(end => end <= b.colStart);
    if (lane === -1) { lane = laneEnds.length; laneEnds.push(0); }
    b.lane = lane;
    laneEnds[lane] = b.colStart + b.colSpan;
  });

  const laneCount = laneEnds.length;
  const barsSection = document.createElement('div');
  barsSection.className = 'bars-section';
  barsSection.style.height = laneCount > 0 ? (laneCount * (BAR_H + BAR_GAP) + 2) + 'px' : '0';

  weekMulti.forEach(({ ev, colStart, colSpan, startsHere, endsHere, lane }) => {
    const bar = document.createElement('div');
    bar.className = 'event-bar' +
      (startsHere ? ' starts-this-week' : '') +
      (endsHere   ? ' ends-this-week'   : '');
    bar.style.left   = `calc(${colStart} / 7 * 100% + 3px)`;
    bar.style.width  = `calc(${colSpan}  / 7 * 100% - 6px)`;
    bar.style.top    = (lane * (BAR_H + BAR_GAP) + 2) + 'px';
    bar.style.height = BAR_H + 'px';
    const barNs = noteStyle(ev.title || '', weekStart);
    applyNoteBg(bar, barNs);
    bar.style.color      = 'rgba(0,0,0,0.72)';
    bar.style.borderLeft = startsHere ? '3px solid rgba(0,0,0,0.2)' : 'none';
    bar.textContent = flagTitle(ev.title) || 'Event';
    bar.addEventListener('click', () => showEventDetail(ev));
    bar.style.cursor = 'pointer';
    barsSection.appendChild(bar);
  });
  row.appendChild(barsSection);

  // ── Single-day events ─────────────────────────────────────
  const eventsRow = document.createElement('div');
  eventsRow.className = 'single-events-row';

  week.forEach(d => {
    const dow = d.date.getDay();
    const isWeekend = dow === 0 || dow === 6;
    const cell = document.createElement('div');
    cell.className = 'single-day-cell' +
      (d.isPast && !d.otherMonth ? ' past' : '') +
      (isWeekend && !d.otherMonth ? ' weekend' : '');

    const dayStart = d.date;
    const dayEnd   = addDays(d.date, 1);
    const evs = singleDayEvs
      .filter(e => e.start >= dayStart && e.start < dayEnd)
      .sort((a, b) => a.start - b.start);

    const MAX = 3;
    evs.slice(0, MAX).forEach(ev => {
      const chip = document.createElement('div');
      chip.className = 'event-chip';
      const chipNs = noteStyle(ev.title || '', d.date);
      const allDay = ev.start.getHours() === 0 && ev.start.getMinutes() === 0;
      chip.style.cssText = `color:rgba(0,0,0,0.72);border-left:5px solid rgba(0,0,0,0.2);font-size:2.4rem;line-height:1.3;padding:4px 10px;border-radius:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:500;flex-shrink:0;`;
      applyNoteBg(chip, chipNs);
      chip.textContent = (allDay ? '' : formatTimeRange(ev) + ' ') + (flagTitle(ev.title) || 'Event');
      chip.addEventListener('click', () => showEventDetail(ev));
      applyTimeState(chip, ev);
      cell.appendChild(chip);
    });

    if (evs.length > MAX) {
      const more = document.createElement('div');
      more.style.cssText = 'font-size:2.2rem;color:#7d8590;padding:0 8px;flex-shrink:0;';
      more.textContent = '+' + (evs.length - MAX) + ' more';
      cell.appendChild(more);
    }

    eventsRow.appendChild(cell);
  });
  row.appendChild(eventsRow);

  return row;
}

function strHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = str.charCodeAt(i) + ((h << 5) - h);
    h |= 0;
  }
  return Math.abs(h);
}

function dayOfYear(date) {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date - start) / 86400000);
}

function noteStyle(title, date) {
  const day = dayOfYear(date);

  // Each property gets its own independent hash
  const hColor    = strHash(title);
  const hAngle    = strHash(title + day + 'angle');
  const hRotation = strHash(title + day + 'rot');
  const hLit      = strHash(title + day + 'lit');

  // Color — stable across days (title only)
  const hue  = hColor % 360;
  const hue2 = (hue + 18 + hColor % 24) % 360;
  const sat  = 65 + hColor % 15;

  // Lightness — varies by day
  const lit1 = 74 + hLit % 10;
  const lit2 = 64 + hLit % 10;

  // Gradient angle — varies by day
  const angle = 150 + hAngle % 60;

  // Rotation — independently varies by day, range ±4°
  const rotation = ((hRotation % 80) - 40) * 0.1;

  const bg = `linear-gradient(${angle}deg,
    hsl(${hue}, ${sat}%, ${lit1}%) 0%,
    hsl(${hue2}, ${sat}%, ${lit2}%) 100%)`;

  // Subtle pattern — stable across days (title only)
  const hPattern = strHash(title + 'pat');
  const hP2      = strHash(title + 'pat2');
  const hP3      = strHash(title + 'pat3');
  const tint = `linear-gradient(${angle}deg, hsla(${hue},${sat}%,${lit1}%,1) 0%, hsla(${hue2},${sat}%,${lit2}%,1) 100%)`;

  // Randomised pattern parameters (all stable per title)
  const pAng   = hP2 % 180;                    // stripe/grid rotation 0–179°
  const pThick = 2 + hP3 % 6;                  // line thickness 2–7px
  const pGap   = 12 + hP2 % 26;                // spacing 12–37px
  const pDot   = 3 + hP3 % 5;                  // dot radius 3–7px
  const pCell  = 16 + hPattern % 20;           // dot/ring cell 16–35px
  const pInk   = (0.03 + (hP3 % 4) * 0.012).toFixed(3); // opacity 0.03–0.066
  const ink    = `rgba(0,0,0,${pInk})`;

  let patternImage = null, patternSize = null, patternPos = null;
  switch (hPattern % 17) {
    case 0: // diagonal stripes, random angle/thickness/gap
      patternImage = `repeating-linear-gradient(${pAng}deg, transparent 0, transparent ${pGap}px, ${ink} ${pGap}px, ${ink} ${pGap + pThick * 2}px)`;
      break;
    case 1: // polka dots, random size/spacing
      patternImage = `radial-gradient(circle, ${ink} ${pDot}px, transparent ${pDot + 1}px)`;
      patternSize = `${pCell}px ${pCell}px`;
      break;
    case 2: // ruled paper lines
      patternImage = `repeating-linear-gradient(0deg, transparent 0, transparent ${pGap + 10}px, ${ink} ${pGap + 10}px, ${ink} ${pGap + 10 + pThick}px)`;
      break;
    case 3: // grid — thicker lines so it's actually visible
      patternImage = `repeating-linear-gradient(0deg, transparent 0, transparent ${pGap + 8}px, ${ink} ${pGap + 8}px, ${ink} ${pGap + 8 + pThick + 2}px), repeating-linear-gradient(90deg, transparent 0, transparent ${pGap + 8}px, ${ink} ${pGap + 8}px, ${ink} ${pGap + 8 + pThick + 2}px)`;
      break;
    case 4: // diagonal grid (crosshatch) at random angle
      patternImage = `repeating-linear-gradient(${pAng}deg, transparent 0, transparent ${pGap}px, ${ink} ${pGap}px, ${ink} ${pGap + pThick}px), repeating-linear-gradient(${pAng + 90}deg, transparent 0, transparent ${pGap}px, ${ink} ${pGap}px, ${ink} ${pGap + pThick}px)`;
      break;
    case 5: // vertical pinstripes
      patternImage = `repeating-linear-gradient(90deg, transparent 0, transparent ${pGap}px, ${ink} ${pGap}px, ${ink} ${pGap + pThick}px)`;
      break;
    case 6: // rings
      patternImage = `radial-gradient(circle, transparent ${pDot + 2}px, ${ink} ${pDot + 3}px, ${ink} ${pDot + 3 + pThick}px, transparent ${pDot + 4 + pThick}px)`;
      patternSize = `${pCell + 8}px ${pCell + 8}px`;
      break;
    case 7: // double stripes — thick + thin alternating
      patternImage = `repeating-linear-gradient(${pAng}deg, transparent 0, transparent ${pGap}px, ${ink} ${pGap}px, ${ink} ${pGap + pThick * 3}px, transparent ${pGap + pThick * 3}px, transparent ${pGap + pThick * 3 + 6}px, ${ink} ${pGap + pThick * 3 + 6}px, ${ink} ${pGap + pThick * 3 + 6 + pThick}px)`;
      break;
    case 8: // confetti — two offset dot layers
      patternImage = `radial-gradient(circle, ${ink} ${pDot}px, transparent ${pDot + 1}px), radial-gradient(circle at ${Math.floor(pCell / 2)}px ${Math.floor(pCell / 2)}px, ${ink} ${Math.max(2, pDot - 2)}px, transparent ${pDot - 1}px)`;
      patternSize = `${pCell}px ${pCell}px, ${pCell}px ${pCell}px`;
      break;
    case 9: { // hexagon grid (SVG tile)
      const hexScale = 1.6 + (pGap % 20) / 10; // 1.6–3.5×
      const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='28' height='49' viewBox='0 0 28 49'><path d='M13.99 9.25l13 7.5v15l-13 7.5L1 31.75v-15l12.99-7.5zM3 17.9v12.7l10.99 6.34 11-6.35V17.9l-11-6.34L3 17.9zM0 15l12.98-7.5V0h-2v6.35L0 12.69v2.3zm0 18.5L12.98 41v8h-2v-6.85L0 35.81v-2.3zM15 0v7.5L27.99 15H28v-2.31h-.01L17 6.35V0h-2zm0 49v-8l12.99-7.5H28v2.31h-.01L17 42.15V49h-2z' fill='rgba(0,0,0,${pInk})'/></svg>`;
      patternImage = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
      patternSize = `${Math.round(28 * hexScale)}px ${Math.round(49 * hexScale)}px`;
      break;
    }
    case 10: // dashed diagonal (stripes broken by cross-stripes)
      patternImage = `repeating-linear-gradient(${pAng}deg, transparent 0, transparent ${pGap}px, ${ink} ${pGap}px, ${ink} ${pGap + pThick}px), repeating-linear-gradient(${pAng + 60}deg, transparent 0, transparent ${pGap + 6}px, ${ink} ${pGap + 6}px, ${ink} ${pGap + 6 + pThick}px)`;
      break;
    case 11: { // stars (inline SVG tile)
      const cell = pCell * 2;
      const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${cell}' height='${cell}'><polygon points='10,0 12.9,6.9 20,7.6 14.7,12.5 16.2,19.5 10,15.8 3.8,19.5 5.3,12.5 0,7.6 7.1,6.9' transform='scale(${(pCell / 20).toFixed(2)})' fill='rgba(0,0,0,${pInk})'/></svg>`;
      patternImage = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
      patternSize = `${cell}px ${cell}px`;
      break;
    }
    case 12: { // checkerboard — enforce a min square size so it reads as a pattern
      const cSq = 80 + (pGap % 40); // 80–119px squares
      const c2 = cSq * 2;
      patternImage = `linear-gradient(45deg, ${ink} 25%, transparent 25%, transparent 75%, ${ink} 75%), linear-gradient(45deg, ${ink} 25%, transparent 25%, transparent 75%, ${ink} 75%)`;
      patternSize = `${c2}px ${c2}px, ${c2}px ${c2}px`;
      patternPos = `0 0, ${cSq}px ${cSq}px`;
      break;
    }
    case 13: { // big polka dots
      const bigDot = 8 + pDot;         // 11–15px radius
      const bigCell = 40 + (pGap % 24); // 40–63px cell
      patternImage = `radial-gradient(circle, ${ink} ${bigDot}px, transparent ${bigDot + 1}px)`;
      patternSize = `${bigCell}px ${bigCell}px`;
      break;
    }
    case 14: { // zigzag
      const z = pGap + 8;
      patternImage = `linear-gradient(135deg, ${ink} 25%, transparent 25%), linear-gradient(225deg, ${ink} 25%, transparent 25%), linear-gradient(45deg, ${ink} 25%, transparent 25%), linear-gradient(315deg, ${ink} 25%, transparent 25%)`;
      patternSize = `${z}px ${z}px, ${z}px ${z}px, ${z}px ${z}px, ${z}px ${z}px`;
      patternPos = `${Math.floor(z / 2)}px 0, ${Math.floor(z / 2)}px 0, 0 0, 0 0`;
      break;
    }
    case 15: { // diamonds
      const d = 44 + (pGap % 20); // 44–63px tiles
      patternImage = `linear-gradient(45deg, ${ink} 25%, transparent 25%, transparent 75%, ${ink} 75%)`;
      patternSize = `${d}px ${d}px`;
      break;
    }
    // case 16: plain — no pattern
  }

  const solid = `hsl(${hue}, ${sat}%, ${lit1}%)`;
  return { bg, rotation, solid, tint, patternImage, patternSize, patternPos };
}

// Tap-for-detail overlay: big card with full title, time, location, description
function showEventDetail(ev) {
  const old = document.getElementById('event-detail');
  if (old) old.remove();

  const overlay = document.createElement('div');
  overlay.id = 'event-detail';
  overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.75);z-index:1000;display:flex;align-items:center;justify-content:center;padding:60px;';

  const ns = noteStyle(ev.title || '', dayOnly(ev.start));
  const card = document.createElement('div');
  card.style.cssText = 'max-width:75%;max-height:80%;overflow:hidden;padding:50px 60px;border-radius:6px;color:rgba(0,0,0,0.8);box-shadow:6px 10px 30px rgba(0,0,0,0.6);transform:rotate(' + ns.rotation + 'deg);display:flex;flex-direction:column;gap:18px;';
  applyNoteBg(card, ns);

  const title = document.createElement('div');
  title.style.cssText = 'font-size:4.5rem;font-weight:700;word-break:break-word;';
  title.textContent = flagTitle(ev.title) || 'Event';
  card.appendChild(title);

  const allDay = ev.start.getHours() === 0 && ev.start.getMinutes() === 0;
  const when = document.createElement('div');
  when.style.cssText = 'font-size:3rem;font-weight:600;';
  const dateFmt = new Intl.DateTimeFormat(LANG_LOCALES[lang] || 'en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Madrid' });
  when.textContent = dateFmt.format(ev.start) + (allDay ? '' : ' · ' + formatTimeRange(ev));
  card.appendChild(when);

  if (ev.location) {
    const loc = document.createElement('div');
    loc.style.cssText = 'font-size:2.6rem;';
    loc.textContent = '📍 ' + ev.location;
    card.appendChild(loc);
  }

  if (ev.description) {
    const desc = document.createElement('div');
    desc.style.cssText = 'font-size:2.4rem;white-space:pre-wrap;word-break:break-word;overflow:hidden;';
    desc.textContent = ev.description;
    card.appendChild(desc);
  }

  overlay.appendChild(card);
  overlay.addEventListener('click', () => overlay.remove());
  document.body.appendChild(overlay);
  setTimeout(() => { if (overlay.parentNode) overlay.remove(); }, 10000);
}

// 3-letter codes (IOC/FIFA/ISO3 + common aliases) → ISO2, converted to flag emoji.
// UK home nations use literal subdivision flags below.
const CODE_ISO2 = {
  AFG:'AF', ALB:'AL', ALG:'DZ', DZA:'DZ', AND:'AD', ANG:'AO', AGO:'AO', ARG:'AR', ARM:'AM', AUS:'AU', AUT:'AT', AZE:'AZ',
  BAH:'BS', BAN:'BD', BGD:'BD', BAR:'BB', BEL:'BE', BEN:'BJ', BER:'BM', BHU:'BT', BIH:'BA', BLR:'BY', BOL:'BO', BOT:'BW',
  BRA:'BR', BRN:'BH', BUL:'BG', BGR:'BG', BUR:'BF', CAM:'KH', KHM:'KH', CAN:'CA', CGO:'CG', CHA:'TD', CHI:'CL', CHL:'CL',
  CHN:'CN', CIV:'CI', CMR:'CM', COD:'CD', COL:'CO', CRC:'CR', CRI:'CR', CRO:'HR', HRV:'HR', CUB:'CU', CYP:'CY', CZE:'CZ',
  DEN:'DK', DNK:'DK', DJI:'DJ', DOM:'DO', ECU:'EC', EGY:'EG', ERI:'ER', ESA:'SV', SLV:'SV', ESP:'ES', SPA:'ES', EST:'EE',
  ETH:'ET', EUR:'EU', FIJ:'FJ', FJI:'FJ', FIN:'FI', FRA:'FR', GAB:'GA', GAM:'GM', GBR:'GB', GEO:'GE', GER:'DE', DEU:'DE',
  GHA:'GH', GRE:'GR', GRC:'GR', GUA:'GT', GTM:'GT', GUI:'GN', GUY:'GY', HAI:'HT', HTI:'HT', HON:'HN', HND:'HN', HOL:'NL',
  HUN:'HU', INA:'ID', IDN:'ID', IND:'IN', IRI:'IR', IRN:'IR', IRL:'IE', IRE:'IE', IRQ:'IQ', ISL:'IS', ISR:'IL', ITA:'IT',
  JAM:'JM', JOR:'JO', JPN:'JP', KAZ:'KZ', KEN:'KE', KGZ:'KG', KOR:'KR', KSA:'SA', SAU:'SA', KUW:'KW', KWT:'KW', LAO:'LA',
  LAT:'LV', LVA:'LV', LBN:'LB', LIB:'LB', LBR:'LR', LBA:'LY', LBY:'LY', LIE:'LI', LTU:'LT', LUX:'LU', MAD:'MG', MDG:'MG',
  MAR:'MA', MOR:'MA', MAS:'MY', MYS:'MY', MDA:'MD', MEX:'MX', MGL:'MN', MNG:'MN', MKD:'MK', MLI:'ML', MLT:'MT', MNE:'ME', MOZ:'MZ',
  MRI:'MU', MUS:'MU', MTN:'MR', MYA:'MM', NAM:'NA', NCA:'NI', NIC:'NI', NED:'NL', NLD:'NL', NEP:'NP', NPL:'NP', NGA:'NG',
  NGR:'NG', NIG:'NE', NER:'NE', NOR:'NO', NZL:'NZ', OMA:'OM', OMN:'OM', PAK:'PK', PAN:'PA', PAR:'PY', PRY:'PY', PER:'PE',
  PHI:'PH', PHL:'PH', PLE:'PS', PNG:'PG', POL:'PL', POR:'PT', PRT:'PT', PRK:'KP', PUR:'PR', PRI:'PR', QAT:'QA', ROU:'RO',
  ROM:'RO', RSA:'ZA', ZAF:'ZA', RUS:'RU', RWA:'RW', SEN:'SN', SIN:'SG', SGP:'SG', SLO:'SI', SVN:'SI', SMR:'SM', SOM:'SO',
  SRB:'RS', SRI:'LK', LKA:'LK', SUD:'SD', SDN:'SD', SUI:'CH', CHE:'CH', SVK:'SK', SWE:'SE', SYR:'SY', TAN:'TZ', TZA:'TZ',
  THA:'TH', TJK:'TJ', TKM:'TM', TOG:'TG', TGO:'TG', TPE:'TW', TWN:'TW', TTO:'TT', TUN:'TN', TUR:'TR', UAE:'AE', ARE:'AE',
  UGA:'UG', UKR:'UA', URU:'UY', URY:'UY', USA:'US', UZB:'UZ', VEN:'VE', VIE:'VN', VNM:'VN', YEM:'YE', ZAM:'ZM', ZMB:'ZM',
  ZIM:'ZW', ZWE:'ZW'
};
const SPECIAL_FLAGS = { ENG: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', SCO: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', WAL: '🏴󠁧󠁢󠁷󠁬󠁳󠁿', NIR: '🇬🇧' };

function codeFlag(code) {
  if (SPECIAL_FLAGS[code]) return SPECIAL_FLAGS[code];
  const iso2 = CODE_ISO2[code];
  if (!iso2) return null;
  return String.fromCodePoint(0x1F1E6 + iso2.charCodeAt(0) - 65, 0x1F1E6 + iso2.charCodeAt(1) - 65);
}

// Every standalone uppercase code in the title gets its flag: "WAL v ENG" → "🏴… WAL v 🏴… ENG"
function flagTitle(title) {
  if (!title) return title;
  return title.replace(/(^|[^A-Za-z])([A-Z]{3})(?![A-Za-z])/g, (m, pre, code) => {
    const flag = codeFlag(code);
    return flag ? pre + flag + ' ' + code : m;
  });
}

// 'past' = timed event already finished today, 'now' = happening right now, null = all-day or future
function eventTimeState(ev) {
  const allDay = ev.start.getHours() === 0 && ev.start.getMinutes() === 0;
  if (allDay) return null;
  const now = new Date();
  const end = ev.end || new Date(ev.start.getTime() + 60 * 60 * 1000);
  if (end <= now) return 'past';
  if (ev.start <= now && now < end) return 'now';
  return null;
}

function applyTimeState(el, ev) {
  const state = eventTimeState(ev);
  if (state === 'past') el.style.opacity = '0.5';
  if (state === 'now')  el.style.animation = 'gentlePulse 2.5s ease-in-out infinite';
}

// Apply noteStyle background to a chip element using separate properties
// (avoids Tizen misrendering layered background shorthand)
function applyNoteBg(el, ns) {
  el.style.backgroundColor = ns.solid;
  el.style.backgroundImage = ns.patternImage ? ns.patternImage + ', ' + ns.tint : ns.tint;
  if (ns.patternSize) el.style.backgroundSize = ns.patternSize + ', auto';
  if (ns.patternPos)  el.style.backgroundPosition = ns.patternPos + ', 0 0';
}

const _timeFmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid', hour12: false });
function formatTime(d) { return _timeFmt.format(d); }

// "13:00" or "13:00—17:30" when the event runs longer than an hour
function formatTimeRange(ev) {
  const start = formatTime(ev.start);
  if (ev.end && (ev.end - ev.start) > 60 * 60 * 1000) return start + '—' + formatTime(ev.end);
  return start;
}

function setStatus(msg) {
  document.getElementById('status').textContent = msg;
}

function renderWidget() {
  const now   = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const l     = LABELS[lang];

  // Header: date + clock
  document.getElementById('widget-date-title').textContent =
    l.months[now.getMonth()] + ' ' + now.getFullYear();
  document.getElementById('widget-time').textContent =
    now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0');

  // Reuse the 7-day column builder with widget container
  const container = document.getElementById('widget-seven-day');
  container.innerHTML = '';

  for (let i = 0; i < 7; i++) {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
    const dow  = date.getDay();
    const isWeekend = dow === 0 || dow === 6;
    const isToday   = i === 0;

    const col = document.createElement('div');
    col.className = 'sd-col' +
      (isWeekend ? ' weekend'   : '') +
      (isToday   ? ' today-col' : '');

    // Header
    const header = document.createElement('div');
    header.className = 'sd-header';
    const dayName = document.createElement('div');
    dayName.className = 'sd-dayname';
    const labelIdx = dow === 0 ? 6 : dow - 1;
    dayName.textContent = l.days[labelIdx];
    const dateNum = document.createElement('div');
    dateNum.className = 'sd-datenum';
    dateNum.textContent = date.getDate();
    const weatherDiv = document.createElement('div');
    weatherDiv.className = 'sd-weather';
    weatherDiv.textContent = Weather.getTemp(date) || '';
    header.appendChild(dayName);
    header.appendChild(dateNum);
    header.appendChild(weatherDiv);
    col.appendChild(header);

    // Events — reuse same logic as render7Day
    const eventsDiv = document.createElement('div');
    eventsDiv.className = 'sd-events';
    const dayStart = date;
    const dayEnd   = addDays(date, 1);

    allEvents.filter(isMultiDay).filter(ev => {
      const end = displayEnd(ev);
      return ev.start < dayEnd && end > dayStart;
    }).sort((a, b) => a.start - b.start).forEach(ev => {
      const chip = document.createElement('div');
      chip.className = 'sd-event multiday';
      const ms = noteStyle(ev.title || '', date);
      chip.style.background = ms.bg;
      chip.style.transform  = `rotate(${ms.rotation}deg)`;
      chip.style.color      = 'rgba(0,0,0,0.72)';
      chip.textContent = ev.title || 'Event';
      eventsDiv.appendChild(chip);
    });

    allEvents.filter(e => !isMultiDay(e))
      .filter(e => e.start >= dayStart && e.start < dayEnd)
      .sort((a, b) => a.start - b.start)
      .forEach(ev => {
        const chip = document.createElement('div');
        chip.className = 'sd-event';
        const ns = noteStyle(ev.title || '', date);
        chip.style.background = ns.bg;
        chip.style.transform  = `rotate(${ns.rotation}deg)`;
        chip.style.color      = 'rgba(0,0,0,0.72)';
        chip.style.flexDirection = 'column';
        chip.style.alignItems    = 'flex-start';
        const allDay = ev.start.getHours() === 0 && ev.start.getMinutes() === 0;
        if (!allDay) {
          const timeDiv = document.createElement('div');
          timeDiv.style.fontWeight = '800';
          timeDiv.style.fontSize   = '0.85rem';
          timeDiv.style.whiteSpace = 'nowrap';
          timeDiv.style.marginBottom = '2px';
          timeDiv.textContent = formatTimeRange(ev);
          chip.appendChild(timeDiv);
        }
        const titleDiv = document.createElement('div');
        titleDiv.textContent = flagTitle(ev.title) || 'Event';
        chip.appendChild(titleDiv);
        chip.addEventListener('click', () => showEventDetail(ev));
        applyTimeState(chip, ev);
        eventsDiv.appendChild(chip);
      });

    col.appendChild(eventsDiv);
    container.appendChild(col);
  }
}

function startWidgetClock() {
  renderWidget();
  setInterval(renderWidget, 60000);
}

document.addEventListener('DOMContentLoaded', init);
