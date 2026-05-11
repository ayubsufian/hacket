// =============================================================================
// HackET — Organization Service
// =============================================================================

const prisma = require('../../config/database');
const AppError = require('../../utils/AppError');
const eventBus = require('../../utils/eventBus');

class OrganizationService {
  /**
   * Get the organization profile for the current user.
   */
  async getOrganizationProfile(userId) {
    const membership = await prisma.organizationMember.findFirst({
      where: { userId },
      include: {
        organization: true,
      },
    });

    if (!membership || !membership.organization) {
      throw new AppError('You do not belong to an organization.', 404);
    }

    return membership.organization;
  }

  /**
   * Update the organization profile details.
   */
  async updateOrganizationProfile(userId, updateData) {
    // Check membership and role
    const membership = await prisma.organizationMember.findFirst({
      where: { userId },
      include: {
        organization: true,
      },
    });

    if (!membership || !membership.organization) {
      throw new AppError('You do not belong to an organization.', 404);
    }

    if (membership.role !== 'ADMIN') {
      throw new AppError('You must be an organization ADMIN to update the host profile.', 403);
    }

    const updatedOrganization = await prisma.organization.update({
      where: { id: membership.organizationId },
      data: updateData,
    });

    eventBus.emit('audit:log', {
      actorId: userId,
      action: 'UPDATE',
      entity: 'organization',
      entityId: membership.organizationId,
    });

    return updatedOrganization;
  }
}

module.exports = new OrganizationService();
