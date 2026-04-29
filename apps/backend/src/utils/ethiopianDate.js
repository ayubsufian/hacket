// =============================================================================
// HackET — Ethiopian Date Utilities
// Thin wrapper around `ethiopian-date-converter` for API response formatting.
//
// All dates are stored as standard UTC DateTime in PostgreSQL.
// Conversion to Ethiopian Calendar (ዓ.ም.) happens here at the app layer.
//
// Note: ethiopian-date-converter is an ESM-only module, so we use dynamic
// import() in an async helper. For synchronous conversions we implement
// the algorithm inline (the calendar math is straightforward).
// =============================================================================

const AMHARIC_MONTHS = [
  'መስከረም', 'ጥቅምት', 'ኅዳር', 'ታኅሣሥ', 'ጥር', 'የካቲት',
  'መጋቢት', 'ሚያዚያ', 'ግንቦት', 'ሰኔ', 'ሐምሌ', 'ነሐሴ', 'ጳጉሜን',
];

const ENGLISH_MONTHS = [
  'Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir', 'Yekatit',
  'Megabit', 'Miazia', 'Ginbot', 'Sene', 'Hamle', 'Nehase', 'Pagumen',
];

// ---------------------------------------------------------------------------
// Inline Ethiopian calendar conversion (avoids ESM import issues)
// The Ethiopian calendar has 13 months: 12 months of 30 days + Pagumen (5-6)
// Ethiopian new year falls on September 11 (or 12 in leap years)
// ---------------------------------------------------------------------------

function _isGregorianLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Convert a Gregorian date to Ethiopian Calendar components.
 * @param {number} gYear - Gregorian year
 * @param {number} gMonth - Gregorian month (1-12)
 * @param {number} gDay - Gregorian day
 * @returns {{ year: number, month: number, day: number }}
 */
function _gregorianToEthiopian(gYear, gMonth, gDay) {
  const offsetYears = 8;
  const newYearMonth = 9; // September
  const newYearDay = _isGregorianLeapYear(gYear - 1) ? 12 : 11;

  const gregorianDate = new Date(Date.UTC(gYear, gMonth - 1, gDay));
  let ethiopianYear = gYear - offsetYears;

  const currentEthiopianNewYear = new Date(
    Date.UTC(gYear, newYearMonth - 1, newYearDay)
  );

  if (gregorianDate < currentEthiopianNewYear && gMonth <= newYearMonth && gDay < newYearDay) {
    ethiopianYear -= 1;
  }

  const lastEthiopianNewYear = new Date(
    Date.UTC(gYear - 1, newYearMonth - 1, newYearDay)
  );
  const differenceInDays = Math.floor(
    (gregorianDate - lastEthiopianNewYear) / (1000 * 60 * 60 * 24)
  );

  const ethiopianMonth = Math.floor(differenceInDays / 30) + 1;
  const ethiopianDay = differenceInDays % 30;

  return {
    year: ethiopianYear,
    month: ethiopianMonth,
    day: ethiopianDay,
  };
}

/**
 * Convert Ethiopian Calendar components to a Gregorian Date.
 * @param {number} eYear - Ethiopian year
 * @param {number} eMonth - Ethiopian month (1-13)
 * @param {number} eDay - Ethiopian day
 * @returns {Date}
 */
function _ethiopianToGregorian(eYear, eMonth, eDay) {
  const offsetYears = 8;
  const newYearMonth = 9;
  let gregorianYear = eYear + offsetYears;

  if (eMonth < newYearMonth || (eMonth === newYearMonth && eDay < 11)) {
    gregorianYear--;
  }

  const newYearDay = _isGregorianLeapYear(gregorianYear) ? 12 : 11;
  const gregorianNewYearDate = new Date(
    Date.UTC(gregorianYear, newYearMonth - 1, newYearDay)
  );

  const daysFromNewYear = (eMonth - 1) * 30 + eDay;
  gregorianNewYearDate.setUTCDate(
    gregorianNewYearDate.getUTCDate() + daysFromNewYear
  );

  return gregorianNewYearDate;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Convert a Gregorian Date to Ethiopian Calendar components.
 * @param {Date|string} date - Gregorian date
 * @returns {{ year, month, day, monthName, monthNameAm, formatted, formattedAm }}
 */
function toEthiopianDate(date) {
  const d = new Date(date);
  const { year, month, day } = _gregorianToEthiopian(
    d.getUTCFullYear(),
    d.getUTCMonth() + 1,
    d.getUTCDate()
  );

  return {
    year,
    month,
    day,
    monthName: ENGLISH_MONTHS[month - 1] || '',
    monthNameAm: AMHARIC_MONTHS[month - 1] || '',
    formatted: `${ENGLISH_MONTHS[month - 1]} ${day}, ${year}`,
    formattedAm: `${AMHARIC_MONTHS[month - 1]} ${day}፣ ${year} ዓ.ም.`,
  };
}

/**
 * Convert Ethiopian Calendar components to a Gregorian Date.
 * @param {number} year - Ethiopian year
 * @param {number} month - Ethiopian month (1-13)
 * @param {number} day - Ethiopian day
 * @returns {Date}
 */
function toGregorianDate(year, month, day) {
  return _ethiopianToGregorian(year, month, day);
}

/**
 * Get the current date/time in East Africa Time (EAT, UTC+3).
 * @returns {Date}
 */
function nowEAT() {
  return new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Africa/Addis_Ababa' })
  );
}

/**
 * Format a date for API response with both Gregorian and Ethiopian representations.
 * @param {Date|string} date
 * @returns {{ gregorian: string, ethiopian: object }}
 */
function formatDualDate(date) {
  const d = new Date(date);
  return {
    gregorian: d.toISOString(),
    ethiopian: toEthiopianDate(d),
  };
}

module.exports = {
  toEthiopianDate,
  toGregorianDate,
  nowEAT,
  formatDualDate,
};
