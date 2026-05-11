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

  res.status(201).json({
    success: true,
    message: 'Staff invitation generated and dispatched.',
    data: { token },
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
  });

  eventBus.emit('audit:log', {
    actorId: req.user.id,
    action: 'STAFF_UPDATED',
    entity: 'staffAssignment',
    entityId: id,
    details: { staffRole, isActive },
  });

  res.status(200).json({
    success: true,
    message: 'Staff permissions updated.',
    data: { assignment: updated },
  });
});
