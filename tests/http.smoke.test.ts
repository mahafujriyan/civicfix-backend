import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';

// Health does not need DB for route wiring check of response shape when DB fails gracefully.
describe('health endpoint', () => {
  it('returns standard success envelope', async () => {
    const app = createApp();
    const res = await request(app).get('/api/v1/health');

    expect(res.body).toHaveProperty('success');
    expect(res.body).toHaveProperty('message');
    expect(res.body).toHaveProperty('data');
  });

  it('returns 401 for protected route without token', async () => {
    const app = createApp();
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('returns 404 for unknown route', async () => {
    const app = createApp();
    const res = await request(app).get('/api/v1/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
