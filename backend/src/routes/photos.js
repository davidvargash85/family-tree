import { Router } from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import multer from "multer";
import { prisma } from "../db.js";
import { authMiddleware } from "../middleware/auth.js";
import { requireEditor } from "../middleware/treeAccess.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, "..", "..", "uploads", "trees");
try {
  fs.mkdirSync(uploadsDir, { recursive: true });
} catch (_) {}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(uploadsDir, req.params.treeId, "members", req.params.memberId);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = (file.originalname && path.extname(file.originalname)) || ".jpg";
    const safe = ext.toLowerCase().match(/\.(jpe?g|png|gif|webp)$/) ? ext : ".jpg";
    cb(null, `photo${safe}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /^image\/(jpeg|jpg|png|gif|webp)$/i.test(file.mimetype);
    cb(null, ok);
  },
});

export const photosRouter = Router();
photosRouter.use(authMiddleware);

photosRouter.post(
  "/:treeId/members/:memberId/photo",
  requireEditor(),
  upload.single("photo"),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    const member = await prisma.member.findFirst({
      where: {
        id: req.params.memberId,
        treeId: req.params.treeId,
      },
    });
    if (!member) return res.status(404).json({ error: "Member not found" });
    const relativePath = `/uploads/trees/${req.params.treeId}/members/${req.params.memberId}/${req.file.filename}`;
    await prisma.member.update({
      where: { id: req.params.memberId },
      data: { photoUrl: relativePath },
    });
    return res.json({ photoUrl: relativePath });
  }
);

photosRouter.delete("/:treeId/members/:memberId/photo", requireEditor(), async (req, res) => {
  const member = await prisma.member.findFirst({
    where: {
      id: req.params.memberId,
      treeId: req.params.treeId,
    },
  });
  if (!member) return res.status(404).json({ error: "Member not found" });
  if (member.photoUrl) {
    const fullPath = path.join(__dirname, "..", "..", member.photoUrl);
    try {
      fs.unlinkSync(fullPath);
    } catch (_) {}
  }
  await prisma.member.update({
    where: { id: req.params.memberId },
    data: { photoUrl: null },
  });
  return res.status(204).send();
});
