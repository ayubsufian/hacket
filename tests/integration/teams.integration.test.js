// File: tests/integration/teams.integration.test.js
const request = require('supertest');
const app = require('../../apps/backend/src/server');
const prisma = require('../../apps/backend/src/config/database');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = process.env;

describe('Teams API Integration', () => {
  const api = request(app);
  let participantToken, eventId;

  beforeAll(async () => {
    // Create test participant user and event
    const user = await prisma.user.create({
      data: { email: 'participant@example.com', password: 'Part123!', firstName: 'Part', lastName: 'Tester', role: 'PARTICIPANT' }
    });
    participantToken = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET);

    const event = await prisma.event.create({
      data: {
        title: 'Team Test Event',
        startDate: new Date(),
        endDate: new Date(),
        ownerId: null // public event
      }
    });
    eventId = event.id;
  });

  afterAll(async () => {
    await prisma.team.deleteMany({ where: { eventId } });
    await prisma.event.deleteMany({ where: { id: eventId } });
    await prisma.user.deleteMany({ where: { email: 'participant@example.com' } });
    await prisma.$disconnect();
  });

  test('POST /api/v1/teams - create new team for event', async () => {
    const res = await api
      .post(`/api/v1/events/${eventId}/teams`)
      .set('Authorization', `Bearer ${participantToken}`)
      .send({ name: 'Testers Team' });
    expect(res.statusCode).toBe(201);
    expect(res.body.name).toBe('Testers Team');
    expect(res.body.eventId).toBe(eventId);
  });

  test('POST /api/v1/teams/:id/join - join an existing team', async () => {
    // Find the team
    const team = await prisma.team.findFirst({ where: { name: 'Testers Team' } });
    const res = await api
      .post(`/api/v1/teams/${team.id}/join`)
      .set('Authorization', `Bearer ${participantToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.members).toContainEqual(expect.objectContaining({ userId: expect.any(String) }));
  });
});
