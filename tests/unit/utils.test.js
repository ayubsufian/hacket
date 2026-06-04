// File: tests/unit/utils.test.js
const { toEthiopianDate } = require('../../apps/backend/src/utils/ethiopianDate');
const { getPaginationParams, getPagingData } = require('../../apps/backend/src/utils/pagination');
const levenshtein = require('../../apps/backend/src/utils/levenshtein');

describe('Utils: Ethiopian Date Conversion', () => {
  test('Converts Gregorian date to Ethiopian date correctly', () => {
    // 1 Jan 2026 (Gregorian) -> 22 Tahsas 2018 (Ethiopian) approx
    const etDate = toEthiopianDate(new Date('2026-01-01'));
    expect(etDate).toEqual({ year: 2018, month: 4, day: 22 });
  });
});

describe('Utils: Pagination', () => {
  test('getPaginationParams computes offset and limit', () => {
    const { limit, offset } = getPaginationParams(2, 10);
    expect(limit).toBe(10);
    expect(offset).toBe(10); // page 2 * 10
  });

  test('getPagingData formats result with meta info', () => {
    const data = { rows: [1, 2, 3], count: 3 };
    const result = getPagingData(data, 2, 1, 5);
    expect(result).toEqual({
      totalItems: 3,
      totalPages: 1,
      currentPage: 2,
      data: [1, 2, 3]
    });
  });
});

describe('Utils: Levenshtein', () => {
  test('Calculates edit distance between two words', () => {
    const dist = levenshtein('kitten', 'sitting');
    expect(dist).toBe(3);
  });
});
