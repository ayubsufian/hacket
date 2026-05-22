// =============================================================================
// HackET — Staff Management Controller
// =============================================================================

const crypto = require('crypto');
const prisma = require('../config/database');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const eventBus = require('../utils/eventBus');

// ─── Internal Authorization Helper ────────────────────────────────────────

async function checkDelegatedPermission(userId, eventId, targetRole = null) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user.role === 'ADMIN') return true;

  const hackathon = await prisma.hackathon.findUnique({ where: { id: eventId } });
  if (hackathon.organizerId === userId) return true;

  const assignments = await prisma.staffAssignment.findMany({
    where: { userId, hackathonId: eventId, isActive: true }
  });

  if (assignments.some(a => a.staffRole === 'CO_ORGANIZER')) return true;

  if (targetRole) {
    if (assignments.some(a => a.staffRole === targetRole && a.isLead)) return true;
  }
  return false;
}

// ─── Internal Config Helper ────────────────────────────────────────

async function getRoleConfig(hackathonId, staffRole) {
  const hackathon = await prisma.hackathon.findUnique({
    where: { id: hackathonId },
    select: { defaultMinLeads: true, defaultMaxLeads: true }
  });
  const config = await prisma.staffRoleConfig.findUnique({
    where: { hackathonId_staffRole: { hackathonId, staffRole } }
  });
  return {
    minLeads: config?.minLeads ?? hackathon.defaultMinLeads,
    maxLeads: config?.maxLeads ?? hackathon.defaultMaxLeads
  };
}

// ─── 1. Missing Endpoints ─────────────────────────────────────────────────

exports.getStaffRoster = catchAsync(async (req, res) => {
  const { eventId } = req.params;
  const { staffRole, isActive, search, page = 1, limit = 20, sort = 'createdAt', order = 'desc' } = req.query;

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  const where = { hackathonId: eventId };
  if (staffRole) where.staffRole = staffRole;
  if (isActive !== undefined) where.isActive = isActive === 'true';

  if (search) {
    where.user = {
      OR: [
        { email: { contains: search, mode: 'insensitive' } },
        { profile: { firstName: { contains: search, mode: 'insensitive' } } },
        { profile: { lastName: { contains: search, mode: 'insensitive' } } }
      ]
    };
  }

  const [total, roster] = await Promise.all([
    prisma.staffAssignment.count({ where }),
    prisma.staffAssignment.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: { [sort]: order === 'asc' ? 'asc' : 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true, // TODO: Role-based visibility filtering could hide this in the response layer
            profile: { select: { firstName: true, lastName: true, avatarUrl: true } }
          }
        }
      }
    })
  ]);

  // Role-Based Visibility (hide emails if viewer is not an organizer or admin)
  let isOrganizer = req.user.role === 'ADMIN';
  if (!isOrganizer) {
    const viewerAssignment = await prisma.staffAssignment.findFirst({
      where: { userId: req.user.id, hackathonId: eventId, staffRole: 'CO_ORGANIZER', isActive: true }
    });
    if (viewerAssignment) isOrganizer = true;
    else {
       const hackathon = await prisma.hackathon.findUnique({ where: { id: eventId }, select: { organizerId: true } });
       if (hackathon?.organizerId === req.user.id) isOrganizer = true;
    }
  }

  const processedRoster = roster.map(assignment => {
    if (!isOrganizer && assignment.userId !== req.user.id) {
      assignment.user.email = undefined; // Hide email from non-organizers
    }
    return assignment;
  });

  res.status(200).json({
    success: true,
    data: processedRoster,
    pagination: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) }
  });
});

exports.getStaffDetail = catchAsync(async (req, res) => {
  const { eventId, id } = req.params;

  const assignment = await prisma.staffAssignment.findFirst({
    where: { id, hackathonId: eventId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          profile: true
        }
      }
    }
  });

  if (!assignment) {
    throw new AppError('Staff assignment not found.', 404);
  }

  res.status(200).json({ success: true, data: assignment });
});

exports.getInvitations = catchAsync(async (req, res) => {
  const { eventId } = req.params;
  const { status, page = 1, limit = 20, sort = 'createdAt', order = 'desc' } = req.query;

  // Verify the user is at least a Lead in SOME role, or a co-organizer
  // For safety, we only return invitations for the roles they are a Lead for, UNLESS they are a CO_ORGANIZER.
  const isSuperAdmin = await checkDelegatedPermission(req.user.id, eventId);
  const assignments = await prisma.staffAssignment.findMany({ where: { userId: req.user.id, hackathonId: eventId, isActive: true, isLead: true } });
  const leadRoles = assignments.map(a => a.staffRole);

  if (!isSuperAdmin && leadRoles.length === 0) {
    throw new AppError('Forbidden. You do not have permission to view invitations.', 403);
  }

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  const where = { hackathonId: eventId };
  if (status) where.status = status;
  if (!isSuperAdmin) where.staffRole = { in: leadRoles };

  const [total, invitations] = await Promise.all([
    prisma.staffInvitation.count({ where }),
    prisma.staffInvitation.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: { [sort]: order === 'asc' ? 'asc' : 'desc' }
    })
  ]);

  res.status(200).json({
    success: true,
    data: invitations,
    pagination: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) }
  });
});

exports.resendInvitation = catchAsync(async (req, res) => {
  const { eventId, invitationId } = req.params;

  const invitation = await prisma.staffInvitation.findFirst({
    where: { id: invitationId, hackathonId: eventId }
  });

  if (!invitation) throw new AppError('Invitation not found.', 404);

  const isAuthorized = await checkDelegatedPermission(req.user.id, eventId, invitation.staffRole);
  if (!isAuthorized) throw new AppError('Forbidden. You do not have permission to manage this invitation.', 403);

  if (invitation.status !== 'PENDING') {
    throw new AppError(`Cannot resend an invitation that is ${invitation.status}.`, 400);
  }

  const hackathon = await prisma.hackathon.findUnique({ where: { id: eventId }, select: { title: true } });

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await prisma.staffInvitation.update({
    where: { id: invitationId },
    data: { token, expiresAt }
  });

  eventBus.emit('audit:log', {
    actorId: req.user.id,
    action: 'STAFF_INVITATION_RESENT',
    entity: 'staffInvitation',
    entityId: invitation.id,
    details: { eventId, email: invitation.email, staffRole: invitation.staffRole }
  });

  eventBus.emit('email:staff_invitation_resend', {
    email: invitation.email,
    token,
    staffRole: invitation.staffRole,
    hackathonTitle: hackathon.title,
  });

  res.status(200).json({ success: true, message: 'Invitation resent successfully.' });
});

exports.cancelInvitation = catchAsync(async (req, res) => {
  const { eventId, invitationId } = req.params;

  const invitation = await prisma.staffInvitation.findFirst({
    where: { id: invitationId, hackathonId: eventId }
  });

  if (!invitation) throw new AppError('Invitation not found.', 404);

  const isAuthorized = await checkDelegatedPermission(req.user.id, eventId, invitation.staffRole);
  if (!isAuthorized) throw new AppError('Forbidden. You do not have permission to manage this invitation.', 403);

  if (invitation.status !== 'PENDING') {
    throw new AppError(`Cannot cancel an invitation that is ${invitation.status}.`, 400);
  }

  const hackathon = await prisma.hackathon.findUnique({ where: { id: eventId }, select: { title: true } });

  await prisma.staffInvitation.update({
    where: { id: invitationId },
    data: { status: 'EXPIRED' }
  });

  eventBus.emit('audit:log', {
    actorId: req.user.id,
    action: 'STAFF_INVITATION_CANCELLED',
    entity: 'staffInvitation',
    entityId: invitation.id,
    details: { eventId, email: invitation.email }
  });

  eventBus.emit('email:staff_invitation_cancelled', {
    email: invitation.email,
    hackathonTitle: hackathon.title,
    staffRole: invitation.staffRole
  });

  res.status(200).json({ success: true, message: 'Invitation cancelled successfully.' });
});

exports.leaveStaff = catchAsync(async (req, res) => {
  const { eventId } = req.params;
  const { staffRole } = req.body; // In case they have multiple roles and want to leave a specific one, but if not provided we leave all

  const assignments = await prisma.staffAssignment.findMany({
    where: { 
      userId: req.user.id, 
      hackathonId: eventId, 
      isActive: true,
      ...(staffRole && { staffRole })
    }
  });

  if (assignments.length === 0) throw new AppError('Active staff assignment not found.', 404);

  // Check minLeads logic for each role they are a lead in
  for (const assignment of assignments) {
    if (assignment.isLead) {
      const { minLeads } = await getRoleConfig(eventId, assignment.staffRole);
      const activeLeadsCount = await prisma.staffAssignment.count({
        where: { hackathonId: eventId, staffRole: assignment.staffRole, isLead: true, isActive: true }
      });

      if (activeLeadsCount - 1 < minLeads) {
        throw new AppError(`Cannot leave. This would drop the number of leads for ${assignment.staffRole} below the required minimum of ${minLeads}. Appoint a successor first.`, 403);
      }
    }
  }

  await prisma.staffAssignment.updateMany({
    where: { id: { in: assignments.map(a => a.id) } },
    data: { isActive: false, revokedAt: new Date(), revokedBy: req.user.id }
  });

  assignments.forEach(assignment => {
    eventBus.emit('audit:log', {
      actorId: req.user.id,
      action: 'STAFF_LEFT',
      entity: 'staffAssignment',
      entityId: assignment.id,
      details: { eventId, staffRole: assignment.staffRole }
    });
  });

  res.status(200).json({ success: true, message: 'You have successfully left the staff roster.' });
});

exports.getMyAssignments = catchAsync(async (req, res) => {
  const { isActive, page = 1, limit = 20, sort = 'createdAt', order = 'desc' } = req.query;

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  const where = { userId: req.user.id };
  if (isActive !== undefined) where.isActive = isActive === 'true';

  const [total, assignments] = await Promise.all([
    prisma.staffAssignment.count({ where }),
    prisma.staffAssignment.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: { [sort]: order === 'asc' ? 'asc' : 'desc' },
      include: { hackathon: { select: { id: true, title: true, status: true } } }
    })
  ]);

  res.status(200).json({
    success: true,
    data: assignments,
    pagination: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) }
  });
});

// ─── 2. Main Flow: Invite Staff ──────────────────────────────────────────────

exports.inviteStaff = catchAsync(async (req, res) => {
  const { eventId } = req.params;
  const { email, staffRole, message } = req.body;

  if (!email || !staffRole) throw new AppError('Email and StaffRole are required.', 400);

  const hackathon = await prisma.hackathon.findUnique({
    where: { id: eventId },
    select: { title: true }
  });

  if (!hackathon) throw new AppError('Hackathon not found.', 404);

  // Check for Duplicate
  const targetUser = await prisma.user.findUnique({ where: { email } });
  if (targetUser) {
      const existingAssignment = await prisma.staffAssignment.findFirst({
          where: { userId: targetUser.id, hackathonId: eventId, staffRole, isActive: true }
      });
      if (existingAssignment) throw new AppError('User already has an active assignment for this role.', 409);
  }

  const existingInvitation = await prisma.staffInvitation.findFirst({
      where: { hackathonId: eventId, email, staffRole, status: 'PENDING', expiresAt: { gt: new Date() } }
  });
  if (existingInvitation) throw new AppError('A pending invitation already exists for this role and email.', 409);

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const invitation = await prisma.staffInvitation.create({
    data: {
      hackathonId: eventId,
      email,
      staffRole,
      token,
      message,
      invitedBy: req.user.id,
      expiresAt,
    },
  });

  eventBus.emit('audit:log', {
    actorId: req.user.id,
    action: 'STAFF_INVITED',
    entity: 'staffInvitation',
    entityId: invitation.id,
    details: { eventId, email, staffRole },
  });

  eventBus.emit('email:staff_invitation', {
    email,
    token,
    staffRole,
    hackathonTitle: hackathon.title,
  });

  const responseData = {};
  if (req.query.debug === 'true') responseData.token = token;

  res.status(201).json({
    success: true,
    message: 'Staff invitation generated and dispatched.',
    data: responseData,
  });
});

exports.acceptInvitationGlobal = catchAsync(async (req, res) => {
  const { token } = req.body;

  if (!token) throw new AppError('Invitation token is required.', 400);

  const invitation = await prisma.staffInvitation.findUnique({
    where: { token }
  });

  if (!invitation || invitation.expiresAt <= new Date() || invitation.status !== 'PENDING') {
    throw new AppError('Invalid, expired, or already accepted invitation token.', 400);
  }

  const accountExists = !!(await prisma.user.findUnique({ where: { email: invitation.email } }));

  if (!req.user) {
      return res.status(200).json({
          success: true,
          status: 'valid',
          email: invitation.email,
          hackathonId: invitation.hackathonId,
          staffRole: invitation.staffRole,
          accountExists
      });
  }

  if (req.user.email !== invitation.email) {
    throw new AppError('This invitation belongs to a different email address. Please log in with the correct account.', 403);
  }

  const isCompeting = await prisma.teamMember.findFirst({
    where: {
      userId: req.user.id,
      team: { hackathonId: invitation.hackathonId }
    }
  });

  if (isCompeting) {
    throw new AppError('Conflict of Interest: You cannot accept a staff position for a hackathon you are already competing in. Please withdraw from your team first.', 409);
  }

  const existingAssignment = await prisma.staffAssignment.findUnique({
    where: {
      userId_hackathonId_staffRole: {
        userId: req.user.id,
        hackathonId: invitation.hackathonId,
        staffRole: invitation.staffRole
      }
    }
  });

  await prisma.$transaction(async (tx) => {
    if (!existingAssignment) {
      await tx.staffAssignment.create({
        data: {
          userId: req.user.id,
          hackathonId: invitation.hackathonId,
          staffRole: invitation.staffRole,
        }
      });
    } else if (!existingAssignment.isActive) {
      await tx.staffAssignment.update({
          where: { id: existingAssignment.id },
          data: { isActive: true, revokedAt: null, revokedBy: null }
      });
    }

    await tx.staffInvitation.update({
      where: { id: invitation.id },
      data: { status: 'ACCEPTED', acceptedAt: new Date(), acceptedBy: req.user.id }
    });
    
    if (req.user.verificationStatus === 'UNVERIFIED') {
      await tx.user.update({
        where: { id: req.user.id },
        data: { verificationStatus: 'VERIFIED' }
      });
      eventBus.emit('email:account_verified', { userId: req.user.id, email: req.user.email });
    }
  });

  eventBus.emit('audit:log', {
    actorId: req.user.id,
    action: 'STAFF_INVITATION_ACCEPTED',
    entity: 'staffAssignment',
    entityId: req.user.id,
    details: { eventId: invitation.hackathonId, staffRole: invitation.staffRole }
  });

  res.status(200).json({
    success: true,
    message: `You have successfully joined the hackathon as a ${invitation.staffRole}.`,
  });
});

// ─── 3. Modify/Revoke Staff Assignment ─────────────────────────

exports.updateStaff = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { staffRole, isActive, isLead } = req.body;

  const assignment = await prisma.staffAssignment.findUnique({
    where: { id },
    include: { hackathon: true }
  });

  if (!assignment) throw new AppError('Staff assignment not found.', 404);

  const isSelf = assignment.userId === req.user.id;
  const isAuthorized = await checkDelegatedPermission(req.user.id, assignment.hackathonId, assignment.staffRole);
  const isPrimaryOrganizer = assignment.hackathon.organizerId === req.user.id;

  // Modifying someone else (or upgrading oneself)
  if (!isSelf && !isAuthorized) {
    throw new AppError('You do not have permission to modify staff assignments.', 403);
  }

  const { minLeads, maxLeads } = await getRoleConfig(assignment.hackathonId, assignment.staffRole);

  const activeLeadsCount = await prisma.staffAssignment.count({
    where: { hackathonId: assignment.hackathonId, staffRole: assignment.staffRole, isLead: true, isActive: true }
  });

  const totalMembersCount = await prisma.staffAssignment.count({
    where: { hackathonId: assignment.hackathonId, staffRole: assignment.staffRole, isActive: true }
  });

  // Self-Leave check
  if (typeof isActive === 'boolean' && !isActive) {
      if (assignment.isLead) {
          if (activeLeadsCount - 1 < minLeads && !isPrimaryOrganizer) {
              throw new AppError(`Cannot deactivate. This would drop the number of leads below the required minimum of ${minLeads}. Appoint a successor first.`, 403);
          }
      }
  }

  // Modifying isLead
  if (isLead !== undefined && isLead !== assignment.isLead) {
      if (!isAuthorized) {
          throw new AppError('Only the primary organizer or an existing lead can grant/revoke isLead.', 403);
      }
      
      if (isLead === true) {
         if (activeLeadsCount + 1 > maxLeads) {
            throw new AppError(`Cannot grant Lead status. Maximum leads (${maxLeads}) reached for this role.`, 403);
         }
         if (activeLeadsCount + 1 > totalMembersCount) {
            throw new AppError(`Cannot grant Lead status. Leads cannot exceed total active members in this role.`, 403);
         }
      } else if (isLead === false) {
         if (activeLeadsCount - 1 < minLeads && !isPrimaryOrganizer) {
            throw new AppError(`Cannot remove Lead status. This would drop the number of leads below the required minimum of ${minLeads}.`, 403);
         }
      }
  }

  const updated = await prisma.staffAssignment.update({
    where: { id },
    data: {
      ...(staffRole && { staffRole }),
      ...(isLead !== undefined && { isLead }),
      ...(typeof isActive === 'boolean' && { 
        isActive,
        revokedAt: isActive ? null : new Date(),
        revokedBy: isActive ? null : req.user.id
      }),
    },
    include: {
      user: { select: { email: true, profile: { select: { firstName: true } } } },
      hackathon: { select: { title: true } }
    }
  });

  eventBus.emit('audit:log', {
    actorId: req.user.id,
    action: 'STAFF_UPDATED',
    entity: 'staffAssignment',
    entityId: id,
    details: { staffRole, isActive, isLead },
  });

  if (isLead !== undefined && isLead !== assignment.isLead) {
      eventBus.emit('audit:log', {
        actorId: req.user.id,
        action: 'STAFF_LEAD_CHANGED',
        entity: 'staffAssignment',
        entityId: id,
        details: { isLead, staffRole: assignment.staffRole }
      });
  }

  const notificationService = require('../services/notifications/notification.service');

  if (staffRole && staffRole !== assignment.staffRole) {
    const title = `Your role has been updated`;
    const message = `Your staff role for "${updated.hackathon.title}" has been changed from ${assignment.staffRole} to ${staffRole}.`;

    await notificationService.create({
      userId: assignment.userId,
      type: 'SYSTEM_ALERT',
      title,
      message,
      metadata: { hackathonId: assignment.hackathonId, oldRole: assignment.staffRole, newRole: staffRole }
    });

    eventBus.emit('email:staff_role_changed', {
      email: updated.user.email,
      firstName: updated.user.profile?.firstName,
      hackathonTitle: updated.hackathon.title,
      oldRole: assignment.staffRole,
      newRole: staffRole
    });
  }

  if (typeof isActive === 'boolean' && !isActive) {
    const title = `Your staff access has been revoked`;
    const message = `Your ${assignment.staffRole} access for "${updated.hackathon.title}" has been revoked.`;

    await notificationService.create({
      userId: assignment.userId,
      type: 'SYSTEM_ALERT',
      title,
      message,
      metadata: { hackathonId: assignment.hackathonId, revokedRole: assignment.staffRole }
    });

    eventBus.emit('email:staff_access_revoked', {
      email: updated.user.email,
      firstName: updated.user.profile?.firstName,
      hackathonTitle: updated.hackathon.title,
      role: assignment.staffRole
    });
  }

  res.status(200).json({
    success: true,
    message: 'Staff permissions updated.',
    data: { assignment: updated },
  });
});
