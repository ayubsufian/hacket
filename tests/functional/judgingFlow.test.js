// File: tests/functional/judgingFlow.test.js
const request = require('supertest');
const app = require('../../apps/backend/src/server');
const prisma = require('../../apps/backend/src/config/database');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = process.env;

describe('Functional: Submission and Judging Flow', () => {
  const api = request(app);
  let judgeToken, participantToken, eventId, teamId, submissionId;

  beforeAll(async () => {
    // Create judge and participant
    const [judge, part] = await Promise.all([
      prisma.user.create({ data: { email: 'judge@example.com', password: 'Judge123!', firstName: 'Judge', lastName: 'Test', role: 'JUDGE' } }),
      prisma.user.create({ data: { email: 'contestant@example.com', password: 'Contest123!', firstName: 'Contest', lastName: 'Test', role: 'PARTICIPANT' } })
    ]);
    judgeToken = jwt.sign({ userId: judge.id, role: judge.role }, JWT_SECRET);
    participantToken = jwt.sign({ userId: part.id, role: part.role }, JWT_SECRET);

    // Create event and team
    const event = await prisma.event.create({ data: { title: 'Judging Event', startDate: new Date(), endDate: new Date(), ownerId: null } });
    eventId = event.id;
    const team = await prisma.team.create({ data: { name: 'Team Judged', eventId, members: { create: [{ userId: part.id }] } } });
    teamId = team.id;
  });

  afterAll(async () => {
    await prisma.score.deleteMany({ where: { submissionId } });
    await prisma.submission.deleteMany({ where: { id: submissionId } });
    await prisma.team.deleteMany({ where: { id: teamId } });
    await prisma.event.deleteMany({ where: { id: eventId } });
    await prisma.user.deleteMany({ where: { email: { in: ['judge@example.com', 'contestant@example.com'] } } });
    await prisma.$disconnect();
  });

  test('Participant submits project and judge scores it', async () => {
    // Participant submits a project
    const subRes = await api
      .post(`/api/v1/events/${eventId}/submissions`)
      .set('Authorization', `Bearer ${participantToken}`)
      .field('teamId', teamId)
      .field('projectLink', 'http://github.com/repo');
    expect(subRes.statusCode).toBe(201);
    submissionId = subRes.body.id;

    // Judge retrieves submissions for event
    const listRes = await api
      .get(`/api/v1/events/${eventId}/submissions`)
      .set('Authorization', `Bearer ${judgeToken}`);
    expect(listRes.statusCode).toBe(200);
    expect(listRes.body.data.some(s => s.id === submissionId)).toBe(true);

    // Judge scores the submission
    const scoreRes = await api
      .post(`/api/v1/judging/score`)
      .set('Authorization', `Bearer ${judgeToken}`)
      .send({ submissionId, score: 8.5, comment: 'Great work!' });
    expect(scoreRes.statusCode).toBe(201);
    expect(scoreRes.body.score).toBe(8.5);
  });
});
