import http from "http";
import express from "express";
import { Server as SocketServer } from "socket.io";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { authRouter } from "./routes/auth.js";
import { setupSocket } from "./socket.js";
import { treesRouter } from "./routes/trees.js";
import { membersRouter } from "./routes/members.js";
import { relationshipsRouter } from "./routes/relationships.js";
import { invitationsRouter } from "./routes/invitations.js";
import { photosRouter } from "./routes/photos.js";
import { treePhotosRouter } from "./routes/treePhotos.js";
import { publicationsRouter } from "./routes/publications.js";
import { commentsRouter } from "./routes/comments.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

function log(level, msg, meta = {}) {
  const ts = new Date().toISOString();
  const metaStr = Object.keys(meta).length ? " " + JSON.stringify(meta) : "";
  console.log(`${ts} [${level}] ${msg}${metaStr}`);
}

app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173", credentials: true }));
app.use(express.json());

app.use((req, res, next) => {
  const start = Date.now();
  const body = req.body && Object.keys(req.body).length ? req.body : undefined;
  log("request", `${req.method} ${req.originalUrl}`, body ? { body } : {});
  res.on("finish", () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info";
    log(level, `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
  });
  next();
});

app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

app.use("/auth", authRouter);
app.use("/trees", treesRouter);
app.use("/trees", membersRouter);
app.use("/trees", relationshipsRouter);
app.use("/trees", photosRouter);
app.use("/trees", treePhotosRouter);
app.use("/trees", publicationsRouter);
app.use("/trees/:treeId/publications/:publicationId/comments", commentsRouter);
app.use("/invitations", invitationsRouter);

app.get("/health", (req, res) => res.json({ ok: true }));

app.use((err, req, res, next) => {
  log("error", err.message || "Unhandled error", {
    stack: err.stack,
    path: req.originalUrl,
    method: req.method,
  });
  if (!res.headersSent) {
    res.status(500).json({ error: "Internal server error" });
  }
});

process.on("unhandledRejection", (reason, promise) => {
  log("error", "Unhandled promise rejection", { reason, stack: reason?.stack });
});

const server = http.createServer(app);
const io = new SocketServer(server, {
  cors: { origin: process.env.FRONTEND_URL || "http://localhost:5173", credentials: true },
});
setupSocket(io);
app.set("io", io);

server.listen(PORT, () => log("info", `Server running on http://localhost:${PORT}`));
