import sqlite3 from "sqlite3";
import path from "path";
import fs from "fs";
import { config } from "dotenv";

config();

export const DB_PATH = process.env.DATABASE_URL || "./dev.db";
const resolvedDbPath = DB_PATH === ":memory:" ? DB_PATH : path.resolve(DB_PATH);

if (DB_PATH !== ":memory:") {
  fs.mkdirSync(path.dirname(resolvedDbPath), { recursive: true });
}

export const db = new sqlite3.Database(resolvedDbPath, (error) => {
  if (error) {
    console.error("[AegisNet API] Could not open SQLite:", error.message);
  } else {
    console.log(`[AegisNet API] SQLite ready at ${resolvedDbPath}.`);
  }
});

export interface QueryResult {
  lastID: number;
  changes: number;
}

export const runQuery = (sql: string, params: unknown[] = []): Promise<QueryResult> => (
  new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(error) {
      if (error) reject(error);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  })
);

export const execQuery = (sql: string): Promise<void> => (
  new Promise((resolve, reject) => {
    db.exec(sql, (error) => {
      if (error) reject(error);
      else resolve();
    });
  })
);

export const getQuery = <T>(sql: string, params: unknown[] = []): Promise<T | undefined> => (
  new Promise((resolve, reject) => {
    db.get(sql, params, (error, row) => {
      if (error) reject(error);
      else resolve(row as T | undefined);
    });
  })
);

export const allQuery = <T>(sql: string, params: unknown[] = []): Promise<T[]> => (
  new Promise((resolve, reject) => {
    db.all(sql, params, (error, rows) => {
      if (error) reject(error);
      else resolve(rows as T[]);
    });
  })
);

export const closeDb = (): Promise<void> => (
  new Promise((resolve, reject) => {
    db.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  })
);

async function ensureColumn(table: string, column: string, definition: string) {
  const columns = await allQuery<{ name: string }>(`PRAGMA table_info(${table})`);
  if (!columns.some((item) => item.name === column)) {
    await runQuery(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

import { migrateDb } from "./migrate";

export const initDb = async () => {
  await migrateDb();
};

