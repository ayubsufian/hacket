// =============================================================================
// HackET — Calendar Utility (ICS Generator)
// 2026 Industry Standard: RFC 5545 compliant ICS generation with
// EAT (Africa/Addis_Ababa) VTIMEZONE, multi-event lifecycle blocks,
// and Ethiopian Calendar annotation support.
// =============================================================================

'use strict';

const { toEthiopianFromDate, formatEATTime } = require('./ethiopianDate');

// ── EAT is a fixed UTC+3 offset (no DST transitions) ────────────────────────
const EAT_VTIMEZONE = [
  'BEGIN:VTIMEZONE',
  'TZID:Africa/Addis_Ababa',
  'X-LIC-LOCATION:Africa/Addis_Ababa',
  'BEGIN:STANDARD',
  'DTSTART:19700101T000000',
  'TZOFFSETFROM:+0300',
  'TZOFFSETTO:+0300',
  'TZNAME:EAT',
  'END:STANDARD',
  'END:VTIMEZONE',
].join('\r\n');

/**
 * Format a JS Date to ICS UTC timestamp (YYYYMMDDTHHMMSSZ).
 */
function formatIcsDate(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

/**
 * Format a JS Date to ICS local time in EAT (YYYYMMDDTHHMMSS with TZID).
 */
function formatIcsDateEAT(date) {
  if (!date) return '';
  const d = new Date(date);
  const eatMs = d.getTime() + (3 * 60 * 60 * 1000);
  const eat = new Date(eatMs);
  return eat.toISOString().replace(/[-:]/g, '').split('.')[0];
}

/**
 * Escape a string for ICS field values per RFC 5545.
 */
function escapeIcs(str) {
  if (!str) return '';
  return str
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/**
 * Build a single VEVENT block.
 */
function buildVEvent({ uid, summary, description, dtstart, dtend, url, alarm }) {
  const dtstamp = formatIcsDate(new Date());
  const lines = [
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART;TZID=Africa/Addis_Ababa:${formatIcsDateEAT(dtstart)}`,
  ];

  if (dtend) {
    lines.push(`DTEND;TZID=Africa/Addis_Ababa:${formatIcsDateEAT(dtend)}`);
  }

  lines.push(`SUMMARY:${escapeIcs(summary)}`);

  if (description) {
    lines.push(`DESCRIPTION:${escapeIcs(description)}`);
  }
  if (url) {
    lines.push(`URL:${url}`);
  }

  // 2026 Standard: Add a 24-hour reminder alarm for deadlines
  if (alarm) {
    lines.push(
      'BEGIN:VALARM',
      'TRIGGER:-P1D',
      'ACTION:DISPLAY',
      `DESCRIPTION:Reminder: ${escapeIcs(summary)}`,
      'END:VALARM',
    );
  }

  lines.push('END:VEVENT');
  return lines.join('\r\n');
}

/**
 * Build an Ethiopian Calendar annotation string for a date.
 * @param {Date} date
 * @param {'GREGORIAN'|'ETHIOPIAN'} calendarType
 * @returns {string}
 */
function buildEthiopianAnnotation(date, calendarType) {
  if (!date || calendarType !== 'ETHIOPIAN') return '';
  const ethAm = toEthiopianFromDate(date, 'am');
  const ethEn = toEthiopianFromDate(date, 'en');
  const eatTime = formatEATTime(date);
  return `[Ethiopian Calendar: ${ethEn.formatted} / ${ethAm.formatted} at ${eatTime}]`;
}

/**
 * Generate a full RFC 5545 ICS string for a hackathon.
 * Creates separate VEVENT blocks for each lifecycle phase.
 *
 * @param {object} hackathon — The hackathon record from DB
 * @param {'GREGORIAN'|'ETHIOPIAN'} calendarType — User's preferred calendar
 * @returns {string} The formatted .ics file content
 */
function generateIcs(hackathon, calendarType = 'GREGORIAN') {
  const isEthiopian = calendarType === 'ETHIOPIAN';
  const baseUid = hackathon.id;
  const title = hackathon.title || 'Hackathon';
  const desc = hackathon.description || '';
  const url = hackathon.websiteUrl || '';

  const events = [];

  // 1. Registration Phase
  if (hackathon.registrationStart && hackathon.registrationEnd) {
    const ethAnnotation = isEthiopian
      ? `\\n${buildEthiopianAnnotation(hackathon.registrationStart, calendarType)} — ${buildEthiopianAnnotation(hackathon.registrationEnd, calendarType)}`
      : '';
    events.push(buildVEvent({
      uid: `${baseUid}-registration@hacket.et`,
      summary: isEthiopian
        ? `📝 ${title} — Registration (ምዝገባ)`
        : `📝 ${title} — Registration`,
      description: `Registration window for ${title}.${ethAnnotation}`,
      dtstart: hackathon.registrationStart,
      dtend: hackathon.registrationEnd,
      url,
      alarm: true,
    }));
  }

  // 2. Event Start / End (Main hackathon)
  if (hackathon.eventStart && hackathon.eventEnd) {
    const ethAnnotation = isEthiopian
      ? `\\n${buildEthiopianAnnotation(hackathon.eventStart, calendarType)} — ${buildEthiopianAnnotation(hackathon.eventEnd, calendarType)}`
      : '';
    events.push(buildVEvent({
      uid: `${baseUid}-event@hacket.et`,
      summary: isEthiopian
        ? `🚀 ${title} (ሃካቶን)`
        : `🚀 ${title}`,
      description: `${desc}${ethAnnotation}`,
      dtstart: hackathon.eventStart,
      dtend: hackathon.eventEnd,
      url,
      alarm: true,
    }));
  }

  // 3. Submission Deadline
  if (hackathon.submissionDeadline) {
    const ethAnnotation = isEthiopian
      ? `\\n${buildEthiopianAnnotation(hackathon.submissionDeadline, calendarType)}`
      : '';
    const deadlineEnd = new Date(new Date(hackathon.submissionDeadline).getTime() + 60 * 60 * 1000); // 1 hour block
    events.push(buildVEvent({
      uid: `${baseUid}-submission@hacket.et`,
      summary: isEthiopian
        ? `⏰ ${title} — Submission Deadline (የማስረከቢያ ግዜ)`
        : `⏰ ${title} — Submission Deadline`,
      description: `Final submission deadline for ${title}. No late submissions accepted.${ethAnnotation}`,
      dtstart: hackathon.submissionDeadline,
      dtend: deadlineEnd,
      url,
      alarm: true,
    }));
  }

  // 4. Feedback / Judging Deadline
  if (hackathon.feedbackDeadline) {
    const ethAnnotation = isEthiopian
      ? `\\n${buildEthiopianAnnotation(hackathon.feedbackDeadline, calendarType)}`
      : '';
    const deadlineEnd = new Date(new Date(hackathon.feedbackDeadline).getTime() + 60 * 60 * 1000);
    events.push(buildVEvent({
      uid: `${baseUid}-judging@hacket.et`,
      summary: isEthiopian
        ? `⚖️ ${title} — Judging Deadline (የዳኝነት ግዜ)`
        : `⚖️ ${title} — Judging Deadline`,
      description: `Judging and feedback completion deadline for ${title}.${ethAnnotation}`,
      dtstart: hackathon.feedbackDeadline,
      dtend: deadlineEnd,
      url,
      alarm: true,
    }));
  }

  // 5. Scoreboard Release
  if (hackathon.scoreboardReleaseAt) {
    const ethAnnotation = isEthiopian
      ? `\\n${buildEthiopianAnnotation(hackathon.scoreboardReleaseAt, calendarType)}`
      : '';
    const releaseEnd = new Date(new Date(hackathon.scoreboardReleaseAt).getTime() + 60 * 60 * 1000);
    events.push(buildVEvent({
      uid: `${baseUid}-results@hacket.et`,
      summary: isEthiopian
        ? `🏆 ${title} — Results Released (ውጤት)`
        : `🏆 ${title} — Results Released`,
      description: `Final scores and feedback for ${title} will be published.${ethAnnotation}`,
      dtstart: hackathon.scoreboardReleaseAt,
      dtend: releaseEnd,
      url,
      alarm: false,
    }));
  }

  // If no events could be generated, create a minimal fallback
  if (events.length === 0 && hackathon.eventStart) {
    events.push(buildVEvent({
      uid: `${baseUid}@hacket.et`,
      summary: title,
      description: desc,
      dtstart: hackathon.eventStart,
      dtend: hackathon.eventEnd || hackathon.eventStart,
      url,
      alarm: false,
    }));
  }

  // Assemble full VCALENDAR
  const icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//HackET//Hackathon Platform//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-TIMEZONE:Africa/Addis_Ababa',
    EAT_VTIMEZONE,
    ...events,
    'END:VCALENDAR',
  ];

  return icsLines.join('\r\n');
}

module.exports = {
  generateIcs,
  formatIcsDate,
  formatIcsDateEAT,
  buildEthiopianAnnotation,
};
