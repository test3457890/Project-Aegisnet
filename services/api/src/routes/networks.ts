import { Router } from "express";
import { randomUUID } from "node:crypto";
import { logAudit } from '../utils/audit';
import { allQuery, getQuery, runQuery } from "../db/db";
import { broadcast } from "../websocket/ws";

const router = Router();

interface NetworkRow {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  initials?: string;
  ownerId?: string;
  sortOrder: number;
}

interface CategoryRow {
  id: string;
  networkId: string;
  name: string;
  sortOrder: number;
}

interface RoomRow {
  id: string;
  networkId: string;
  categoryId?: string;
  name: string;
  icon?: string;
  type: string;
  sortOrder: number;
  archived: number;
  unread: number;
}

async function getMemberIds(networkId: string) {
  const members = await allQuery<{ userId: string }>(
    "SELECT userId FROM network_members WHERE networkId = ? ORDER BY userId",
    [networkId],
  );
  return members.map((member) => member.userId);
}

function mapRoom(room: RoomRow) {
  return {
    ...room,
    archived: Boolean(room.archived),
    unread: Number(room.unread || 0),
  };
}

async function requireAdminOrOwner(networkId: string, userId: string) {
  const membership = await getQuery<{ role: string }>(
    "SELECT role FROM network_members WHERE networkId = ? AND userId = ?",
    [networkId, userId]
  );
  if (membership?.role !== "owner" && membership?.role !== "admin") {
    throw new Error("Unauthorized");
  }
}

router.get("/", async (request, response) => {
  try {
    const userId = request.userContext?.id || "user_me";
    const networks = await allQuery<NetworkRow>(
      `SELECT n.* FROM networks n 
       JOIN network_members nm ON n.id = nm.networkId 
       WHERE nm.userId = ? 
       ORDER BY n.sortOrder, n.name`,
      [userId]
    );
    const withMembers = await Promise.all(networks.map(async (network) => ({
      ...network,
      memberIds: await getMemberIds(network.id),
    })));
    response.json(withMembers);
  } catch (error) {
    response.status(500).json({ error: "Failed to fetch Networks." });
  }
});

router.get("/:networkId/categories", async (request, response) => {
  try {
    const categories = await allQuery<CategoryRow>(
      "SELECT * FROM network_categories WHERE networkId = ? ORDER BY sortOrder, name",
      [request.params.networkId],
    );
    response.json(categories);
  } catch {
    response.status(500).json({ error: "Failed to fetch Network categories." });
  }
});

router.get("/:networkId/rooms", async (request, response) => {
  try {
    const userId = request.userContext?.id || "user_me";
    const network = await getQuery<{ privacyMode: string }>("SELECT privacyMode FROM networks WHERE id = ?", [request.params.networkId]);
    if (network?.privacyMode === "restricted" || network?.privacyMode === "opsec_restricted") {
      const membership = await getQuery("SELECT * FROM network_members WHERE networkId = ? AND userId = ?", [request.params.networkId, userId]);
      if (!membership) {
        return response.status(403).json({ error: "Access denied. Network is restricted." });
      }
    }
    const rooms = await allQuery<RoomRow>(
      "SELECT * FROM rooms WHERE networkId = ? ORDER BY sortOrder, name",
      [request.params.networkId],
    );
    response.json(rooms.map(mapRoom));
  } catch {
    response.status(500).json({ error: "Failed to fetch rooms." });
  }
});

router.get("/:networkId", async (request, response) => {
  try {
    const userId = request.userContext?.id || "user_me";
    const network = await getQuery<NetworkRow>(
      `SELECT n.* FROM networks n 
       JOIN network_members nm ON n.id = nm.networkId 
       WHERE n.id = ? AND nm.userId = ?`,
      [request.params.networkId, userId]
    );
    if (!network) {
      response.status(403).json({ error: "Access denied or Network not found." });
      return;
    }
    const [categories, rooms, memberIds] = await Promise.all([
      allQuery<CategoryRow>(
        "SELECT * FROM network_categories WHERE networkId = ? ORDER BY sortOrder, name",
        [network.id],
      ),
      allQuery<RoomRow>("SELECT * FROM rooms WHERE networkId = ? ORDER BY sortOrder, name", [network.id]),
      getMemberIds(network.id),
    ]);
    response.json({
      ...network,
      memberIds,
      categories: categories.map((category) => ({
        ...category,
        rooms: rooms.filter((room) => room.categoryId === category.id).map(mapRoom),
      })),
    });
  } catch {
    response.status(500).json({ error: "Failed to fetch Network." });
  }
});

// --- CRUD for Networks ---

router.post("/", async (request, response) => {
  const { id, name, description, icon, color, initials, privacyMode } = request.body;
  const ownerId = request.userContext?.id || "user_me";
  if (!id || !name || !ownerId) {
    response.status(400).json({ error: "Missing required fields." });
    return;
  }
  try {
    const maxSort = await getQuery<{ max: number }>("SELECT MAX(sortOrder) as max FROM networks");
    const nextSort = (maxSort?.max ?? -1) + 1;
    
    await runQuery(
      `INSERT INTO networks (id, name, description, icon, color, initials, ownerId, sortOrder, privacyMode, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, name, description || null, icon || null, color || null, initials || null, ownerId, nextSort, privacyMode || null, new Date().toISOString()]
    );
    await runQuery("INSERT INTO network_members (networkId, userId, role) VALUES (?, ?, 'owner')", [id, ownerId]);
    
    response.status(201).json({ success: true, id });
  } catch (err) {
    response.status(500).json({ error: "Failed to create Network." });
  }
});

router.patch("/:networkId", async (request, response) => {
  const { name, description, icon, color, privacyMode } = request.body;
  const userId = request.userContext?.id || "user_me";
  try {
    const membership = await getQuery<{ role: string }>(
      "SELECT role FROM network_members WHERE networkId = ? AND userId = ?",
      [request.params.networkId, userId]
    );
    if (membership?.role !== "owner" && membership?.role !== "admin") {
      response.status(403).json({ error: "Only owners or admins can update a Network." });
      return;
    }
    await runQuery(
      `UPDATE networks SET 
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        icon = COALESCE(?, icon),
        color = COALESCE(?, color),
        privacyMode = COALESCE(?, privacyMode)
       WHERE id = ?`,
      [name ?? null, description ?? null, icon ?? null, color ?? null, privacyMode ?? null, request.params.networkId]
    );
    response.json({ success: true });
  } catch (err) {
    response.status(500).json({ error: "Failed to update Network." });
  }
});

router.delete("/:networkId", async (request, response) => {
  const userId = request.userContext?.id || "user_me";
  try {
    const membership = await getQuery<{ role: string }>(
      "SELECT role FROM network_members WHERE networkId = ? AND userId = ?",
      [request.params.networkId, userId]
    );
    if (membership?.role !== "owner") {
      response.status(403).json({ error: "Only the owner can delete a Network." });
      return;
    }
    await runQuery("UPDATE networks SET deletedAt = ? WHERE id = ?", [new Date().toISOString(), request.params.networkId]);
    response.json({ success: true });
  } catch (err) {
    response.status(500).json({ error: "Failed to delete Network." });
  }
});

router.post("/:networkId/reorder", async (request, response) => {
  const { sortOrder } = request.body;
  if (sortOrder === undefined) {
    response.status(400).json({ error: "Missing sortOrder." });
    return;
  }
  try {
    await runQuery("UPDATE networks SET sortOrder = ? WHERE id = ?", [sortOrder, request.params.networkId]);
    response.json({ success: true });
  } catch (err) {
    response.status(500).json({ error: "Failed to reorder Network." });
  }
});

// --- CRUD for Network Members ---

router.post("/:networkId/members", async (request, response) => {
  const { participants } = request.body;
  const actorId = request.userContext?.id || "user_me";
  if (!participants || !Array.isArray(participants)) {
    response.status(400).json({ error: "Missing participants array." });
    return;
  }
  try {
    for (const userId of participants) {
      await runQuery(
        "INSERT OR IGNORE INTO network_members (networkId, userId, role) VALUES (?, ?, ?)",
        [request.params.networkId, userId, "member"]
      );
    }
    response.json({ success: true });
  } catch (err) {
    response.status(500).json({ error: "Failed to add members." });
  }
});

router.post("/:networkId/members/:userId/kick", async (request, response) => {
  const { networkId, userId } = request.params;
  const actorId = request.userContext!.id;
  try {
    await requireAdminOrOwner(networkId, actorId);
  } catch {
    return response.status(403).json({ error: "Unauthorized to kick" });
  }
  try {
    const result = await runQuery(
      "DELETE FROM network_members WHERE networkId = ? AND userId = ? AND role NOT IN ('owner', 'admin')",
      [networkId, userId]
    );
    if (result.changes) await logAudit("network.member.kicked", actorId, userId, { networkId });
    return response.json({ success: true });
  } catch {
    return response.status(500).json({ error: "Failed to remove member." });
  }
});

router.post("/:networkId/roles", async (request, response) => {
  const { networkId } = request.params;
  const actorId = request.userContext!.id;
  try {
    await requireAdminOrOwner(networkId, actorId);
  } catch {
    return response.status(403).json({ error: "Unauthorized to manage roles" });
  }
  const { id = randomUUID(), name, color, permissions } = request.body;
  if (typeof id !== "string" || !id || typeof name !== "string" || !name.trim() ||
      (color != null && typeof color !== "string") ||
      !Array.isArray(permissions) || permissions.some((permission) => typeof permission !== "string")) {
    return response.status(400).json({ error: "A valid role name and permissions are required." });
  }
  try {
    await runQuery(
      "INSERT INTO network_roles (id, networkId, name, color, permissions) VALUES (?, ?, ?, ?, ?)",
      [id, networkId, name.trim(), color ?? null, JSON.stringify(permissions)]
    );
    return response.status(201).json({ id });
  } catch {
    return response.status(500).json({ error: "Failed to add role." });
  }
});

router.delete("/:networkId/roles/:roleId", async (request, response) => {
  const { networkId, roleId } = request.params;
  try {
    await requireAdminOrOwner(networkId, request.userContext!.id);
  } catch {
    return response.status(403).json({ error: "Unauthorized to manage roles" });
  }
  try {
    await runQuery("DELETE FROM network_roles WHERE networkId = ? AND id = ?", [networkId, roleId]);
    return response.json({ success: true });
  } catch {
    return response.status(500).json({ error: "Failed to delete role." });
  }
});

router.get("/:networkId/applications", async (request, response) => {
  const actorId = request.userContext?.id || "user_me";
  try {
    await requireAdminOrOwner(request.params.networkId, actorId);
    const apps = await allQuery("SELECT * FROM join_applications WHERE networkId = ?", [request.params.networkId]);
    response.json(apps);
  } catch (err) {
    response.status(403).json({ error: "Unauthorized to view applications" });
  }
});

router.post("/:networkId/applications/:id/approve", async (request, response) => {
  const actorId = request.userContext?.id || "user_me";
  try {
    await requireAdminOrOwner(request.params.networkId, actorId);
    const app = await getQuery<{ userId: string }>("SELECT userId FROM join_applications WHERE id = ? AND networkId = ?", [request.params.id, request.params.networkId]);
    if (!app) {
      response.status(404).json({ error: "Application not found" });
      return;
    }
    await runQuery("UPDATE join_applications SET status = ? WHERE id = ?", ["approved", request.params.id]);
    await runQuery("INSERT OR IGNORE INTO network_members (networkId, userId, role) VALUES (?, ?, ?)", [request.params.networkId, app.userId, "member"]);
    await logAudit("application.approved", actorId, request.params.id, { networkId: request.params.networkId, targetUserId: app.userId });
    response.json({ success: true, requestId: `req_${Math.random().toString(36).substring(2, 9)}` });
  } catch (err) {
    response.status(403).json({ error: "Unauthorized to approve application", requestId: `req_${Math.random().toString(36).substring(2, 9)}` });
  }
});

router.post("/:networkId/applications/:id/reject", async (request, response) => {
  const actorId = request.userContext?.id || "user_me";
  try {
    await requireAdminOrOwner(request.params.networkId, actorId);
    await runQuery("UPDATE join_applications SET status = ? WHERE id = ? AND networkId = ?", ["rejected", request.params.id, request.params.networkId]);
    await logAudit("application.rejected", actorId, request.params.id, { networkId: request.params.networkId });
    response.json({ success: true, requestId: `req_${Math.random().toString(36).substring(2, 9)}` });
  } catch (err) {
    response.status(403).json({ error: "Unauthorized to reject application", requestId: `req_${Math.random().toString(36).substring(2, 9)}` });
  }
});

router.get("/:networkId/audit", async (request, response) => {
  const actorId = request.userContext?.id || "user_me";
  try {
    await requireAdminOrOwner(request.params.networkId, actorId);
    const logs = await allQuery<any>(
      "SELECT * FROM audit_logs WHERE metadata LIKE ? ORDER BY createdAt DESC LIMIT 100",
      [`%"networkId":"${request.params.networkId}"%`]
    );
    // Ensure we don't accidentally leak sensitive stuff if they somehow got in
    const safeLogs = logs.map(log => {
      const meta = JSON.parse(log.metadata || "{}");
      delete meta.bio;
      delete meta.privateNote;
      delete meta.password;
      delete meta.token;
      return { ...log, metadata: JSON.stringify(meta) };
    });
    response.json(safeLogs);
  } catch (err) {
    response.status(403).json({ error: "Unauthorized to view audit logs" });
  }
});

export default router;
