const prisma = require('../../config/database');
const AppError = require('../../utils/AppError');
const { redisClient } = require('../../config/redis');

// Industry standard 2026: 7 days cache TTL, explicitly invalidated on updates
const TRANSLATION_CACHE_TTL = 7 * 24 * 60 * 60; 

class LocalizationService {
  /**
   * Fetch the translated dictionary for a given locale, flattened into a single level map.
   */
  async getDictionary(locale) {
    const cacheKey = `localization:dict:${locale}`;
    
    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch (err) {
      console.warn('[Localization] Redis cache get error:', err.message);
    }

    const strings = await prisma.localizedString.findMany({
      where: { locale },
      select: { key: true, value: true }
    });

    // Flatten into a single map as requested (e.g., { "app.name": "HackET" })
    const dictionary = strings.reduce((acc, str) => {
      acc[str.key] = str.value;
      return acc;
    }, {});

    try {
      await redisClient.setEx(cacheKey, TRANSLATION_CACHE_TTL, JSON.stringify(dictionary));
    } catch (err) {
      console.warn('[Localization] Redis cache set error:', err.message);
    }

    return dictionary;
  }

  /**
   * Admin: List all translations with pagination
   */
  async getAdminList(query = {}) {
    const { locale, search, page = 1, limit = 50 } = query;
    const skip = (page - 1) * limit;

    const where = {};
    if (locale) where.locale = locale;
    if (search) {
      where.OR = [
        { key: { contains: search, mode: 'insensitive' } },
        { value: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [total, data] = await prisma.$transaction([
      prisma.localizedString.count({ where }),
      prisma.localizedString.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: [{ locale: 'asc' }, { key: 'asc' }]
      })
    ]);

    return {
      data,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Admin: Upsert a translation and clear cache
   */
  async upsertTranslation({ key, locale, value, context = 'ui', authorId }) {
    if (!key || !locale || !value) {
      throw new AppError('Key, locale, and value are required.', 400);
    }

    const record = await prisma.localizedString.upsert({
      where: {
        key_locale: { key, locale }
      },
      update: { value, context },
      create: { key, locale, value, context }
    });

    await this._invalidateCache(locale);
    return record;
  }

  /**
   * Admin: Delete a translation and clear cache
   */
  async deleteTranslation(id) {
    const record = await prisma.localizedString.findUnique({ where: { id } });
    if (!record) throw new AppError('Translation not found.', 404);

    await prisma.localizedString.delete({ where: { id } });
    await this._invalidateCache(record.locale);
    
    return record;
  }

  async _invalidateCache(locale) {
    const cacheKey = `localization:dict:${locale}`;
    try {
      await redisClient.del(cacheKey);
    } catch (err) {
      console.warn(`[Localization] Failed to invalidate cache for ${locale}:`, err.message);
    }
  }
}

module.exports = new LocalizationService();
