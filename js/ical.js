// Minimal iCal parser — handles VEVENT blocks with DTSTART, DTEND, SUMMARY, COLOR, CATEGORIES
window.parseICS = function(text) {
  const events = [];
  const lines = text.replace(/\r\n /g, '').replace(/\r\n\t/g, '').split(/\r\n|\n/);

  let inEvent = false;
  let current = {};

  // Offset (ms) of Europe/Madrid from UTC at instant t
  function madridOffset(t) {
    const f = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Madrid', hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
    const p = {};
    f.formatToParts(new Date(t)).forEach(x => { p[x.type] = x.value; });
    return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - t;
  }

  function parseDate(val) {
    // Strip TZID or VALUE params: "TZID=Europe/Stockholm:20260615T090000"
    const raw = val.includes(':') ? val.split(':').pop() : val;
    if (raw.length === 8) {
      // All-day: YYYYMMDD
      return new Date(
        parseInt(raw.slice(0,4)),
        parseInt(raw.slice(4,6)) - 1,
        parseInt(raw.slice(6,8))
      );
    }
    // YYYYMMDDTHHMMSS[Z]
    const y  = parseInt(raw.slice(0,4)),  mo = parseInt(raw.slice(4,6)) - 1,
          d  = parseInt(raw.slice(6,8)),  h  = parseInt(raw.slice(9,11)),
          mi = parseInt(raw.slice(11,13)), s = parseInt(raw.slice(13,15));
    if (raw.endsWith('Z')) {
      // UTC timestamp — keep the true instant
      return new Date(Date.UTC(y, mo, d, h, mi, s));
    }
    // No Z: treat as Europe/Madrid wall time regardless of device timezone
    const guess = Date.UTC(y, mo, d, h, mi, s);
    return new Date(guess - madridOffset(guess));
  }

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') { inEvent = true; current = {}; continue; }
    if (line === 'END:VEVENT')   { inEvent = false; if (current.start) events.push(current); continue; }
    if (!inEvent) continue;

    const colon = line.indexOf(':');
    if (colon === -1) continue;
    const key = line.slice(0, colon).split(';')[0].toUpperCase();
    const val = line.slice(colon + 1);

    const unescape = s => s.replace(/\\n/gi, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\\\/g, '\\');
    if (key === 'SUMMARY')         current.title       = unescape(val);
    if (key === 'LOCATION')        current.location    = unescape(val);
    if (key === 'DESCRIPTION')     current.description = unescape(val);
    if (key === 'DTSTART')         current.start = parseDate(line.slice(colon + 1));
    if (key === 'DTEND')           current.end   = parseDate(line.slice(colon + 1));
    if (key === 'COLOR')           current.color = val;
    if (key === 'X-APPLE-CALENDAR-COLOR') current.color = val;
  }

  return events;
};
