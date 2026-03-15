import { Router } from "express";
import multer from "multer";
import { prisma } from "../db.js";
import { authMiddleware } from "../middleware/auth.js";
import { requireEditor } from "../middleware/treeAccess.js";
import { processAndSave, deletePhotoFiles } from "../services/imageStorage.js";

const memoryUpload = multer({
  storage: multer.memoryStorage(),
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
  requireEditor,
  memoryUpload.single("photo"),
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
    const treeId = req.params.treeId;
    const memberId = req.params.memberId;
    const { filePath } = await processAndSave(req.file.buffer, {
      treeId,
      id: memberId,
      type: "member",
    });
    await prisma.member.update({
      where: { id: memberId },
      data: { photoUrl: filePath },
    });
    return res.json({ photoUrl: filePath });
  }
);

photosRouter.delete("/:treeId/members/:memberId/photo", requireEditor, async (req, res) => {
  const member = await prisma.member.findFirst({
    where: {
      id: req.params.memberId,
      treeId: req.params.treeId,
    },
  });
  if (!member) return res.status(404).json({ error: "Member not found" });
  if (member.photoUrl) {
    deletePhotoFiles(member.photoUrl);
  }
  await prisma.member.update({
    where: { id: req.params.memberId },
    data: { photoUrl: null },
  });
  return res.status(204).send();
});
