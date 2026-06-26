const ICS_URLS = [
  {
    url: 'https://calendar.google.com/calendar/ical/29e773d34c93fbcb224c62ecf172e888ecde1066cf93002bcb8f14e0fddef7e1%40group.calendar.google.com/private-4acc890a9462f0189f23f5e9513b1c8f/basic.ics',
    color: '#4a9eff'
  }
];

const REFRESH_MS = 30 * 60 * 1000;
const LABELS = {
  en: {
    months: ['January','February','March','April','May','June','July','August','September','October','November','December'],
    days:   ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
  },
  es: {
    months: ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'],
    days:   ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom']
  }
};

let lang = 'en';
const BAR_H = 22;   // px per bar lane
const BAR_GAP = 2;  // px between bars

let viewYear, viewMonth, allEvents = [], currentView = '7day', sevenDayOffset = 0;

function init() {
  if (isWidgetMode()) {
    document.body.classList.add('widget-mode');
    fetchAllCalendars();
    return;
  }

  const now = new Date();
  viewYear  = now.getFullYear();
  viewMonth = now.getMonth();

  document.getElementById('btn-prev').addEventListener('click', () => navigateCurrent(-1));
  document.getElementById('btn-next').addEventListener('click', () => navigateCurrent(1));
  document.getElementById('btn-en').addEventListener('click', () => setLang('en'));
  document.getElementById('btn-es').addEventListener('click', () => setLang('es'));
  document.getElementById('btn-7day').addEventListener('click', () => setView('7day'));
  document.getElementById('btn-month').addEventListener('click', () => setView('month'));
  document.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft')  navigate(-1);
    if (e.key === 'ArrowRight') navigate(1);
  });
  setupSwipe();
  fetchAllCalendars();
  setInterval(fetchAllCalendars, REFRESH_MS);
}

function setupSwipe() {
  const app = document.getElementById('app');
  let startX = null;
  app.addEventListener('touchstart', e => { startX = e.touches[0].clientX; });
  app.addEventListener('touchend', e => {
    if (startX === null) return;
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 60) navigate(dx < 0 ? 1 : -1);
    startX = null;
  });
}

async function fetchAllCalendars() {
  setStatus('Updating...');
  allEvents = [];
  await Promise.all(ICS_URLS.map(async ({ url, color }) => {
    try {
      setStatus('Trying direct fetch...');
      let res = await fetch(url).catch(() => null);
      if (!res || !res.ok) {
        setStatus('Trying proxy...');
        res = await fetch('https://corsproxy.io/?' + encodeURIComponent(url));
      }
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const text = await res.text();
      setStatus('Parsing ' + text.length + ' bytes...');
      const events = parseICS(text).map(e => ({ ...e, color }));
      setStatus('Got ' + events.length + ' events');
      allEvents.push(...events);
    } catch (err) {
      setStatus('ERROR: ' + err.message);
    }
  }));
  await Weather.init(allEvents);
  if (document.body.classList.contains('widget-mode')) {
    startWidgetClock();
  } else if (currentView === '7day') {
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
    sevenDay.style.display     = 'flex';
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
  if (v === '7day') btnPrev.classList.add('hidden'); // starts at today, can't go back
}

function setLang(l) {
  lang = l;
  document.getElementById('btn-en').classList.toggle('active', l === 'en');
  document.getElementById('btn-es').classList.toggle('active', l === 'es');
  // Update day labels
  const labels = document.querySelectorAll('#day-labels div');
  LABELS[lang].days.forEach((d, i) => { labels[i].textContent = d; });
  renderCalendar();
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

function weekSubtitle(offset) {
  const weeks = offset / 7;
  if (weeks === 0) return 'This week';
  if (weeks === 1) return 'Next week';
  if (weeks === 2) return 'In 2 weeks';
  if (weeks === 3) return 'In 3 weeks';
  if (weeks === 4) return 'In 4 weeks';
  if (weeks === -1) return 'Last week';
  if (weeks === -2) return '2 weeks ago';
  if (weeks < 0)   return Math.abs(weeks) + ' weeks ago';
  return 'In ' + weeks + ' weeks';
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

  for (let i = 0; i < 7; i++) {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + sevenDayOffset + i);
    const dow  = date.getDay(); // 0=Sun,6=Sat
    const isWeekend = dow === 0 || dow === 6;
    const isToday   = i === 0 && sevenDayOffset === 0;

    const col = document.createElement('div');
    col.className = 'sd-col' +
      (isWeekend ? ' weekend'   : '') +
      (isToday   ? ' today-col' : '');

    // Header
    const header = document.createElement('div');
    header.className = 'sd-header';

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

    header.appendChild(dayName);
    header.appendChild(dateNum);
    header.appendChild(weatherDiv);
    col.appendChild(header);

    // Events
    const eventsDiv = document.createElement('div');
    eventsDiv.className = 'sd-events';

    const dayStart = date;
    const dayEnd   = addDays(date, 1);

    // Multi-day events that cover this day
    allEvents.filter(isMultiDay).filter(ev => {
      const end = displayEnd(ev);
      return ev.start < dayEnd && end > dayStart;
    }).sort((a, b) => a.start - b.start).forEach(ev => {
      const chip = document.createElement('div');
      chip.className = 'sd-event multiday';
      const msMulti = noteStyle(ev.title || '', date);
      chip.style.background = msMulti.bg;
      chip.style.transform  = `rotate(${msMulti.rotation}deg)`;
      chip.style.color      = 'rgba(0,0,0,0.72)';
      chip.textContent = ev.title || 'Event';
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
        chip.style.background = ns.bg;
        chip.style.transform  = `rotate(${ns.rotation}deg)`;
        chip.style.color      = 'rgba(0,0,0,0.72)';
        const allDay = ev.start.getHours() === 0 && ev.start.getMinutes() === 0;
        chip.style.flexDirection = 'column';
        chip.style.alignItems = 'flex-start';
        if (!allDay) {
          const timeDiv = document.createElement('div');
          timeDiv.style.fontWeight = '800';
          timeDiv.style.fontSize = '0.85rem';
          timeDiv.style.whiteSpace = 'nowrap';
          timeDiv.style.marginBottom = '2px';
          timeDiv.textContent = formatTime(ev.start);
          chip.appendChild(timeDiv);
        }
        const titleDiv = document.createElement('div');
        titleDiv.textContent = ev.title || 'Event';
        chip.appendChild(titleDiv);
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
    bar.style.background = ev.color + '33';
    bar.style.color      = ev.color;
    bar.style.borderLeft = startsHere ? ('3px solid ' + ev.color) : 'none';
    bar.textContent = ev.title || 'Event';
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
      chip.style.background   = ev.color + '22';
      chip.style.color        = ev.color;
      chip.style.borderLeftColor = ev.color;
      const allDay = ev.start.getHours() === 0 && ev.start.getMinutes() === 0;
      chip.textContent = (allDay ? '' : formatTime(ev.start) + ' ') + (ev.title || 'Event');
      cell.appendChild(chip);
    });

    if (evs.length > MAX) {
      const more = document.createElement('div');
      more.className = 'more-events';
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

  return { bg, rotation };
}

function formatTime(d) {
  return d.getHours().toString().padStart(2,'0') + ':' + d.getMinutes().toString().padStart(2,'0');
}

function setStatus(msg) {
  document.getElementById('status').textContent = msg;
}

// ── Widget mode ───────────────────────────────────────────────────────────────

function isWidgetMode() {
  // Samsung Family Hub board apps run in a smaller viewport
  // Also detectable via URL param ?widget=1 for testing
  return window.innerWidth < 1000 || location.search.includes('widget=1');
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
          timeDiv.textContent = formatTime(ev.start);
          chip.appendChild(timeDiv);
        }
        const titleDiv = document.createElement('div');
        titleDiv.textContent = ev.title || 'Event';
        chip.appendChild(titleDiv);
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
