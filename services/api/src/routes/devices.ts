import { Router } from "express";
import { allQuery, getQuery } from "../db/db";

const router = Router();

router.get("/", async (_request, response) => {
  try {
    response.json(await allQuery("SELECT * FROM devices ORDER BY ownerId, name"));
  } catch {
    response.status(500).json({ error: "Failed to fetch prototype devices." });
  }
});

router.get("/:deviceId", async (request, response) => {
  try {
    const device = await getQuery("SELECT * FROM devices WHERE id = ?", [request.params.deviceId]);
    if (!device) {
      response.status(404).json({ error: "Device not found." });
      return;
    }
    response.json(device);
  } catch {
    response.status(500).json({ error: "Failed to fetch prototype device." });
  }
});

export default router;
