import { Router } from "express";
import { runQuery } from "../db/db";

const router = Router();

router.patch("/:categoryId", async (request, response) => {
  const { name } = request.body;
  try {
    await runQuery(
      `UPDATE network_categories SET name = COALESCE(?, name) WHERE id = ?`,
      [name ?? null, request.params.categoryId]
    );
    response.json({ success: true });
  } catch (err) {
    response.status(500).json({ error: "Failed to update category." });
  }
});

router.delete("/:categoryId", async (request, response) => {
  try {
    await runQuery(
      "UPDATE network_categories SET deletedAt = ? WHERE id = ?", 
      [new Date().toISOString(), request.params.categoryId]
    );
    response.json({ success: true });
  } catch (err) {
    response.status(500).json({ error: "Failed to delete category." });
  }
});

export default router;
