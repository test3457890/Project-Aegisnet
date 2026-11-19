import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let app: typeof import('../server').app;
let runQuery: typeof import('../db/db').runQuery;
let allQuery: typeof import('../db/db').allQuery;
let closeDb: typeof import('../db/db').closeDb;
let temporaryRoot: string;

describe('AegisNet API Routes', () => {
  let testCounter = 0;
  const makeTestId = (prefix: string) => `${prefix}_${++testCounter}_${Math.random().toString(36).substring(2, 8)}`;

  beforeAll(async () => {
    temporaryRoot = mkdtempSync(join(tmpdir(), 'aegisnet-routes-'));
    process.env.DATABASE_URL = ':memory:';
    process.env.UPLOAD_DIR = join(temporaryRoot, 'uploads');
    const database = await import('../db/db');
    ({ app } = await import('../server'));
    ({ runQuery, allQuery, closeDb } = database);
    await database.initDb();
    await runQuery('INSERT OR IGNORE INTO users (id, name) VALUES (?, ?)', ['user_me', 'Me']);
    await runQuery('INSERT OR IGNORE INTO users (id, name) VALUES (?, ?)', ['user_other', 'Other']);
    await runQuery('INSERT OR IGNORE INTO users (id, name) VALUES (?, ?)', ['user_invite_1', 'Invite 1']);
    await runQuery('INSERT OR IGNORE INTO users (id, name) VALUES (?, ?)', ['user_invite_2', 'Invite 2']);
    await runQuery('INSERT OR IGNORE INTO users (id, name) VALUES (?, ?)', ['user_late', 'Late']);
    await runQuery('INSERT OR IGNORE INTO networks (id, name, ownerId) VALUES (?, ?, ?)', ['net_1', 'Network 1', 'user_me']);
    await runQuery("INSERT OR IGNORE INTO network_members (networkId, userId, role) VALUES (?, ?, 'owner')", ['net_1', 'user_me']);
    await runQuery("INSERT OR IGNORE INTO network_members (networkId, userId, role) VALUES (?, ?, 'member')", ['net_1', 'user_other']);
  });

  afterAll(async () => {
    try {
      await closeDb?.();
    } finally {
      if (temporaryRoot) rmSync(temporaryRoot, { recursive: true, force: true });
    }
  });

  it('updates profile successfully', async () => {
    const res = await request(app)
      .patch('/users/me')
      .set('Authorization', 'Bearer user_me')
      .send({ name: 'New Name', bio: 'My new bio' });
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const getRes = await request(app)
      .get('/users/me')
      .set('Authorization', 'Bearer user_me');
    expect(getRes.body.bio).toBe('My new bio');
  });

  it('rejects profile update without auth', async () => {
    const res = await request(app)
      .patch('/users/me')
      // No auth header => in this prototype, extractUserId defaults to "user_me" unless `requireAuth` blocks it.
      // Wait, `/users` uses `requireAuth`.
      .send({ name: 'Hacker' });
    
    expect(res.status).toBe(401);
  });

  it('derives actor from auth context for moderation and rejects non-admin', async () => {
    const res = await request(app)
      .post('/networks/net_1/members/user_me/kick')
      .set('Authorization', 'Bearer user_other'); // user_other is 'member'
    
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Unauthorized to kick');
  });

  it('allows owner to kick member', async () => {
    const res = await request(app)
      .post('/networks/net_1/members/user_other/kick')
      .set('Authorization', 'Bearer user_me'); // user_me is 'owner'
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('enforces invite expiration and max uses', async () => {
    // Create invite
    const createRes = await request(app)
      .post('/invitations/network/net_1')
      .set('Authorization', 'Bearer user_me')
      .send({ maxUses: 1, requireApproval: false });
    
    expect(createRes.status).toBe(201);
    const token = createRes.body.token;

    // Use dynamic users to avoid DB state leak between test runs
    const user1 = makeTestId('user_invite_1');
    const user2 = makeTestId('user_invite_2');
    await runQuery('INSERT OR IGNORE INTO users (id, name) VALUES (?, ?)', [user1, 'Invite 1']);
    await runQuery('INSERT OR IGNORE INTO users (id, name) VALUES (?, ?)', [user2, 'Invite 2']);

    // First use
    const accept1 = await request(app)
      .post('/invitations/accept')
      .set('Authorization', `Bearer ${user1}`)
      .send({ token, userId: user1 });
    
    expect(accept1.status).toBe(200);

    // Second use (should fail)
    const accept2 = await request(app)
      .post('/invitations/accept')
      .set('Authorization', `Bearer ${user2}`)
      .send({ token, userId: user2 });
    
    expect(accept2.status).toBe(403);
  });

  it('prevents normal member from managing roles', async () => {
    const res = await request(app)
      .post('/networks/net_1/roles')
      .set('Authorization', 'Bearer user_invite_2')
      .send({ name: 'Admin', permissions: ['all'] });
    expect(res.status).toBe(403);
  });

  it('prevents normal member from approving joins', async () => {
    const res = await request(app)
      .post('/networks/net_1/applications/app_123/approve')
      .set('Authorization', 'Bearer user_other');
    expect(res.status).toBe(403);
  });

  it('prevents redeeming a revoked invite', async () => {
    // Create invite
    const createRes = await request(app)
      .post('/invitations/network/net_1')
      .set('Authorization', 'Bearer user_me')
      .send({ maxUses: 5, requireApproval: false });
    const token = createRes.body.token;
    const inviteId = createRes.body.id;

    // Revoke it
    await request(app).delete(`/invitations/${inviteId}`).set('Authorization', 'Bearer user_me');

    // Try to accept
    const acceptRes = await request(app)
      .post('/invitations/accept')
      .set('Authorization', 'Bearer user_late')
      .send({ token, userId: 'user_late' });
    expect(acceptRes.status).toBe(404);
  });

  it('prevents redeeming an expired invite', async () => {
    const pastDate = new Date(Date.now() - 10000).toISOString();
    const createRes = await request(app)
      .post('/invitations/network/net_1')
      .set('Authorization', 'Bearer user_me')
      .send({ maxUses: 5, expiresAt: pastDate });
    
    const acceptRes = await request(app)
      .post('/invitations/accept')
      .set('Authorization', 'Bearer user_late')
      .send({ token: createRes.body.token, userId: 'user_late' });
    expect(acceptRes.status).toBe(403);
    expect(acceptRes.body.error).toBe('Invitation has expired.');
  });

  it('blocks unauthorized access to restricted networks', async () => {
    await runQuery('INSERT OR IGNORE INTO networks (id, name, ownerId, privacyMode) VALUES (?, ?, ?, ?)', ['net_2', 'Net 2', 'user_me', 'restricted']);
    // user_other is NOT in net_2

    const res = await request(app)
      .get('/networks/net_2/rooms')
      .set('Authorization', 'Bearer user_other');
    
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/restricted/i);
  });

  it('excludes private content from audit metadata', async () => {
    const response = await request(app)
      .put('/trust/user_other')
      .set('Authorization', 'Bearer user_me')
      .send({ trustLevel: 'trusted', privateNote: 'Private test note' });
    expect(response.status).toBe(200);

    const logs = await allQuery<{ metadata: string }>(
      'SELECT metadata FROM audit_logs WHERE action = ? AND targetId = ?',
      ['trust.updated', 'user_other']
    );
    expect(logs.map(({ metadata }) => JSON.parse(metadata))).toEqual([{ trustLevel: 'trusted' }]);
  });
});
