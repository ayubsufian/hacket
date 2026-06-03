// =============================================================================
// HackET — Ethiopian Date Utility
// Pure CJS implementation of Gregorian ↔ Ethiopian date conversion.
// Based on the canonical algorithm used by the Ethiopian Orthodox Tewahedo Church.
// 2026 Industry Standard: Zero-dependency, timezone-aware, fully testable.
// =============================================================================

'use strict';

/**
 * Ethiopian month names in both Amharic and English transliteration.
 */
const ETHIOPIAN_MONTHS_AM = [
  'መስከረም', 'ጥቅምት', 'ኅዳር', 'ታኅሣሥ', 'ጥር', 'የካቲት',
  'መጋቢት', 'ሚያዝያ', 'ግንቦት', 'ሰኔ', 'ሐምሌ', 'ነሐሴ', 'ጳጉሜ',
];

const ETHIOPIAN_MONTHS_EN = [
  'Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir', 'Yekatit',
  'Megabit', 'Miazia', 'Ginbot', 'Sene', 'Hamle', 'Nehase', 'Pagume',
];

/**
 * Determine if a Gregorian year is a leap year.
 */
function isGregorianLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

/**
 * Convert a Gregorian date (year, month 1-12, day 1-31) to Ethiopian date.
 * Returns { year, month, day } in Ethiopian calendar.
 */
function toEthiopian(gYear, gMonth, gDay) {
  const newYearMonth = 9; // Ethiopian New Year starts in September
  const newYearDay = isGregorianLeapYear(gYear - 1) ? 12 : 11;

  const gregorianDate = new Date(Date.UTC(gYear, gMonth - 1, gDay));
  const currentNewYear = new Date(Date.UTC(gYear, newYearMonth - 1, newYearDay));

  let ethYear = gYear - 8;

  if (gregorianDate < currentNewYear) {
    ethYear -= 1;
  }

  // Calculate days from last Ethiopian New Year
  const lastNewYearGreg = gYear - (gregorianDate < currentNewYear ? 1 : 0);
  const lastNewYearDay = isGregorianLeapYear(lastNewYearGreg - 1) ? 12 : 11;
  const lastNewYear = new Date(Date.UTC(lastNewYearGreg, newYearMonth - 1, lastNewYearDay));

  const diffDays = Math.floor((gregorianDate - lastNewYear) / (1000 * 60 * 60 * 24));

  const ethMonth = Math.floor(diffDays / 30) + 1;
  const ethDay = (diffDays % 30) + 1;

  return { year: ethYear, month: ethMonth, day: ethDay };
}

/**
 * Format an Ethiopian date as a human-readable string.
 * @param {{ year: number, month: number, day: number }} ethDate
 * @param {'am'|'en'} locale
 * @returns {string} e.g., "26 መስከረም 2018" or "26 Meskerem 2018"
 */
function formatEthiopianDate(ethDate, locale = 'am') {
  const months = locale === 'am' ? ETHIOPIAN_MONTHS_AM : ETHIOPIAN_MONTHS_EN;
  const monthName = months[ethDate.month - 1] || months[0];
  return `${ethDate.day} ${monthName} ${ethDate.year}`;
}

/**
 * Convert a JS Date object to an Ethiopian date string.
 * Uses EAT (UTC+3) for the conversion.
 * @param {Date|string} date
 * @param {'am'|'en'} locale
 * @returns {{ ethiopian: { year, month, day }, formatted: string }}
 */
function toEthiopianFromDate(date, locale = 'am') {
  const d = new Date(date);
  // Shift to EAT (UTC+3) before extracting date components
  const eatMs = d.getTime() + (3 * 60 * 60 * 1000);
  const eat = new Date(eatMs);
  const gYear = eat.getUTCFullYear();
  const gMonth = eat.getUTCMonth() + 1;
  const gDay = eat.getUTCDate();

  const ethiopian = toEthiopian(gYear, gMonth, gDay);
  return {
    ethiopian,
    formatted: formatEthiopianDate(ethiopian, locale),
  };
}

/**
 * Format a JS Date to EAT (East Africa Time, UTC+3) ISO string.
 * @param {Date|string} date
 * @returns {string} e.g., "2026-06-03T19:00:00+03:00"
 */
function formatEAT(date) {
  const d = new Date(date);
  const eatMs = d.getTime() + (3 * 60 * 60 * 1000);
  const eat = new Date(eatMs);
  const iso = eat.toISOString().replace('Z', '+03:00');
  return iso;
}

/**
 * Format a JS Date to EAT human-readable time string.
 * @param {Date|string} date
 * @returns {string} e.g., "7:00 PM EAT"
 */
function formatEATTime(date) {
  const d = new Date(date);
  const eatMs = d.getTime() + (3 * 60 * 60 * 1000);
  const eat = new Date(eatMs);
  let hours = eat.getUTCHours();
  const minutes = eat.getUTCMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${ampm} EAT`;
}

module.exports = {
  toEthiopian,
  formatEthiopianDate,
  toEthiopianFromDate,
  formatEAT,
  formatEATTime,
  ETHIOPIAN_MONTHS_AM,
  ETHIOPIAN_MONTHS_EN,
};
