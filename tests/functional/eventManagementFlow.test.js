// File: tests/functional/eventManagementFlow.test.js
const request = require('supertest');
const app = require('../../apps/backend/src/server');
const prisma = require('../../apps/backend/src/config/database');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = process.env;

describe('Functional: Event Creation and Participation Flow', () => {
  const api = request(app);
  let organizerToken, participantToken, eventId;

  beforeAll(async () => {
    // Create organizer and participant
    const [org, part] = await Promise.all([
      prisma.user.create({ data: { email: 'org@example.com', password: 'Org123!', firstName: 'Org', lastName: 'Test', role: 'ORGANIZER' } }),
      prisma.user.create({ data: { email: 'part@example.com', password: 'Part123!', firstName: 'Part', lastName: 'Test', role: 'PARTICIPANT' } })
    ]);
    organizerToken = jwt.sign({ userId: org.id, role: org.role }, JWT_SECRET);
    participantToken = jwt.sign({ userId: part.id, role: part.role }, JWT_SECRET);
  });

  afterAll(async () => {
    await prisma.event.deleteMany({ where: { title: 'Functional Test Event' } });
    await prisma.user.deleteMany({ where: { email: { in: ['org@example.com', 'part@example.com'] } } });
    await prisma.$disconnect();
  });

  test('Organizer creates an event and participant registers', async () => {
    // Organizer creates event
    const createRes = await api
      .post('/api/v1/events')
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({ title: 'Functional Test Event', startDate: '2026-08-01', endDate: '2026-08-02', location: 'Dire Dawa' });
    expect(createRes.statusCode).toBe(201);
    eventId = createRes.body.id;

    // Participant fetches event list and sees new event
    const listRes = await api.get('/api/v1/events');
    expect(listRes.statusCode).toBe(200);
    expect(listRes.body.data.some(e => e.id === eventId)).toBe(true);

    // Participant registers for the event
    const regRes = await api
      .post(`/api/v1/events/${eventId}/register`)
      .set('Authorization', `Bearer ${participantToken}`);
    expect(regRes.statusCode).toBe(200);
    expect(regRes.body.eventId).toBe(eventId);
    expect(regRes.body.status).toBe('REGISTERED');
  });
});
