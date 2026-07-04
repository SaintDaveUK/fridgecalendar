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

const REFRESH_MS = 30 * 60 * 1000;
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
  var s = document.createElement('div');
  s.style.cssText = 'position:fixed;top:0;right:0;background:red;color:white;font-size:20px;padding:4px 10px;z-index:9999;';
  s.textContent = 'v23';
  document.body.appendChild(s);
});

const SPANISH_WORDS = [
  ['gato','cat'],['perro','dog'],['playa','beach'],['sol','sun'],['lluvia','rain'],
  ['nevera','fridge'],['cocina','kitchen'],['desayuno','breakfast'],['cena','dinner'],['manzana','apple'],
  ['leche','milk'],['pan','bread'],['queso','cheese'],['huevo','egg'],['pollo','chicken'],
  ['pescado','fish'],['verdura','vegetable'],['fresa','strawberry'],['naranja','orange'],['uva','grape'],
  ['cuchara','spoon'],['tenedor','fork'],['cuchillo','knife'],['vaso','glass'],['plato','plate'],
  ['silla','chair'],['mesa','table'],['ventana','window'],['puerta','door'],['llave','key'],
  ['coche','car'],['bicicleta','bicycle'],['tren','train'],['avión','plane'],['barco','boat'],
  ['escuela','school'],['trabajo','work'],['médico','doctor'],['tienda','shop'],['mercado','market'],
  ['lunes','Monday'],['mañana','morning / tomorrow'],['noche','night'],['semana','week'],['hoy','today'],
  ['feliz','happy'],['cansado','tired'],['rápido','fast'],['despacio','slowly'],['juntos','together'],
  ['abuela','grandmother'],['hermano','brother'],['familia','family'],['amigo','friend'],['fiesta','party'],
  ['cumpleaños','birthday'],['regalo','gift'],['helado','ice cream'],['piscina','swimming pool'],['verano','summer']
];

function updateSpanishWord() {
  let el = document.getElementById('word-of-day');
  if (!el) {
    el = document.createElement('div');
    el.id = 'word-of-day';
    el.style.cssText = 'font-size:1.8rem;color:#8b949e;letter-spacing:0.05em;margin-top:2px;';
    document.getElementById('clock-bar').appendChild(el);
  }
  const [es, en] = SPANISH_WORDS[dayOfYear(new Date()) % SPANISH_WORDS.length];
  el.textContent = '🇪🇸 ' + es + ' — ' + en;
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
        if (newV && newV !== myV) location.reload();
      } catch {}
    }, 5 * 60 * 1000);
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
        () => 'calendar.ics',
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
  const e = dayOnly(ev.end);
  const allDay = ev.start.getHours() === 0 && ev.start.getMinutes() === 0 &&
                 ev.end.getHours()   === 0 && ev.end.getMinutes()   === 0;
  // iCal all-day DTEND is exclusive: single all-day = end is startDay+1
  if (allDay) return (e - s) > 86400000;
  return e > s;
}

// Exclusive end date for display (for all-day events, iCal DTEND is already exclusive)
function displayEnd(ev) {
  if (!ev.end) return addDays(ev.start, 1);
  const allDay = ev.start.getHours() === 0 && ev.start.getMinutes() === 0 &&
                 ev.end.getHours()   === 0 && ev.end.getMinutes()   === 0;
  return allDay ? dayOnly(ev.end) : addDays(ev.end, 1);
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
    // Mon-index: getDay() 0=Sun→6, 1=Mon→0 ... map to our labels array
    const labelIdx = dow === 0 ? 6 : dow - 1;
    dayName.textContent = l.days[labelIdx];

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
      chip.textContent = ev.title || 'Event';
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
        titleDiv.textContent = ev.title || 'Event';
        chip.appendChild(titleDiv);
        chip.addEventListener('click', () => showEventDetail(ev));
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
    bar.textContent = ev.title || 'Event';
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
      chip.textContent = (allDay ? '' : formatTimeRange(ev) + ' ') + (ev.title || 'Event');
      chip.addEventListener('click', () => showEventDetail(ev));
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
  const tint = `linear-gradient(${angle}deg, hsla(${hue},${sat}%,${lit1}%,1) 0%, hsla(${hue2},${sat}%,${lit2}%,1) 100%)`;
  let patternImage = null, patternSize = null;
  switch (hPattern % 5) {
    case 0: // diagonal stripes
      patternImage = 'repeating-linear-gradient(45deg, transparent 0, transparent 10px, rgba(0,0,0,0.05) 10px, rgba(0,0,0,0.05) 20px)';
      break;
    case 1: // polka dots
      patternImage = 'radial-gradient(rgba(0,0,0,0.07) 15%, transparent 16%)';
      patternSize = '22px 22px';
      break;
    case 2: // ruled paper lines
      patternImage = 'repeating-linear-gradient(0deg, transparent 0, transparent 24px, rgba(0,0,0,0.06) 24px, rgba(0,0,0,0.06) 26px)';
      break;
    case 3: // grid
      patternImage = 'repeating-linear-gradient(0deg, transparent 0, transparent 26px, rgba(0,0,0,0.045) 26px, rgba(0,0,0,0.045) 28px), repeating-linear-gradient(90deg, transparent 0, transparent 26px, rgba(0,0,0,0.045) 26px, rgba(0,0,0,0.045) 28px)';
      break;
    // case 4: plain — no pattern
  }

  const solid = `hsl(${hue}, ${sat}%, ${lit1}%)`;
  return { bg, rotation, solid, tint, patternImage, patternSize };
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
  title.textContent = ev.title || 'Event';
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

// Apply noteStyle background to a chip element using separate properties
// (avoids Tizen misrendering layered background shorthand)
function applyNoteBg(el, ns) {
  el.style.backgroundColor = ns.solid;
  el.style.backgroundImage = ns.patternImage ? ns.patternImage + ', ' + ns.tint : ns.tint;
  if (ns.patternSize) el.style.backgroundSize = ns.patternSize + ', auto';
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
        titleDiv.textContent = ev.title || 'Event';
        chip.appendChild(titleDiv);
        chip.addEventListener('click', () => showEventDetail(ev));
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
