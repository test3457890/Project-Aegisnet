import { closeDb, DB_PATH } from "./db";
import fs from "fs";

async function resetDb() {
  await closeDb();

  // Give Windows a moment to release the file lock
  await new Promise((resolve) => setTimeout(resolve, 500));

  if (DB_PATH !== ":memory:" && fs.existsSync(DB_PATH)) {
    try {
      fs.unlinkSync(DB_PATH);
      console.log(`[AegisNet API] Deleted ${DB_PATH}.`);
      if (fs.existsSync(DB_PATH + "-wal")) fs.unlinkSync(DB_PATH + "-wal");
      if (fs.existsSync(DB_PATH + "-shm")) fs.unlinkSync(DB_PATH + "-shm");
    } catch (e) {
      console.log(`[AegisNet API] Warning: could not delete DB files.`, e);
    }
  }

  console.log("[AegisNet API] Database reset complete.");
}

if (require.main === module) {
  resetDb().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
