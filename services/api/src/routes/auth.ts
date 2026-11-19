import { Router } from 'express';
import { getQuery } from '../db/db';

const router = Router();

// PROTOTYPE ONLY: Demo login bypasses real auth and issues a dummy token
router.post('/demo-login', async (req, res) => {
  try {
    const { userId } = req.body; // e.g. "user_me"
    if (!userId) {
      return res.status(400).json({ error: 'userId is required for demo login' });
    }

    const user = await getQuery('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({ error: 'Demo user not found' });
    }

    res.json({
      token: userId, // Dummy token
      user
    });
  } catch (err) {
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/logout', (req, res) => {
  res.json({ success: true });
});

router.get('/me', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'Unauthorized' });
  
  const userId = auth.split(' ')[1];
  try {
    const user = await getQuery('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Auth failed' });
  }
});

export default router;
