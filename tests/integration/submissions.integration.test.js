// File: tests/integration/submissions.integration.test.js
const request = require('supertest');
const app = require('../../apps/backend/src/server');
const prisma = require('../../apps/backend/src/config/database');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = process.env;
const path = require('path');

describe('Submissions API Integration', () => {
  const api = request(app);
  let participantToken, eventId, teamId;

  beforeAll(async () => {
    // Setup: create user, event, team
    const user = await prisma.user.create({ data: { email: 'sub@example.com', password: 'Sub123!', firstName: 'Sub', lastName: 'User', role: 'PARTICIPANT' } });
    participantToken = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET);
    const event = await prisma.event.create({ data: { title: 'Submission Event', startDate: new Date(), endDate: new Date(), ownerId: null } });
    eventId = event.id;
    const team = await prisma.team.create({ data: { name: 'Sub Team', eventId, members: { create: [{ userId: user.id }] } } });
    teamId = team.id;
  });

  afterAll(async () => {
    await prisma.submission.deleteMany({ where: { teamId } });
    await prisma.team.deleteMany({ where: { id: teamId } });
    await prisma.event.deleteMany({ where: { id: eventId } });
    await prisma.user.deleteMany({ where: { email: 'sub@example.com' } });
    await prisma.$disconnect();
  });

  test('POST /api/v1/submissions - submit project (URL)', async () => {
    const res = await api
      .post(`/api/v1/events/${eventId}/submissions`)
      .set('Authorization', `Bearer ${participantToken}`)
      .field('teamId', teamId)
      .field('projectLink', 'http://example.com/project');
    expect(res.statusCode).toBe(201);
    expect(res.body.projectLink).toBe('http://example.com/project');
  });

  test('GET /api/v1/events/:eventId/submissions - list submissions', async () => {
    const res = await api.get(`/api/v1/events/${eventId}/submissions`).set('Authorization', `Bearer ${participantToken}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.find(s => s.teamId === teamId)).toBeDefined();
  });
});
