import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { authRouter } from "./routes/auth.js";
import { treesRouter } from "./routes/trees.js";
import { membersRouter } from "./routes/members.js";
import { relationshipsRouter } from "./routes/relationships.js";
import { invitationsRouter } from "./routes/invitations.js";
import { photosRouter } from "./routes/photos.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173", credentials: true }));
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

app.use("/auth", authRouter);
app.use("/trees", treesRouter);
app.use("/trees", membersRouter);
app.use("/trees", relationshipsRouter);
app.use("/trees", photosRouter);
app.use("/invitations", invitationsRouter);

app.get("/health", (req, res) => res.json({ ok: true }));

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
