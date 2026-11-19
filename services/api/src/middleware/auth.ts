import { Request, Response, NextFunction } from 'express';
import { getQuery } from '../db/db';

export interface UserContext {
  id: string;
  name: string;
  role: string;
}

declare module 'express-serve-static-core' {
  interface Request {
    userContext?: UserContext;
  }
}

/**
 * PROTOTYPE ONLY: Simple token extraction middleware.
 * DO NOT USE FOR PRODUCTION.
 * It extracts the token from the Authorization header, assumes it's the userId, and fetches the user.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Missing authorization header' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Missing token in authorization header' });
  }

  try {
    const user = await getQuery<UserContext>('SELECT id, name, role FROM users WHERE id = ?', [token]);
    if (!user) {
      return res.status(401).json({ error: 'Invalid or unknown user' });
    }
    
    req.userContext = user;
    next();
  } catch (error) {
    console.error("[AegisNet API] Auth error:", error);
    res.status(500).json({ error: 'Authentication failed' });
  }
}
