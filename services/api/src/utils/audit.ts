import { runQuery } from '../db/db';

export async function logAudit(action: string, actorId: string, targetId: string | null = null, metadata: Record<string, any> = {}) {
  const id = 'audit_' + Math.random().toString(36).substring(2, 9);
  
  // Clean sensitive fields from metadata if they slipped in
  const safeMetadata = { ...metadata };
  delete safeMetadata.bio;
  delete safeMetadata.privateNote;
  delete safeMetadata.password;
  delete safeMetadata.token;
  
  try {
    await runQuery(
      'INSERT INTO audit_logs (id, action, actorId, targetId, metadata, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
      [id, action, actorId, targetId, JSON.stringify(safeMetadata), new Date().toISOString()]
    );
  } catch (error) {
    console.error('[AegisNet API] Failed to write audit log', error);
  }
}
