// File: tests/functional/userRegistrationFlow.test.js
const request = require('supertest');
const app = require('../../apps/backend/src/server');
const prisma = require('../../apps/backend/src/config/database');

describe('Functional: User Registration and Login Flow', () => {
  const api = request(app);
  const user = { email: 'flowuser@example.com', password: 'Flow123!', firstName: 'Flow', lastName: 'User' };
  let token;

  beforeAll(async () => {
    // Ensure no pre-existing user
    await prisma.user.deleteMany({ where: { email: user.email } });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: user.email } });
    await prisma.$disconnect();
  });

  test('Successful signup and login, then profile accessible', async () => {
    // Signup
    const signupRes = await api.post('/api/v1/auth/signup').send(user);
    expect(signupRes.statusCode).toBe(201);
    expect(signupRes.body.email).toBe(user.email);

    // Login
    const loginRes = await api.post('/api/v1/auth/login').send({
      email: user.email,
      password: user.password
    });
    expect(loginRes.statusCode).toBe(200);
    expect(loginRes.body.token).toBeDefined();
    token = loginRes.body.token;

    // Access profile (protected route) using token
    const profileRes = await api.get('/api/v1/profile/me').set('Authorization', `Bearer ${token}`);
    expect(profileRes.statusCode).toBe(200);
    expect(profileRes.body.email).toBe(user.email);
    expect(profileRes.body.firstName).toBe(user.firstName);
  });

  test('Session expiration after inactivity (simulated)', async () => {
    // Simulate session timeout by waiting longer than allowed (e.g. mocking)
    // Here, assume session expires after 1 second for test purpose
    jest.setTimeout(5000);
    await new Promise(res => setTimeout(res, 2000)); // wait 2 seconds
    const res = await api.get('/api/v1/profile/me').set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(401);
  });
});
