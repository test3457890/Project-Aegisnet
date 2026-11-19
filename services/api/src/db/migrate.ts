import { db, runQuery, execQuery, getQuery, allQuery } from "./db";

export async function migrateDb() {
  await execQuery(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      appliedAt TEXT NOT NULL
    );
  `);

  const rows = await allQuery<{ version: number }>("SELECT version FROM schema_migrations");
  const appliedVersions = new Set(rows.map((r) => r.version));

  console.log(`[AegisNet API] Found ${appliedVersions.size} applied migrations.`);

  const migrations = [
    {
      version: 1,
      up: async () => {
        await execQuery(`
          PRAGMA foreign_keys = ON;
          PRAGMA busy_timeout = 5000;
          PRAGMA journal_mode = WAL;

          CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            initials TEXT,
            avatarColor TEXT,
            status TEXT,
            trustStatus TEXT,
            presence TEXT,
            role TEXT,
            createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE IF NOT EXISTS networks (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            icon TEXT,
            color TEXT,
            initials TEXT,
            ownerId TEXT,
            sortOrder INTEGER NOT NULL DEFAULT 0,
            createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (ownerId) REFERENCES users(id)
          );

          CREATE TABLE IF NOT EXISTS network_members (
            networkId TEXT NOT NULL,
            userId TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'member',
            PRIMARY KEY (networkId, userId),
            FOREIGN KEY (networkId) REFERENCES networks(id) ON DELETE CASCADE,
            FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
          );

          CREATE TABLE IF NOT EXISTS network_categories (
            id TEXT PRIMARY KEY,
            networkId TEXT NOT NULL,
            name TEXT NOT NULL,
            sortOrder INTEGER NOT NULL DEFAULT 0,
            createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (networkId) REFERENCES networks(id) ON DELETE CASCADE
          );

          CREATE TABLE IF NOT EXISTS rooms (
            id TEXT PRIMARY KEY,
            networkId TEXT NOT NULL,
            categoryId TEXT,
            name TEXT NOT NULL,
            icon TEXT,
            type TEXT NOT NULL DEFAULT 'text',
            sortOrder INTEGER NOT NULL DEFAULT 0,
            archived INTEGER NOT NULL DEFAULT 0,
            unread INTEGER NOT NULL DEFAULT 0,
            createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (networkId) REFERENCES networks(id) ON DELETE CASCADE,
            FOREIGN KEY (categoryId) REFERENCES network_categories(id) ON DELETE SET NULL
          );

          CREATE TABLE IF NOT EXISTS chats (
            id TEXT PRIMARY KEY,
            type TEXT NOT NULL CHECK(type IN ('direct', 'group')),
            name TEXT,
            ownerId TEXT,
            createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (ownerId) REFERENCES users(id)
          );

          CREATE TABLE IF NOT EXISTS chat_members (
            chatId TEXT NOT NULL,
            userId TEXT NOT NULL,
            PRIMARY KEY (chatId, userId),
            FOREIGN KEY (chatId) REFERENCES chats(id) ON DELETE CASCADE,
            FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
          );

          CREATE TABLE IF NOT EXISTS group_chats (
            id TEXT PRIMARY KEY,
            name TEXT,
            createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE IF NOT EXISTS group_chat_members (
            chatId TEXT NOT NULL,
            userId TEXT NOT NULL,
            PRIMARY KEY (chatId, userId),
            FOREIGN KEY (chatId) REFERENCES group_chats(id),
            FOREIGN KEY (userId) REFERENCES users(id)
          );

          CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            clientId TEXT,
            chatId TEXT NOT NULL,
            senderId TEXT NOT NULL,
            body TEXT,
            messageType TEXT NOT NULL DEFAULT 'text',
            deliveryStatus TEXT NOT NULL DEFAULT 'delivered',
            expiresAt TEXT,
            createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (senderId) REFERENCES users(id)
          );

          CREATE TABLE IF NOT EXISTS message_attachments (
            id TEXT PRIMARY KEY,
            messageId TEXT NOT NULL,
            fileId TEXT,
            type TEXT,
            url TEXT,
            fileName TEXT,
            size INTEGER,
            mimeType TEXT,
            storageId TEXT,
            thumbnailUrl TEXT,
            FOREIGN KEY (messageId) REFERENCES messages(id) ON DELETE CASCADE,
            FOREIGN KEY (fileId) REFERENCES files(id) ON DELETE SET NULL
          );

          CREATE TABLE IF NOT EXISTS files (
            id TEXT PRIMARY KEY,
            originalName TEXT NOT NULL,
            storedName TEXT,
            mimeType TEXT NOT NULL,
            size INTEGER NOT NULL DEFAULT 0,
            uploadedBy TEXT,
            uploadedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            accessLevel TEXT,
            safeUrl TEXT,
            hash TEXT,
            storageScope TEXT NOT NULL DEFAULT 'api-local',
            clientStorageId TEXT,
            clientEncrypted INTEGER NOT NULL DEFAULT 0,
            sourceTargetId TEXT,
            thumbnailUrl TEXT,
            mockEncrypted INTEGER NOT NULL DEFAULT 0,
            downloadRestricted INTEGER NOT NULL DEFAULT 0,
            FOREIGN KEY (uploadedBy) REFERENCES users(id)
          );

          CREATE TABLE IF NOT EXISTS devices (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            ownerId TEXT NOT NULL,
            trustLevel TEXT NOT NULL DEFAULT 'unverified',
            lastSeen TEXT,
            createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (ownerId) REFERENCES users(id) ON DELETE CASCADE
          );

          CREATE TABLE IF NOT EXISTS call_sessions (
            id TEXT PRIMARY KEY,
            callerId TEXT NOT NULL,
            receiverId TEXT,
            roomId TEXT,
            chatId TEXT,
            mode TEXT NOT NULL DEFAULT 'voice',
            state TEXT NOT NULL,
            startedAt TEXT NOT NULL,
            updatedAt TEXT NOT NULL,
            endedAt TEXT,
            FOREIGN KEY (callerId) REFERENCES users(id)
          );

          CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_client_id ON messages(clientId) WHERE clientId IS NOT NULL;
          CREATE INDEX IF NOT EXISTS idx_messages_chat_created ON messages(chatId, createdAt);
          CREATE INDEX IF NOT EXISTS idx_rooms_network ON rooms(networkId, sortOrder);
          CREATE INDEX IF NOT EXISTS idx_categories_network ON network_categories(networkId, sortOrder);
          CREATE INDEX IF NOT EXISTS idx_files_uploaded ON files(uploadedAt DESC);
        `);
      },
    },
    {
      version: 2,
      up: async () => {
        // Sprint 2 Schema Additions
        await execQuery(`
          CREATE TABLE IF NOT EXISTS invitations (
            id TEXT PRIMARY KEY,
            inviteCode TEXT UNIQUE NOT NULL,
            targetType TEXT NOT NULL,
            targetId TEXT NOT NULL,
            createdBy TEXT NOT NULL,
            createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            expiresAt TEXT,
            maxUses INTEGER,
            usedCount INTEGER NOT NULL DEFAULT 0,
            status TEXT NOT NULL DEFAULT 'active',
            FOREIGN KEY (createdBy) REFERENCES users(id)
          );

          CREATE TABLE IF NOT EXISTS user_read_states (
            userId TEXT NOT NULL,
            targetId TEXT NOT NULL,
            lastReadMessageId TEXT,
            lastReadAt TEXT,
            unreadCount INTEGER NOT NULL DEFAULT 0,
            PRIMARY KEY (userId, targetId)
          );

          CREATE TABLE IF NOT EXISTS offline_sync_queue (
            id TEXT PRIMARY KEY,
            actionType TEXT NOT NULL,
            payload TEXT NOT NULL,
            createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            status TEXT NOT NULL DEFAULT 'pending'
          );
        `);

        // Helper to add column safely
        const ensureColumn = async (table: string, column: string, definition: string) => {
          const columns = await allQuery<{ name: string }>(`PRAGMA table_info(${table})`);
          if (!columns.some((item) => item.name === column)) {
            await execQuery(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
          }
        };

        await ensureColumn("networks", "deletedAt", "TEXT");
        await ensureColumn("networks", "privacyMode", "TEXT");
        await ensureColumn("rooms", "deletedAt", "TEXT");
        await ensureColumn("rooms", "privacyMode", "TEXT");
        await ensureColumn("chats", "deletedAt", "TEXT");
        await ensureColumn("chats", "archivedAt", "TEXT");
        await ensureColumn("network_categories", "deletedAt", "TEXT");
        await ensureColumn("files", "deletedAt", "TEXT");
      },
    },
    {
      version: 3,
      up: async () => {
        // Admin Center Backend
        await execQuery(`
          CREATE TABLE IF NOT EXISTS audit_logs (
            id TEXT PRIMARY KEY,
            action TEXT NOT NULL,
            actorId TEXT NOT NULL,
            targetId TEXT,
            metadata TEXT,
            createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE IF NOT EXISTS support_tickets (
            id TEXT PRIMARY KEY,
            userId TEXT NOT NULL,
            summary TEXT NOT NULL,
            description TEXT,
            status TEXT NOT NULL DEFAULT 'open',
            createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
          );
        `);
      },
    },
    {
      version: 4,
      up: async () => {
        const ensureColumn = async (table: string, column: string, definition: string) => {
          const columns = await allQuery<{ name: string }>(`PRAGMA table_info(${table})`);
          if (!columns.some((item) => item.name === column)) {
            await execQuery(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
          }
        };

        await ensureColumn("users", "bio", "TEXT");
        await ensureColumn("users", "username", "TEXT");
        
        await ensureColumn("network_members", "displayName", "TEXT");
        await ensureColumn("network_members", "avatarColor", "TEXT");
        await ensureColumn("network_members", "timeoutUntil", "TEXT");

        await ensureColumn("invitations", "requireApproval", "INTEGER NOT NULL DEFAULT 0");

        await execQuery(`
          CREATE TABLE IF NOT EXISTS network_bans (
            id TEXT PRIMARY KEY,
            networkId TEXT NOT NULL,
            userId TEXT NOT NULL,
            reason TEXT,
            bannedBy TEXT,
            createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (networkId) REFERENCES networks(id) ON DELETE CASCADE,
            FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
          );

          CREATE TABLE IF NOT EXISTS network_roles (
            id TEXT PRIMARY KEY,
            networkId TEXT NOT NULL,
            name TEXT NOT NULL,
            color TEXT,
            permissions TEXT,
            createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (networkId) REFERENCES networks(id) ON DELETE CASCADE
          );

          CREATE TABLE IF NOT EXISTS network_member_roles (
            networkId TEXT NOT NULL,
            userId TEXT NOT NULL,
            roleId TEXT NOT NULL,
            PRIMARY KEY(networkId, userId, roleId),
            FOREIGN KEY (networkId) REFERENCES networks(id) ON DELETE CASCADE,
            FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (roleId) REFERENCES network_roles(id) ON DELETE CASCADE
          );

          CREATE TABLE IF NOT EXISTS join_applications (
            id TEXT PRIMARY KEY,
            networkId TEXT NOT NULL,
            userId TEXT NOT NULL,
            inviteId TEXT,
            status TEXT NOT NULL DEFAULT 'pending',
            createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (networkId) REFERENCES networks(id) ON DELETE CASCADE,
            FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (inviteId) REFERENCES invitations(id) ON DELETE SET NULL
          );

          CREATE TABLE IF NOT EXISTS trusted_contacts (
            userId TEXT NOT NULL,
            targetId TEXT NOT NULL,
            trustLevel TEXT NOT NULL,
            reason TEXT,
            lastReviewedAt TEXT,
            PRIMARY KEY(userId, targetId),
            FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (targetId) REFERENCES users(id) ON DELETE CASCADE
          );
        `);
      },
    },
  ];

  for (const migration of migrations) {
    if (!appliedVersions.has(migration.version)) {
      console.log(`[AegisNet API] Applying migration v${migration.version}...`);
      await migration.up();
      await runQuery(
        "INSERT INTO schema_migrations (version, appliedAt) VALUES (?, ?)",
        [migration.version, new Date().toISOString()]
      );
      console.log(`[AegisNet API] Migration v${migration.version} applied.`);
    }
  }

  console.log("[AegisNet API] Database schema is up to date.");
}

if (require.main === module) {
  migrateDb()
    .then(() => {
      console.log("Migration complete.");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Migration failed:", error);
      process.exit(1);
    });
}
