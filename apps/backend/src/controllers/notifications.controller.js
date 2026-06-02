// =============================================================================
// HackET — Notifications Controller
// =============================================================================

const notificationService = require('../services/notifications/notification.service');
const catchAsync = require('../utils/catchAsync');

exports.getNotifications = catchAsync(async (req, res) => {
  const { page, limit, unreadOnly } = req.query;

  const result = await notificationService.getForUser(req.user.id, {
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 20,
    unreadOnly: unreadOnly === 'true',
  });

  res.status(200).json({
    success: true,
    data: { notifications: result.data },
    unreadCount: result.unreadCount,
    pagination: result.pagination,
  });
});

exports.getPreferences = catchAsync(async (req, res) => {
  const preferences = await notificationService.getPreferences(req.user.id);

  res.status(200).json({
    success: true,
    data: { preferences },
  });
});

exports.updatePreferences = catchAsync(async (req, res) => {
  const preferences = await notificationService.updatePreferences(req.user.id, req.body);

  res.status(200).json({
    success: true,
    message: 'Notification preferences updated.',
    data: { preferences },
  });
});

exports.markAsRead = catchAsync(async (req, res) => {
  await notificationService.markAsRead(req.params.id, req.user.id);

  res.status(200).json({
    success: true,
    message: 'Notification marked as read.',
  });
});

exports.markAllAsRead = catchAsync(async (req, res) => {
  await notificationService.markAllAsRead(req.user.id);

  res.status(200).json({
    success: true,
    message: 'All notifications marked as read.',
  });
});

exports.createBroadcast = catchAsync(async (req, res) => {
  const { title, message, type } = req.body;
  const { eventId } = req.params;
  
  const broadcast = await notificationService.createBroadcast({
    hackathonId: eventId,
    title,
    message,
    type: type || 'ANNOUNCEMENT',
    sentBy: req.user.id
  });

  res.status(201).json({
    success: true,
    message: 'Broadcast announcement queued successfully.',
    data: { broadcast }
  });
});

exports.listBroadcasts = catchAsync(async (req, res) => {
  const result = await notificationService.listBroadcasts(req.params.eventId, req.query);

  res.status(200).json({
    success: true,
    data: { broadcasts: result.data },
    pagination: result.pagination,
  });
});

exports.cancelBroadcast = catchAsync(async (req, res) => {
  const broadcast = await notificationService.cancelBroadcast({
    broadcastId: req.params.broadcastId,
    actor: req.user,
    reason: req.body.reason,
  });

  res.status(200).json({
    success: true,
    message: 'Broadcast cancelled.',
    data: { broadcast },
  });
});
