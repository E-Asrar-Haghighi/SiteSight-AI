import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import "dotenv/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("construction.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS photos (
    id TEXT PRIMARY KEY,
    imageData TEXT NOT NULL,
    mimeType TEXT NOT NULL,
    stage TEXT NOT NULL,
    insight TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    fileName TEXT NOT NULL
  )
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

  // API Routes
  app.get("/api/photos", (req, res) => {
    try {
      const photos = db.prepare("SELECT * FROM photos ORDER BY timestamp DESC").all();
      // Convert imageData to data URL for the frontend
      const formattedPhotos = photos.map((p: any) => ({
        ...p,
        url: `data:${p.mimeType};base64,${p.imageData}`
      }));
      res.json(formattedPhotos);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch photos" });
    }
  });

  app.post("/api/photos", (req, res) => {
    const { id, imageData, mimeType, stage, insight, timestamp, fileName } = req.body;
    try {
      const stmt = db.prepare(`
        INSERT INTO photos (id, imageData, mimeType, stage, insight, timestamp, fileName)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(id, imageData, mimeType, stage, insight, timestamp, fileName);
      res.status(201).json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to save photo" });
    }
  });

  app.delete("/api/photos/:id", (req, res) => {
    const { id } = req.params;
    try {
      db.prepare("DELETE FROM photos WHERE id = ?").run(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete photo" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);

    app.get("*", async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = fs.readFileSync(path.resolve(__dirname, "index.html"), "utf-8");
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
