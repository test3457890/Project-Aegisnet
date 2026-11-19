import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { aegisGuard, logAegisGuardEvent } from '../security/aegisGuard';
import { AegisSecurityConfig } from '../config/security';

describe('AegisNet Guard', () => {
  let app: express.Express;

  beforeEach(() => {
    // Enable for testing
    AegisSecurityConfig.enabled = true;
    AegisSecurityConfig.mode = 'block';
    
    app = express();
    app.use(express.json());
    app.use(aegisGuard);

    app.get('/safe', (req, res) => res.json({ status: 'ok' }));
    app.post('/safe', (req, res) => res.json({ status: 'ok' }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('allows safe requests', async () => {
    const res = await request(app).get('/safe');
    expect(res.status).toBe(200);
  });



  it('blocks encoded path traversal via url', async () => {
    const res = await request(app).get('/safe/%2e%2e%2f%2e%2e%2fetc/passwd');
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/request blocked/i);
  });

  it('blocks access to sensitive files', async () => {
    const res = await request(app).get('/safe/.env');
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/request blocked/i);
  });

  it('flags but does not block script injection in dev mode (monitors)', async () => {
    const res = await request(app)
      .post('/safe')
      .send({ message: '<script>alert(1)</script>' });
    
    expect(res.status).toBe(200);
  });
});
