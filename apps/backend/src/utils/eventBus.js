// =============================================================================
// HackET — Event Bus (Application-level pub/sub)
// Singleton EventEmitter for decoupled inter-service communication.
//
// Events:
//   - 'scores:updated'      → { hackathonId, submissionId }
//   - 'team:invited'        → { teamId, receiverId, senderId }
//   - 'deadline:approaching' → { hackathonId, type, deadline }
//   - 'submission:created'  → { submissionId, teamId, hackathonId }
//   - 'certificate:issued'  → { userId, hackathonId, certificateId }
//   - 'audit:log'           → { actorId, action, entity, entityId, details }
// =============================================================================

const { EventEmitter } = require('events');

class HackETEventBus extends EventEmitter {
  constructor() {
    super();
    // Allow many listeners for notification fan-out
    this.setMaxListeners(50);
  }

  /**
   * Emit with logging in development.
   * @param {string} event
   * @param  {...any} args
   */
  emit(event, ...args) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[EventBus] ${event}`, args[0] || '');
    }
    return super.emit(event, ...args);
  }
}

// Singleton
const eventBus = new HackETEventBus();

module.exports = eventBus;
