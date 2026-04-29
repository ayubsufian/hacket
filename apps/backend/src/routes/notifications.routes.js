// =============================================================================
// HackET — Notifications Routes
// GET   /api/v1/notifications              — Get user notifications
// PATCH /api/v1/notifications/:id/read     — Mark as read
// PATCH /api/v1/notifications/read-all     — Mark all as read
// =============================================================================

const { Router } = require('express');
const notificationsController = require('../controllers/notifications.controller');
const authenticate = require('../middleware/auth');

const router = Router();

router.use(authenticate);

router.get('/', notificationsController.getNotifications);
router.patch('/:id/read', notificationsController.markAsRead);
router.patch('/read-all', notificationsController.markAllAsRead);

module.exports = router;
