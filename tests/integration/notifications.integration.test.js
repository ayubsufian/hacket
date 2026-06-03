// File: tests/integration/notifications.integration.test.js
const request = require('supertest');
const app = require('../../apps/backend/src/server');
const prisma = require('../../apps/backend/src/config/database');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = process.env;

describe('Notifications API Integration', () => {
  const api = request(app);
  let userToken, userId;

  beforeAll(async () => {
    // Create user
    const user = await prisma.user.create({ data: { email: 'notify@example.com', password: 'Notif123!', firstName: 'Notify', lastName: 'User', role: 'PARTICIPANT' } });
    userId = user.id;
    userToken = jwt.sign({ userId, role: user.role }, JWT_SECRET);
    // Create a sample notification in DB
    await prisma.notification.create({ data: { userId, message: 'Test Notification', type: 'SYSTEM_ALERT' } });
  });

  afterAll(async () => {
    await prisma.notification.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
  });

  test('GET /api/v1/notifications - list notifications', async () => {
    const res = await api.get('/api/v1/notifications').set('Authorization', `Bearer ${userToken}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.some(n => n.message === 'Test Notification')).toBe(true);
  });

  test('PUT /api/v1/notifications/mark-read/:id - mark as read', async () => {
    const notification = await prisma.notification.findFirst({ where: { userId, message: 'Test Notification' } });
    const res = await api
      .put(`/api/v1/notifications/mark-read/${notification.id}`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.read).toBe(true);
  });

  test('PUT /api/v1/notification-preferences - update preferences', async () => {
    const prefs = { email: false, sms: false };
    const res = await api
      .put('/api/v1/notification-preferences')
      .set('Authorization', `Bearer ${userToken}`)
      .send(prefs);
    expect(res.statusCode).toBe(200);
    expect(res.body.email).toBe(false);
    expect(res.body.sms).toBe(false);
  });
});
