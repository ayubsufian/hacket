// =============================================================================
// HackET — Archiving Service
// Serializes Hackathon metadata and text-only discussion data for cold storage.
// =============================================================================

const fs = require('fs/promises');
const path = require('path');
const prisma = require('../../config/database');
const AppError = require('../../utils/AppError');
const eventBus = require('../../utils/eventBus');

class ArchivingService {
  constructor() {
    this.archiveDir = path.join(__dirname, '../../../../uploads/archives');
  }

  /**
   * Main Entry: Archive a Hackathon
   */
  async archiveHackathon(hackathonId, adminId) {
    const hackathon = await prisma.hackathon.findUnique({
      where: { id: hackathonId },
      include: {
        discussions: {
          select: {
            id: true,
            title: true,
            body: true,
            createdAt: true,
            author: { select: { email: true } },
            comments: {
              select: {
                body: true,
                createdAt: true,
                author: { select: { email: true } },
              },
            },
          },
        },
      },
    });

    if (!hackathon) throw new AppError('Hackathon not found.', 404);
    if (hackathon.status === 'ARCHIVED') throw new AppError('Hackathon is already archived.', 400);

    // Ensure directory exists
    await fs.mkdir(this.archiveDir, { recursive: true });

    const archivePayload = {
      id: hackathon.id,
      title: hackathon.title,
      description: hackathon.description,
      status: hackathon.status,
      eventStart: hackathon.eventStart,
      eventEnd: hackathon.eventEnd,
      discussions: hackathon.discussions,
      archivedAt: new Date().toISOString(),
    };

    const filePath = path.join(this.archiveDir, `hackathon_${hackathonId}.json`);

    // AF1: Write to disk with retry
    await this._writeToFileWithRetry(archivePayload, filePath, 0, adminId);

    // Update main database
    await prisma.hackathon.update({
      where: { id: hackathonId },
      data: { status: 'ARCHIVED' },
    });

    return filePath;
  }

  /**
   * AF1: Partial Archiving Failure Retry Loop
   */
  async _writeToFileWithRetry(data, filePath, retryCount, adminId) {
    try {
      // Simulate random IO failure for demonstration
      if (Math.random() < 0.2) {
        throw new Error('EAGAIN: Resource temporarily unavailable');
      }

      await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.warn(`[Archiving] Failed to write block to ${filePath}. Reason: ${err.message}`);

      if (retryCount < 3) {
        const backoffTime = Math.pow(2, retryCount) * 1000;
        console.log(`[Archiving] Retrying write in ${backoffTime}ms (Attempt ${retryCount + 1})...`);
        
        await new Promise((resolve) => setTimeout(resolve, backoffTime));
        return this._writeToFileWithRetry(data, filePath, retryCount + 1, adminId);
      } else {
        // AF1: System notifies the Administrator of the partial success/failure.
        eventBus.emit('audit:log', {
          actorId: adminId,
          action: 'ARCHIVE_FAILURE',
          entity: 'hackathon',
          details: { filePath, error: err.message, retryCount }
        });

        throw new AppError('Storage write failure. Archival process aborted.', 500);
      }
    }
  }
}

module.exports = new ArchivingService();
