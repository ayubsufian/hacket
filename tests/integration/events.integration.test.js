// File: tests/integration/events.integration.test.js
const request = require('supertest');
const app = require('../../apps/backend/src/server');
const prisma = require('../../apps/backend/src/config/database');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = process.env;

describe('Events API Integration', () => {
  const api = request(app);
  let organizerToken;

  beforeAll(async () => {
    // Create test organizer user
    const user = await prisma.user.create({
      data: {
        email: 'organizer@example.com',
        password: 'Organizer123!',
        firstName: 'Org',
        lastName: 'Tester',
        role: 'ORGANIZER'
      }
    });
    organizerToken = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET);
  });

  afterAll(async () => {
    // Cleanup: delete events and user
    await prisma.event.deleteMany({ where: { ownerId: organizerToken.userId } });
    await prisma.user.deleteMany({ where: { email: 'organizer@example.com' } });
    await prisma.$disconnect();
  });

  test('POST /api/v1/events - create event', async () => {
    const newEvent = {
      title: 'Test Hackathon',
      startDate: '2026-07-01',
      endDate: '2026-07-03',
      location: 'Addis Ababa',
      description: 'Test event creation'
    };
    const res = await api
      .post('/api/v1/events')
      .set('Authorization', `Bearer ${organizerToken}`)
      .send(newEvent);
    expect(res.statusCode).toBe(201);
    expect(res.body).toMatchObject({
      title: newEvent.title,
      location: 'Addis Ababa'
    });
    expect(res.body.id).toBeDefined();
  });

  test('GET /api/v1/events - list events including created one', async () => {
    const res = await api.get('/api/v1/events');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    const created = res.body.data.find(e => e.title === 'Test Hackathon');
    expect(created).toBeDefined();
  });

  test('PUT /api/v1/events/:id - update event by owner', async () => {
    // Find the event we created
    const event = await prisma.event.findUnique({ where: { title: 'Test Hackathon' } });
    const res = await api
      .put(`/api/v1/events/${event.id}`)
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({ location: 'Online' });
    expect(res.statusCode).toBe(200);
    expect(res.body.location).toBe('Online');
  });
});
