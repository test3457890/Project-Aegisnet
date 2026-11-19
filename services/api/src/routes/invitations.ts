import { Router } from "express";
import { allQuery, getQuery, runQuery } from "../db/db";
import { logAudit } from "../utils/audit";

const router = Router();

interface InvitationRow {
  id: string;
  inviteCode: string;
  targetType: string;
  targetId: string;
  createdBy: string;
  createdAt: string;
  expiresAt: string | null;
  maxUses: number;
  usedCount: number;
  status: string;
  requireApproval: number;
}

// Generate a random token
function generateToken() {
  return Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
}

router.get("/network/:networkId", async (request, response) => {
  try {
    const invites = await allQuery<InvitationRow>(
      "SELECT * FROM invitations WHERE targetId = ? AND targetType = 'network' ORDER BY createdAt DESC",
      [request.params.networkId]
    );
    response.json(invites);
  } catch (err) {
    response.status(500).json({ error: "Failed to fetch invitations." });
  }
});

router.post("/network/:networkId", async (request, response) => {
  const { maxUses, expiresAt, requireApproval } = request.body;
  const inviteCode = generateToken();
  const id = `inv_${inviteCode}`;
  
  const creatorId = request.userContext?.id || "user_me";

  try {
    await runQuery(
      `INSERT INTO invitations (id, inviteCode, targetType, targetId, createdBy, createdAt, expiresAt, maxUses, usedCount, status, requireApproval)
       VALUES (?, ?, 'network', ?, ?, ?, ?, ?, 0, 'active', ?)`,
      [id, inviteCode, request.params.networkId, creatorId, new Date().toISOString(), expiresAt || null, maxUses || 0, requireApproval ? 1 : 0]
    );
    await logAudit("invite.created", creatorId, id, { networkId: request.params.networkId, maxUses, expiresAt, requireApproval });
    response.status(201).json({ success: true, id, token: inviteCode });
  } catch (err) {
    response.status(500).json({ error: "Failed to create invitation." });
  }
});

router.delete("/:id", async (request, response) => {
  const actorId = request.userContext?.id || "user_me";
  try {
    const invite = await getQuery<{ targetId: string }>("SELECT targetId FROM invitations WHERE id = ?", [request.params.id]);
    await runQuery("DELETE FROM invitations WHERE id = ?", [request.params.id]);
    if (invite) {
      await logAudit("invite.revoked", actorId, request.params.id, { networkId: invite.targetId });
    }
    response.json({ success: true });
  } catch (err) {
    response.status(500).json({ error: "Failed to delete invitation." });
  }
});

router.post("/accept", async (request, response) => {
  const { token, userId } = request.body;
  if (!token || !userId) {
    response.status(400).json({ error: "Missing token or userId." });
    return;
  }
  
  try {
    const invite = await getQuery<InvitationRow>("SELECT * FROM invitations WHERE inviteCode = ?", [token]);
    if (!invite) {
      response.status(404).json({ error: "Invalid invitation code." });
      return;
    }
    
    if (invite.maxUses > 0 && invite.usedCount >= invite.maxUses) {
      response.status(403).json({ error: "Invitation is fully used." });
      return;
    }
    
    if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
      response.status(403).json({ error: "Invitation has expired." });
      return;
    }
    
    // Check if user is already a member
    const existingMember = await getQuery("SELECT 1 FROM network_members WHERE networkId = ? AND userId = ?", [invite.targetId, userId]);
    if (existingMember) {
      response.json({ success: true, networkId: invite.targetId, message: "Already a member." });
      return;
    }

    if (invite.requireApproval) {
      const appId = `app_${Math.random().toString(36).substring(2, 9)}`;
      await runQuery("INSERT INTO join_applications (id, networkId, userId, inviteId, status) VALUES (?, ?, ?, ?, 'pending')", [appId, invite.targetId, userId, invite.id]);
      await runQuery("UPDATE invitations SET usedCount = usedCount + 1 WHERE id = ?", [invite.id]);
      await logAudit("application.created", userId, appId, { networkId: invite.targetId, inviteId: invite.id });
      response.json({ success: true, networkId: invite.targetId, requireApproval: true });
      return;
    }
    
    // Add member
    await runQuery("INSERT INTO network_members (networkId, userId, role) VALUES (?, ?, 'member')", [invite.targetId, userId]);
    
    // Increment uses
    await runQuery("UPDATE invitations SET usedCount = usedCount + 1 WHERE id = ?", [invite.id]);
    await logAudit("invite.redeemed", userId, invite.id, { networkId: invite.targetId });
    
    response.json({ success: true, networkId: invite.targetId, requireApproval: false });
  } catch (err) {
    response.status(500).json({ error: "Failed to accept invitation." });
  }
});

export default router;
