// =============================================================================
// HackET — Audit Service
// Centralized, immutable audit logging for all administrative & scoring actions.
// =============================================================================

const prisma = require('../../config/database');
const eventBus = require('../../utils/eventBus');

class AuditService {
  constructor() {
    // Listen for audit events from other services
    eventBus.on('audit:log', (payload) => {
      this.log(payload).catch((err) =>
        console.error('[Audit] Failed to log event:', err.message)
      );
    });
  }

  /**
   * Create an immutable audit log entry.
   *
   * @param {object} params
   * @param {string} [params.actorId] - User who performed the action (null for system)
   * @param {string} params.action    - AuditAction enum value
   * @param {string} params.entity    - Entity type (e.g., 'hackathon', 'score')
   * @param {string} [params.entityId] - UUID of the affected entity
   * @param {object} [params.details] - Additional context (JSON)
   * @param {string} [params.ipAddress]
   * @param {string} [params.userAgent]
   * @returns {object} The created AuditLog record
   */
  async log({ actorId, action, entity, entityId, details, ipAddress, userAgent }) {
    try {
      const entry = await prisma.auditLog.create({
        data: {
          actorId: actorId || null,
          action,
          entity,
          entityId: entityId || null,
          details: details || null,
          ipAddress: ipAddress || null,
          userAgent: userAgent || null,
        },
      });
      return entry;
    } catch (err) {
      // Audit logging should never crash the application
      console.error('[Audit] Error creating log entry:', err.message);
      return null;
    }
  }

  /**
   * Query audit logs with filtering and pagination.
   *
   * @param {object} [filters]
   * @param {string} [filters.actorId]
   * @param {string} [filters.action]
   * @param {string} [filters.entity]
   * @param {string} [filters.entityId]
   * @param {Date}   [filters.from]
   * @param {Date}   [filters.to]
   * @param {number} [filters.page=1]
   * @param {number} [filters.limit=50]
   * @returns {{ data: Array, pagination: object }}
   */
  async query({
    actorId,
    action,
    entity,
    entityId,
    from,
    to,
    page = 1,
    limit = 50,
  } = {}) {
    const where = {};

    if (actorId) where.actorId = actorId;
    if (action) where.action = action;
    if (entity) where.entity = entity;
    if (entityId) where.entityId = entityId;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const offset = (page - 1) * limit;

    const [data, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
        include: {
          actor: {
            select: { id: true, email: true, role: true },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

module.exports = new AuditService();
