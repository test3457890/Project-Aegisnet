import { Router } from 'express';
import { logAudit } from '../utils/audit';
import { getQuery, allQuery, runQuery } from '../db/db';

const router = Router();

// Mock middleware to simulate auth token extraction
// In a prototype, we trust the Authorization header literally
const extractUserId = (req: any) => {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    return auth.split(' ')[1]; // "user_me"
  }
  return 'user_me'; // Default prototype fallback
};

router.get('/', async (req, res) => {
  try {
    const users = await allQuery('SELECT * FROM users');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.get('/me', async (req, res) => {
  try {
    const userId = extractUserId(req);
    const user = await getQuery('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    // Bio is intentionally excluded from logs, but returned to the user
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

router.patch('/me', async (req, res) => {
  try {
    const userId = extractUserId(req);
    const { name, username, status, bio, avatarColor } = req.body;
    
    // Validate request
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Ensure user exists
    const user = await getQuery('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const reqId = `req_${Math.random().toString(36).substring(2, 9)}`;

    await runQuery(
      `UPDATE users SET 
        name = COALESCE(?, name),
        username = COALESCE(?, username),
        status = COALESCE(?, status),
        bio = COALESCE(?, bio),
        avatarColor = COALESCE(?, avatarColor)
       WHERE id = ?`,
      [name ?? null, username ?? null, status ?? null, bio ?? null, avatarColor ?? null, userId]
    );

    await logAudit('profile.updated', userId, userId, { requestId: reqId, updatedFields: Object.keys(req.body) });
    res.json({ success: true, requestId: reqId });
  } catch (err) {
    const reqId = `req_${Math.random().toString(36).substring(2, 9)}`;
    console.error(err); res.status(500).json({ error: 'Failed to update profile', requestId: reqId });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const user = await getQuery('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

export default router;
