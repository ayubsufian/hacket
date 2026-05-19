// =============================================================================
// HackET — Staff Management Controller
// =============================================================================

const crypto = require('crypto');
const prisma = require('../config/database');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const eventBus = require('../utils/eventBus');

// ─── Main Flow: Invite Staff ──────────────────────────────────────────────

exports.inviteStaff = catchAsync(async (req, res) => {
  const { eventId } = req.params;
  const { email, staffRole, message } = req.body;

  if (!email || !staffRole) {
    throw new AppError('Email and StaffRole are required.', 400);
  }

  // Security Check: authorizeEventStaff middleware already verified they are the Lead Organizer or a CO_ORGANIZER
  const hackathon = await prisma.hackathon.findUnique({
    where: { id: eventId },
    select: { title: true }
  });

  if (!hackathon) {
    throw new AppError('Hackathon not found.', 404);
  }

  // Generate secure token
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // Token valid for 7 days

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

  // Audit Log
  eventBus.emit('audit:log', {
    actorId: req.user.id,
    action: 'STAFF_INVITED',
    entity: 'staffInvitation',
    entityId: invitation.id,
    details: { eventId, email, staffRole },
  });

  // Dispatch Email Delivery Event
  eventBus.emit('email:staff_invitation', {
    email,
    token,
    staffRole,
    hackathonTitle: hackathon.title,
  });

  res.status(201).json({
    success: true,
    message: 'Staff invitation generated and dispatched.',
    data: { token },
  });
});

exports.acceptInvitation = catchAsync(async (req, res) => {
  const { eventId } = req.params;
  const { token } = req.body;

  if (!token) {
    throw new AppError('Invitation token is required.', 400);
  }

  // 1. Verify invitation token
  const invitation = await prisma.staffInvitation.findFirst({
    where: { hackathonId: eventId, token, expiresAt: { gt: new Date() } }
  });

  if (!invitation) {
    throw new AppError('Invalid or expired invitation token.', 400);
  }

  // 2. Ensure user email matches invitation email (Security Check)
  if (req.user.email !== invitation.email) {
    throw new AppError('This invitation belongs to a different email address.', 403);
  }

  // 3. Security & Conflict of Interest Check (2026 Standard)
  // Ensure the user isn't already competing as a participant in this hackathon.
  const isCompeting = await prisma.teamMember.findFirst({
    where: {
      userId: req.user.id,
      team: { hackathonId: eventId }
    }
  });

  if (isCompeting) {
    throw new AppError('Conflict of Interest: You cannot accept a staff position for a hackathon you are already competing in.', 409);
  }

  // 3. Check for existing assignment to prevent Unique Constraint violations (Idempotency)
  const existingAssignment = await prisma.staffAssignment.findUnique({
    where: {
      userId_hackathonId_staffRole: {
        userId: req.user.id,
        hackathonId: eventId,
        staffRole: invitation.staffRole
      }
    }
  });

  // 4. Create the StaffAssignment and delete the invitation
  await prisma.$transaction(async (tx) => {
    if (!existingAssignment) {
      await tx.staffAssignment.create({
        data: {
          userId: req.user.id,
          hackathonId: eventId,
          staffRole: invitation.staffRole,
        }
      });
    }

    await tx.staffInvitation.delete({
      where: { id: invitation.id }
    });
    
    // 2026 UX Standard: If they proved they own the email by clicking the secure 
    // invitation link sent to their inbox, automatically verify their account!
    if (req.user.verificationStatus === 'UNVERIFIED') {
      await tx.user.update({
        where: { id: req.user.id },
        data: { verificationStatus: 'VERIFIED' }
      });
    }
  });

  // 4. Audit Log
  eventBus.emit('audit:log', {
    actorId: req.user.id,
    action: 'STAFF_INVITATION_ACCEPTED',
    entity: 'staffAssignment',
    entityId: req.user.id,
    details: { eventId, staffRole: invitation.staffRole }
  });

  res.status(200).json({
    success: true,
    message: `You have successfully joined the hackathon as a ${invitation.staffRole}.`,
  });
});

// ─── AF1 & AF2: Update or Revoke Staff Assignment ─────────────────────────

exports.updateStaff = catchAsync(async (req, res) => {
  const { id } = req.params; // StaffAssignment ID
  const { staffRole, isActive } = req.body;

  // Find assignment
  const assignment = await prisma.staffAssignment.findUnique({
    where: { id },
  });

  if (!assignment) {
    throw new AppError('Staff assignment not found.', 404);
  }

  // 2026 Security: Check if user is Primary Organizer or CO_ORGANIZER for this hackathon
  if (req.user.role !== 'ADMIN') {
    const hackathon = await prisma.hackathon.findUnique({ where: { id: assignment.hackathonId } });
    if (hackathon.organizerId !== req.user.id) {
      const isCoOrganizer = await prisma.staffAssignment.findFirst({
        where: { userId: req.user.id, hackathonId: assignment.hackathonId, staffRole: 'CO_ORGANIZER', isActive: true }
      });
      if (!isCoOrganizer) {
        throw new AppError('You do not have permission to modify staff assignments.', 403);
      }
    }
  }

  // AF2: Self-Modification Safeguard
  if (assignment.userId === req.user.id && assignment.isLead) {
    throw new AppError('Cannot modify your own lead role. Assign another Lead first.', 403);
  }

  // Update
  const updated = await prisma.staffAssignment.update({
    where: { id },
    data: {
      ...(staffRole && { staffRole }),
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
    details: { staffRole, isActive },
  });

  // 2026 Standard: Notify the affected staff member of role/access changes
  const notificationService = require('../services/notifications/notification.service');

  if (staffRole && staffRole !== assignment.staffRole) {
    // Role was changed
    const title = `Your role has been updated`;
    const message = `Your staff role for "${updated.hackathon.title}" has been changed from ${assignment.staffRole} to ${staffRole}.`;

    await notificationService.create({
      userId: assignment.userId,
      type: 'SYSTEM_ALERT',
      title,
      message,
      metadata: { hackathonId: assignment.hackathonId, oldRole: assignment.staffRole, newRole: staffRole }
    });

    // Send email notification
    eventBus.emit('email:staff_role_changed', {
      email: updated.user.email,
      firstName: updated.user.profile?.firstName,
      hackathonTitle: updated.hackathon.title,
      oldRole: assignment.staffRole,
      newRole: staffRole
    });
  }

  if (typeof isActive === 'boolean' && !isActive) {
    // Access was revoked
    const title = `Your staff access has been revoked`;
    const message = `Your ${assignment.staffRole} access for "${updated.hackathon.title}" has been revoked by the organizer.`;

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
