import { Request, Response, NextFunction } from 'express';
import { AegisSecurityConfig } from '../config/security';
import crypto from 'crypto';

export type AegisGuardLog = {
  timestamp: string;
  route: string;
  method: string;
  statusCode: number;
  reasonCode: string;
  userId?: string;
  requestId: string;
  ipHash: string;
  userAgentFamily?: string;
  payloadSize?: number;
  blocked: boolean;
};

// Safe metadata logger
export const logAegisGuardEvent = (event: Omit<AegisGuardLog, 'timestamp' | 'ipHash'> & { ip: string }) => {
  if (!AegisSecurityConfig.enabled || AegisSecurityConfig.logLevel === 'off') return;
  const requestId = event.requestId || crypto.randomBytes(8).toString('hex');
  const ipHash = crypto.createHash('sha256').update(event.ip).digest('hex').substring(0, 16);
  
  const logEntry: AegisGuardLog = {
    timestamp: new Date().toISOString(),
    requestId,
    ipHash,
    route: event.route,
    method: event.method,
    statusCode: event.statusCode,
    reasonCode: event.reasonCode,
    userId: event.userId,
    userAgentFamily: event.userAgentFamily,
    payloadSize: event.payloadSize,
    blocked: event.blocked,
  };

  if (AegisSecurityConfig.logLevel === 'warn' || AegisSecurityConfig.logLevel === 'info') {
    console.warn(`[AegisNet Guard] ${logEntry.blocked ? 'BLOCKED' : 'FLAGGED'} - ${logEntry.reasonCode} - Route: ${logEntry.route} (IP Hash: ${ipHash}) (ReqID: ${requestId})`);
  }
};

const PATH_TRAVERSAL_REGEX = /(?:\.\.[/\\])|(?:%2e%2e%2f)|(?:%2e%2e%5c)/i;
const SENSITIVE_FILES_REGEX = /\/(?:\.env|\.git|node_modules|package-lock\.json|.*\.sqlite|.*\.log)/i;
const HTML_SCRIPT_REGEX = /<\s*script\b[^>]*>|javascript:/i;

export const aegisGuard = (req: Request, res: Response, next: NextFunction) => {
  if (!AegisSecurityConfig.enabled || AegisSecurityConfig.mode === 'off') {
    return next();
  }

  const checkAndBlock = (reasonCode: string, shouldHardBlock: boolean = true) => {
    const isBlocked = AegisSecurityConfig.mode === 'block' && shouldHardBlock;
    
    logAegisGuardEvent({
      requestId: (req as any).requestId,
      ip: req.ip || req.socket.remoteAddress || 'unknown',
      method: req.method,
      route: req.originalUrl,
      statusCode: isBlocked ? 403 : 200,
      reasonCode,
      userId: (req as any).userContext?.id,
      userAgentFamily: req.get('User-Agent')?.substring(0, 50),
      payloadSize: req.headers['content-length'] ? parseInt(req.headers['content-length'], 10) : 0,
      blocked: isBlocked
    });

    if (isBlocked) {
      res.status(403).json({ error: 'Request blocked by AegisNet Guard abuse-control layer.' });
      return true;
    }
    return false;
  };

  const decodedUrl = decodeURIComponent(req.originalUrl || '');
  
  // Hard block: Path traversal
  if (PATH_TRAVERSAL_REGEX.test(req.originalUrl) || PATH_TRAVERSAL_REGEX.test(decodedUrl)) {
    if (checkAndBlock('PATH_TRAVERSAL_ATTEMPT')) return;
  }

  // Hard block: Sensitive files
  if (SENSITIVE_FILES_REGEX.test(req.originalUrl) || SENSITIVE_FILES_REGEX.test(decodedUrl)) {
    if (checkAndBlock('SENSITIVE_FILE_ACCESS_ATTEMPT')) return;
  }

  // Hard block: Oversized JSON (Note: Express also has limit, but we check length header explicitly)
  const contentLength = req.headers['content-length'];
  if (contentLength && parseInt(contentLength, 10) > AegisSecurityConfig.maxJsonBytes && req.is('application/json')) {
    if (checkAndBlock('OVERSIZED_JSON_PAYLOAD')) return;
  }

  // Monitor/flag: HTML/Script injection in body. 
  // We monitor rather than hard-block to allow cybersecurity examples/bug reports in chat.
  if (req.body && typeof req.body === 'object') {
    const bodyStr = JSON.stringify(req.body);
    if (HTML_SCRIPT_REGEX.test(bodyStr)) {
      if (checkAndBlock('POSSIBLE_SCRIPT_INJECTION', false)) return;
    }
  }

  next();
};
