// Minimal iCal parser — handles VEVENT blocks with DTSTART, DTEND, SUMMARY, COLOR, CATEGORIES
window.parseICS = function(text) {
  const events = [];
  const lines = text.replace(/\r\n /g, '').replace(/\r\n\t/g, '').split(/\r\n|\n/);

  let inEvent = false;
  let current = {};

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
    return new Date(
      parseInt(raw.slice(0,4)),
      parseInt(raw.slice(4,6)) - 1,
      parseInt(raw.slice(6,8)),
      parseInt(raw.slice(9,11)),
      parseInt(raw.slice(11,13)),
      parseInt(raw.slice(13,15))
    );
  }

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') { inEvent = true; current = {}; continue; }
    if (line === 'END:VEVENT')   { inEvent = false; if (current.start) events.push(current); continue; }
    if (!inEvent) continue;

    const colon = line.indexOf(':');
    if (colon === -1) continue;
    const key = line.slice(0, colon).split(';')[0].toUpperCase();
    const val = line.slice(colon + 1);

    if (key === 'SUMMARY')         current.title    = val;
    if (key === 'LOCATION')        current.location = val;
    if (key === 'DTSTART')         current.start = parseDate(line.slice(colon + 1));
    if (key === 'DTEND')           current.end   = parseDate(line.slice(colon + 1));
    if (key === 'COLOR')           current.color = val;
    if (key === 'X-APPLE-CALENDAR-COLOR') current.color = val;
  }

  return events;
};
