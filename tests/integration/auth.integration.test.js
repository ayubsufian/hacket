// File: tests/integration/auth.integration.test.js
const request = require('supertest');
const app = require('../../apps/backend/src/server'); // assuming server exports express app
const prisma = require('../../apps/backend/src/config/database');

describe('Auth API Integration', () => {
  const api = request(app);
  const testUser = { email: 'testuser@example.com', password: 'Secret123!' };

  beforeAll(async () => {
    // Ensure test user is not in DB
    await prisma.user.deleteMany({ where: { email: testUser.email } });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: testUser.email } });
    await prisma.$disconnect();
  });

  test('POST /api/v1/auth/signup - success', async () => {
    const res = await api.post('/api/v1/auth/signup').send({
      email: testUser.email,
      password: testUser.password,
      firstName: 'Test',
      lastName: 'User',
      role: 'PARTICIPANT'
    });
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.email).toBe(testUser.email);
  });

  test('POST /api/v1/auth/signup - duplicate email', async () => {
    // Try signing up the same email again
    const res = await api.post('/api/v1/auth/signup').send({
      email: testUser.email,
      password: testUser.password,
      firstName: 'Test',
      lastName: 'User',
      role: 'PARTICIPANT'
    });
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/already exists/);
  });

  test('POST /api/v1/auth/login - success and JWT issuance', async () => {
    const res = await api.post('/api/v1/auth/login').send({
      email: testUser.email,
      password: testUser.password
    });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(typeof res.body.token).toBe('string');
    // Optionally check the JWT payload (role, etc.) if decodable
  });

  test('POST /api/v1/auth/login - invalid credentials', async () => {
    const res = await api.post('/api/v1/auth/login').send({
      email: testUser.email,
      password: 'WrongPassword'
    });
    expect(res.statusCode).toBe(401);
    expect(res.body.message).toMatch(/invalid credentials/i);
  });
});
