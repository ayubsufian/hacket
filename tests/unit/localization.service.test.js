// File: tests/unit/localization.service.test.js
const localizationService = require('../../apps/backend/src/services/localization/localization.service');
const prisma = require('../../apps/backend/src/config/database');
const { redisClient } = require('../../apps/backend/src/config/redis');

// Mock dictionary entries
const sampleDict = [
  { key: 'hello', locale: 'am', value: 'ሰላም' },
  { key: 'world', locale: 'am', value: 'ዓለም' }
];

describe('Localization Service', () => {
  beforeAll(async () => {
    // Mock Prisma findMany to return sampleDict
    jest.spyOn(prisma.dictionary, 'findMany').mockResolvedValue(sampleDict);
    // Mock Redis get/set
    jest.spyOn(redisClient, 'get').mockResolvedValue(null);
    jest.spyOn(redisClient, 'set').mockImplementation(() => Promise.resolve('OK'));
  });

  afterAll(async () => {
    jest.restoreAllMocks();
  });

  test('getDictionary returns dictionary for given locale and caches it', async () => {
    const dict = await localizationService.getDictionary('am');
    expect(dict).toEqual({ hello: 'ሰላም', world: 'ዓለም' });
    // Should have cached in Redis
    expect(redisClient.set).toHaveBeenCalled();
  });

  test('Throws error if locale is missing', async () => {
    await expect(localizationService.getDictionary()).rejects.toThrow('Locale is required.');
  });
});
