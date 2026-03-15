import { Router } from "express";
import multer from "multer";
import { prisma } from "../db.js";
import { authMiddleware } from "../middleware/auth.js";
import { requireTreeAccess, requireEditor } from "../middleware/treeAccess.js";
import { processAndSave, deletePhotoFiles } from "../services/imageStorage.js";

const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /^image\/(jpeg|jpg|png|gif|webp)$/i.test(file.mimetype);
    cb(null, ok);
  },
});

export const treePhotosRouter = Router();
treePhotosRouter.use(authMiddleware);

function tagsInclude() {
  return {
    tags: {
      include: {
        member: { select: { id: true, name: true } },
      },
    },
  };
}

function toPhotoResponse(photo) {
  return {
    id: photo.id,
    filePath: photo.filePath,
    caption: photo.caption,
    createdAt: photo.createdAt,
    tags: photo.tags.map((t) => ({ memberId: t.memberId, member: t.member })),
  };
}

treePhotosRouter.get(
  "/:treeId/photos",
  requireTreeAccess("viewer"),
  async (req, res) => {
    const photos = await prisma.photo.findMany({
      where: { treeId: req.params.treeId },
      orderBy: { createdAt: "desc" },
      include: tagsInclude(),
    });
    return res.json({ photos: photos.map(toPhotoResponse) });
  }
);

treePhotosRouter.get(
  "/:treeId/photos/:photoId",
  requireTreeAccess("viewer"),
  async (req, res) => {
    const photo = await prisma.photo.findFirst({
      where: { id: req.params.photoId, treeId: req.params.treeId },
      include: tagsInclude(),
    });
    if (!photo) return res.status(404).json({ error: "Photo not found" });
    return res.json({ photo: toPhotoResponse(photo) });
  }
);

treePhotosRouter.post(
  "/:treeId/photos",
  requireEditor,
  memoryUpload.single("photo"),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    const treeId = req.params.treeId;
    const caption = typeof req.body.caption === "string" ? req.body.caption.trim() || null : null;
    const created = await prisma.photo.create({
      data: { treeId, filePath: "/temp", caption },
      include: tagsInclude(),
    });
    const id = created.id;
    try {
      const { filePath } = await processAndSave(req.file.buffer, {
        treeId,
        id,
        type: "photo",
      });
      const photo = await prisma.photo.update({
        where: { id },
        data: { filePath },
        include: tagsInclude(),
      });
      return res.status(201).json({ photo: toPhotoResponse(photo) });
    } catch (err) {
      await prisma.photo.delete({ where: { id } });
      throw err;
    }
  }
);

treePhotosRouter.patch(
  "/:treeId/photos/:photoId",
  requireEditor,
  async (req, res) => {
    const caption = typeof req.body.caption === "string" ? req.body.caption.trim() || null : null;
    const photo = await prisma.photo.findFirst({
      where: { id: req.params.photoId, treeId: req.params.treeId },
    });
    if (!photo) return res.status(404).json({ error: "Photo not found" });
    const updated = await prisma.photo.update({
      where: { id: photo.id },
      data: { caption: caption ?? undefined },
      include: tagsInclude(),
    });
    return res.json({ photo: toPhotoResponse(updated) });
  }
);

treePhotosRouter.delete(
  "/:treeId/photos/:photoId",
  requireEditor,
  async (req, res) => {
    const photo = await prisma.photo.findFirst({
      where: { id: req.params.photoId, treeId: req.params.treeId },
    });
    if (!photo) return res.status(404).json({ error: "Photo not found" });
    deletePhotoFiles(photo.filePath);
    await prisma.photo.delete({ where: { id: photo.id } });
    return res.status(204).send();
  }
);

treePhotosRouter.post(
  "/:treeId/photos/:photoId/tags",
  requireEditor,
  async (req, res) => {
    const { memberId } = req.body;
    if (!memberId || typeof memberId !== "string") {
      return res.status(400).json({ error: "memberId required" });
    }
    const photo = await prisma.photo.findFirst({
      where: { id: req.params.photoId, treeId: req.params.treeId },
    });
    if (!photo) return res.status(404).json({ error: "Photo not found" });
    const member = await prisma.member.findFirst({
      where: { id: memberId, treeId: req.params.treeId },
    });
    if (!member) return res.status(404).json({ error: "Member not found" });
    await prisma.photoTag.upsert({
      where: {
        photoId_memberId: { photoId: photo.id, memberId: member.id },
      },
      create: { photoId: photo.id, memberId: member.id },
      update: {},
    });
    const updated = await prisma.photo.findUnique({
      where: { id: photo.id },
      include: tagsInclude(),
    });
    return res.json({
      tags: updated.tags.map((t) => ({ memberId: t.memberId, member: t.member })),
    });
  }
);

treePhotosRouter.delete(
  "/:treeId/photos/:photoId/tags/:memberId",
  requireEditor,
  async (req, res) => {
    const photo = await prisma.photo.findFirst({
      where: { id: req.params.photoId, treeId: req.params.treeId },
    });
    if (!photo) return res.status(404).json({ error: "Photo not found" });
    await prisma.photoTag.deleteMany({
      where: {
        photoId: photo.id,
        memberId: req.params.memberId,
      },
    });
    return res.status(204).send();
  }
);
