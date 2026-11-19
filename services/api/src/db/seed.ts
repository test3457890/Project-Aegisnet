import { closeDb, getQuery, initDb, runQuery } from "./db";

const SEEDED_AT = "2026-06-08T12:00:00.000Z";

const users = [
  ["user_me", "Alex", "AL", "bg-blue-700", "online", "prototype", "active", "You"],
  ["user_sarah", "Sarah Connor", "SC", "bg-emerald-800", "online", "prototype", "active", "Trusted contact"],
  ["user_david", "David Kim", "DK", "bg-cyan-800", "online", "prototype", "active", "Friend"],
  ["user_keira", "Keira Walsh", "KW", "bg-pink-800", "away", "prototype", "away", "Friend"],
  ["user_mom", "Mom", "MO", "bg-orange-800", "online", "prototype", "active", "Family"],
  ["user_john", "John Smith", "JS", "bg-amber-800", "away", "prototype", "away", "Family"],
  ["user_elena", "Elena Rostova", "ER", "bg-purple-800", "offline", "prototype", "offline", "Friend"],
  ["user_marcus", "Marcus Wright", "MW", "bg-rose-800", "busy", "prototype", "busy", "Hiking coordinator"],
];

const networks = [
  ["net_family", "Family Network", "Family messages, plans, media, and safety check-ins.", "Home", "bg-indigo-600", "FAM", 0],
  ["net_roadtrip", "Road Trip Network", "Planning, routes, stays, food stops, and shared files.", "Map", "bg-rose-600", "RT", 1],
  ["net_hiking", "Hiking Club Network", "Trail plans, gear, photos, and safety check-ins.", "Compass", "bg-emerald-600", "HC", 2],
  ["net_neighborhood", "Neighborhood Network", "Local updates and practical community coordination.", "Users", "bg-amber-600", "NBH", 3],
  ["net_school", "School Group Network", "School announcements, plans, and shared information.", "BookOpen", "bg-blue-600", "SCH", 4],
  ["net_cyber", "Cyber Team Network", "Technical coordination and shared workspace.", "Shield", "bg-purple-600", "CYB", 5],
  ["net_sar", "SAR Training Network", "Optional training and Mission Mode practice spaces.", "Radio", "bg-slate-700", "SAR", 6],
];

const categories = [
  ["cat_family_important", "net_family", "Important", 0],
  ["cat_family_plans", "net_family", "Plans", 1],
  ["cat_family_media", "net_family", "Media", 2],
  ["cat_family_safety", "net_family", "Safety", 3],
  ["cat_roadtrip_rooms", "net_roadtrip", "Trip Planning", 0],
  ["cat_hiking_club", "net_hiking", "Club", 0],
  ["cat_hiking_trips", "net_hiking", "Trips", 1],
  ["cat_hiking_media", "net_hiking", "Media", 2],
  ["cat_hiking_safety", "net_hiking", "Safety", 3],
  ["cat_neighborhood_rooms", "net_neighborhood", "Rooms", 0],
  ["cat_school_rooms", "net_school", "Rooms", 0],
  ["cat_cyber_rooms", "net_cyber", "Rooms", 0],
  ["cat_sar_operations", "net_sar", "Operations", 0],
  ["cat_sar_live", "net_sar", "Live Spaces", 1],
  ["cat_sar_secure", "net_sar", "Shared Resources", 2],
];

const rooms = [
  ["room_fam_announcements", "net_family", "cat_family_important", "Announcements", "Bell", "announcement", 0],
  ["room_fam_chat", "net_family", "cat_family_important", "Family Chat", "Hash", "text", 1],
  ["room_fam_weekend", "net_family", "cat_family_plans", "Weekend Plans", "Calendar", "text", 0],
  ["room_fam_roadtrip", "net_family", "cat_family_plans", "Road Trip", "Map", "text", 1],
  ["room_fam_photos", "net_family", "cat_family_media", "Photos", "Image", "text", 0],
  ["room_fam_files", "net_family", "cat_family_media", "Files", "FolderLock", "vault", 1],
  ["room_fam_checkins", "net_family", "cat_family_safety", "Check-ins", "CheckCircle", "check-in", 0],
  ["room_fam_trusted", "net_family", "cat_family_safety", "Trusted Contacts", "Users", "text", 1],
  ["room_rt_planning", "net_roadtrip", "cat_roadtrip_rooms", "Planning", "Hash", "text", 0],
  ["room_rt_route", "net_roadtrip", "cat_roadtrip_rooms", "Route", "Map", "planning", 1],
  ["room_rt_hotels", "net_roadtrip", "cat_roadtrip_rooms", "Hotels", "Home", "text", 2],
  ["room_rt_food", "net_roadtrip", "cat_roadtrip_rooms", "Food Stops", "MapPin", "text", 3],
  ["room_rt_photos", "net_roadtrip", "cat_roadtrip_rooms", "Photos", "Image", "text", 4],
  ["room_rt_files", "net_roadtrip", "cat_roadtrip_rooms", "Files", "FolderLock", "vault", 5],
  ["room_hc_general", "net_hiking", "cat_hiking_club", "General", "Hash", "text", 0],
  ["room_hc_announcements", "net_hiking", "cat_hiking_club", "Announcements", "Bell", "announcement", 1],
  ["room_hc_trails", "net_hiking", "cat_hiking_trips", "Trail Plans", "Map", "planning", 0],
  ["room_hc_gear", "net_hiking", "cat_hiking_trips", "Gear", "Backpack", "text", 1],
  ["room_hc_weather", "net_hiking", "cat_hiking_trips", "Weather", "CloudSun", "text", 2],
  ["room_hc_photos", "net_hiking", "cat_hiking_media", "Photos", "Image", "text", 0],
  ["room_hc_files", "net_hiking", "cat_hiking_media", "Files", "FolderLock", "vault", 1],
  ["room_hc_checkins", "net_hiking", "cat_hiking_safety", "Safety Check-ins", "CheckCircle", "check-in", 0],
  ["room_hc_emergency", "net_hiking", "cat_hiking_safety", "Emergency Plan", "Shield", "text", 1],
  ["room_nbh_general", "net_neighborhood", "cat_neighborhood_rooms", "General Chat", "Hash", "text", 0],
  ["room_school_announcements", "net_school", "cat_school_rooms", "Announcements", "Bell", "announcement", 0],
  ["room_cyber_general", "net_cyber", "cat_cyber_rooms", "General", "Hash", "text", 0],
  ["room_sar_briefing", "net_sar", "cat_sar_operations", "Briefing", "Hash", "text", 0],
  ["room_sar_radio", "net_sar", "cat_sar_operations", "Radio Practice", "Radio", "text", 1],
  ["room_sar_training", "net_sar", "cat_sar_operations", "Training Plan", "Clipboard", "planning", 2],
  ["room_sar_voice", "net_sar", "cat_sar_live", "Voice Net", "Phone", "voice", 0],
  ["room_sar_video", "net_sar", "cat_sar_live", "Video Briefing", "Video", "video", 1],
  ["room_sar_mission", "net_sar", "cat_sar_live", "Mission Room", "Map", "mission", 2],
  ["room_sar_vault", "net_sar", "cat_sar_secure", "File Vault", "FolderLock", "vault", 0],
  ["room_sar_roster", "net_sar", "cat_sar_secure", "Roster", "Users", "text", 1],
  ["room_sar_checkins", "net_sar", "cat_sar_secure", "Check-ins", "CheckCircle", "check-in", 2],
];

const chats = [
  ["chat_sarah", "direct", "Sarah Connor", "user_me", ["user_me", "user_sarah"]],
  ["chat_david", "direct", "David Kim", "user_me", ["user_me", "user_david"]],
  ["chat_keira", "direct", "Keira Walsh", "user_me", ["user_me", "user_keira"]],
  ["chat_mom", "direct", "Mom", "user_me", ["user_me", "user_mom"]],
  ["chat_family", "group", "Family Group", "user_me", ["user_me", "user_john", "user_elena", "user_mom"]],
  ["chat_roadtrip", "group", "Road Trip Group", "user_me", ["user_me", "user_sarah", "user_marcus"]],
  ["chat_hiking", "group", "Hiking Club Group", "user_me", ["user_me", "user_john", "user_marcus", "user_elena"]],
  ["chat_weekend", "group", "Weekend Plans", "user_me", ["user_me", "user_david", "user_keira"]],
  ["chat_neighborhood", "group", "Neighborhood Group", "user_me", ["user_me", "user_sarah"]],
  ["chat_school", "group", "School Group", "user_me", ["user_me", "user_elena"]],
] as const;

const messages = [
  ["msg_seed_sarah_1", "chat_sarah", "user_sarah", "Are you near the meeting point? Traffic is bad.", "2026-06-08T10:42:00.000Z"],
  ["msg_seed_sarah_2", "chat_sarah", "user_me", "Yes, I'm already here. Take your time.", "2026-06-08T10:45:00.000Z"],
  ["msg_seed_david_1", "chat_david", "user_david", "Are we still on for tomorrow?", "2026-06-07T17:15:00.000Z"],
  ["msg_seed_family_1", "chat_family", "user_john", "Has anyone seen the car keys?", "2026-06-08T09:00:00.000Z"],
  ["msg_seed_family_2", "chat_family", "user_elena", "Check the kitchen counter.", "2026-06-08T09:05:00.000Z"],
  ["msg_seed_roadtrip_1", "chat_roadtrip", "user_sarah", "I added two hotel options near the halfway point.", "2026-06-08T09:14:00.000Z"],
  ["msg_seed_roadtrip_2", "chat_roadtrip", "user_marcus", "I'll bring the snacks and a cooler.", "2026-06-08T09:18:00.000Z"],
  ["msg_seed_hiking_1", "chat_hiking", "user_john", "Saturday's trail is about six miles. Bring extra water.", "2026-06-07T15:00:00.000Z"],
  ["msg_seed_room_family_1", "network:net_family:room:room_fam_chat", "user_mom", "Dinner is at six. Let me know if plans change.", "2026-06-08T11:00:00.000Z"],
  ["msg_seed_room_trip_1", "network:net_roadtrip:room:room_rt_planning", "user_sarah", "Let's leave before traffic starts on Friday.", "2026-06-08T11:15:00.000Z"],
  ["msg_seed_room_hiking_1", "network:net_hiking:room:room_hc_general", "user_marcus", "Trail conditions look good for Saturday.", "2026-06-08T11:30:00.000Z"],
];

const files = [
  ["file_seed_itinerary", "Road_Trip_Itinerary.pdf", "application/pdf", 2457600, "user_sarah", "Shared with Road Trip Group", "prototype-seed-itinerary"],
  ["file_seed_photo", "Trailhead_Group_Photo.jpg", "image/jpeg", 4198400, "user_john", "Shared with Hiking Club Group", "prototype-seed-photo"],
];

const devices = [
  ["device_me_1", "Alex's browser", "user_me", "prototype", "Just now"],
  ["device_sarah_1", "Sarah's phone", "user_sarah", "prototype", "2 minutes ago"],
];

export async function seedDb(options: { initialize?: boolean; close?: boolean } = {}) {
  if (options.initialize !== false) await initDb();

  for (const user of users) {
    await runQuery(
      `INSERT INTO users (id, name, initials, avatarColor, status, trustStatus, presence, role, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name=excluded.name, initials=excluded.initials, avatarColor=excluded.avatarColor,
         status=excluded.status, trustStatus=excluded.trustStatus, presence=excluded.presence, role=excluded.role`,
      [...user, SEEDED_AT],
    );
  }

  for (const [id, name, description, icon, color, initials, sortOrder] of networks) {
    await runQuery(
      `INSERT INTO networks (id, name, description, icon, color, initials, ownerId, sortOrder, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, 'user_me', ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name=excluded.name, description=excluded.description, icon=excluded.icon,
         color=excluded.color, initials=excluded.initials, sortOrder=excluded.sortOrder`,
      [id, name, description, icon, color, initials, sortOrder, SEEDED_AT],
    );
    for (const userId of ["user_me", "user_sarah", "user_david", "user_keira", "user_mom"]) {
      await runQuery(
        `INSERT OR IGNORE INTO network_members (networkId, userId, role) VALUES (?, ?, ?)`,
        [id, userId, userId === "user_me" ? "owner" : "member"],
      );
    }
  }

  for (const category of categories) {
    await runQuery(
      `INSERT INTO network_categories (id, networkId, name, sortOrder, createdAt)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET name=excluded.name, sortOrder=excluded.sortOrder`,
      [...category, SEEDED_AT],
    );
  }

  for (const room of rooms) {
    await runQuery(
      `INSERT INTO rooms (id, networkId, categoryId, name, icon, type, sortOrder, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         networkId=excluded.networkId, categoryId=excluded.categoryId, name=excluded.name,
         icon=excluded.icon, type=excluded.type, sortOrder=excluded.sortOrder`,
      [...room, SEEDED_AT],
    );
  }

  for (const [id, type, name, ownerId, members] of chats) {
    await runQuery(
      `INSERT INTO chats (id, type, name, ownerId, createdAt)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET type=excluded.type, name=excluded.name, ownerId=excluded.ownerId`,
      [id, type, name, ownerId, SEEDED_AT],
    );
    for (const userId of members) {
      await runQuery("INSERT OR IGNORE INTO chat_members (chatId, userId) VALUES (?, ?)", [id, userId]);
    }
  }

  for (const [id, chatId, senderId, body, createdAt] of messages) {
    const existing = await getQuery<{ id: string }>("SELECT id FROM messages WHERE id = ?", [id]);
    if (!existing) {
      await runQuery(
        `INSERT INTO messages
          (id, clientId, chatId, senderId, body, messageType, deliveryStatus, createdAt)
         VALUES (?, ?, ?, ?, ?, 'text', 'read', ?)`,
        [id, id, chatId, senderId, body, createdAt],
      );
    }
  }

  for (const [id, name, mimeType, size, uploadedBy, accessLevel, hash] of files) {
    await runQuery(
      `INSERT INTO files
        (id, originalName, mimeType, size, uploadedBy, uploadedAt, accessLevel, hash, storageScope)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'metadata-only')
       ON CONFLICT(id) DO UPDATE SET
         originalName=excluded.originalName, mimeType=excluded.mimeType, size=excluded.size,
         accessLevel=excluded.accessLevel, hash=excluded.hash`,
      [id, name, mimeType, size, uploadedBy, SEEDED_AT, accessLevel, hash],
    );
  }

  for (const device of devices) {
    await runQuery(
      `INSERT INTO devices (id, name, ownerId, trustLevel, lastSeen, createdAt)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET name=excluded.name, trustLevel=excluded.trustLevel, lastSeen=excluded.lastSeen`,
      [...device, SEEDED_AT],
    );
  }

  await runQuery(
    `INSERT INTO call_sessions
      (id, callerId, chatId, mode, state, startedAt, updatedAt)
     VALUES ('call_family_checkin', 'user_me', 'chat_family', 'video', 'ended', ?, ?)
     ON CONFLICT(id) DO NOTHING`,
    [SEEDED_AT, SEEDED_AT],
  );

  console.log("[AegisNet API] Deterministic prototype seed is ready.");
  if (options.close) await closeDb();
}

if (require.main === module) {
  seedDb({ close: true }).catch((error) => {
    console.error("[AegisNet API] Seed failed:", error);
    process.exitCode = 1;
  });
}
