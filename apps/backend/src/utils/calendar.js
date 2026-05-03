/**
 * Helper to format a JS Date to ICS UTC string (YYYYMMDDTHHMMSSZ)
 */
function formatIcsDate(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

/**
 * Generates an iCalendar (.ics) string for a hackathon event.
 *
 * @param {object} hackathon
 * @returns {string} The formatted .ics file content
 */
function generateIcs(hackathon) {
  // We'll create events for the Hackathon itself
  // If needed, we could create separate VEVENT blocks for registration and judging
  
  const dtstamp = formatIcsDate(new Date());
  const dtstart = formatIcsDate(hackathon.eventStart);
  const dtend = formatIcsDate(hackathon.eventEnd);
  const uid = `${hackathon.id}@hacket.com`;
  
  // Escape newlines and commas for ICS compliance
  const summary = (hackathon.title || 'Hackathon').replace(/,/g, '\\,');
  const description = (hackathon.description || '')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,');

  const icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//HackET//Hackathon Platform//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${dtstart}`,
    `DTEND:${dtend}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    `URL:${hackathon.websiteUrl || ''}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ];

  return icsLines.join('\r\n');
}

module.exports = {
  generateIcs,
  formatIcsDate,
};
