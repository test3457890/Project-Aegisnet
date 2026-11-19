import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import { config } from 'dotenv';
import path from 'path';

import healthRouter from './routes/health';
import authRouter from './routes/auth';
import usersRouter from './routes/users';
import networksRouter from './routes/networks';
import chatsRouter from './routes/chats';
import uploadsRouter from './routes/uploads';
import filesRouter from './routes/files';
import roomsRouter from './routes/rooms';
import devicesRouter from './routes/devices';
import callsRouter from './routes/calls';
import categoriesRouter from './routes/categories';
import unreadRouter from './routes/unread';
import adminRouter from './routes/admin';
import invitationsRouter from './routes/invitations';
import trustRouter from './routes/trust';
import { ensureUploadDirectory, UPLOAD_DIR } from './utils/uploads';
import helmet from 'helmet';
import { requireAuth } from './middleware/auth';
import rateLimit from 'express-rate-limit';
import { AegisSecurityConfig } from './config/security';
import { aegisGuard } from './security/aegisGuard';

config();

const isProduction = process.env.NODE_ENV === 'production';
if (isProduction && !process.env.FRONTEND_ORIGIN) {
  console.warn("WARNING: FRONTEND_ORIGIN is not set in production. CORS may be overly restrictive.");
}
if (!isProduction) {
  console.warn("=================================================");
  console.warn(" WARNING: RUNNING IN INSECURE PROTOTYPE MODE");
  console.warn("=================================================");
}

export const app = express();

app.use((req, res, next) => {
  const requestId = crypto.randomUUID();
  (req as any).requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
});

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const configured = (process.env.FRONTEND_ORIGIN || "http://localhost:5173")
      .split(",")
      .map((item) => item.trim());
    const isLocalDevelopment = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
    callback(null, configured.includes(origin) || isLocalDevelopment);
  },
  credentials: true
}));

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));
app.use(express.json({ limit: '1mb' }));

const globalLimiter = rateLimit({
  windowMs: AegisSecurityConfig.rateLimitWindowMs,
  limit: AegisSecurityConfig.rateLimitMax,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: "Too many requests from this IP, please try again later." }
});

const authLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  limit: 50,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: "Too many authentication attempts." }
});

app.use(globalLimiter);
app.use(aegisGuard);

ensureUploadDirectory();
app.use('/uploads/files', express.static(path.resolve(UPLOAD_DIR), {
  dotfiles: 'deny',
  index: false,
  setHeaders: (response, path) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    if (path.match(/\.(png|jpg|jpeg|gif|webp|pdf)$/i)) {
      response.setHeader('Content-Disposition', 'inline');
    } else {
      response.setHeader('Content-Disposition', 'attachment');
    }
  },
}));

// Public Routes
app.use('/health', healthRouter);
app.use('/auth', authLimiter, authRouter);

// Protected Routes
app.use('/users', requireAuth, usersRouter);
app.use('/networks', requireAuth, networksRouter);
app.use('/categories', requireAuth, categoriesRouter);
app.use('/rooms', requireAuth, roomsRouter);
app.use('/chats', requireAuth, chatsRouter);
app.use('/invitations', requireAuth, invitationsRouter);
app.use('/unread', requireAuth, unreadRouter);
app.use('/uploads', requireAuth, uploadsRouter);
app.use('/files', requireAuth, filesRouter);
app.use('/devices', requireAuth, devicesRouter);
app.use('/calls', requireAuth, callsRouter);
app.use('/admin', requireAuth, authLimiter, adminRouter);
app.use('/trust', requireAuth, trustRouter);

// Error handler
app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ 
    error: 'The API could not complete that request.',
    requestId: (err as any).requestId || (req as any).requestId,
    ...(isProduction ? {} : { details: err.message })
  });
});
