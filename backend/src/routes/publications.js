import { Router } from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import multer from "multer";
import { prisma } from "../db.js";
import { authMiddleware } from "../middleware/auth.js";
import { requireTreeAccess, requireEditor } from "../middleware/treeAccess.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, "..", "..", "uploads", "trees");
try {
  fs.mkdirSync(uploadsDir, { recursive: true });
} catch (_) {}

const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /^image\/(jpeg|jpg|png|gif|webp)$/i.test(file.mimetype);
    cb(null, ok);
  },
});

export const publicationsRouter = Router();
publicationsRouter.use(authMiddleware);

function tagsInclude() {
  return {
    tags: {
      include: {
        member: { select: { id: true, name: true } },
      },
    },
  }
}

const createdByInclude = {
  createdBy: { select: { id: true, displayName: true, email: true } },
};

function toPublicationResponse(pub) {
  return {
    id: pub.id,
    treeId: pub.treeId,
    content: pub.content,
    photoId: pub.photoId,
    photo: pub.photo
      ? { id: pub.photo.id, filePath: pub.photo.filePath, caption: pub.photo.caption }
      : null,
    tags: (pub.tags || []).map((t) => ({ memberId: t.memberId, member: t.member })),
    createdAt: pub.createdAt,
    createdBy: pub.createdBy
      ? { id: pub.createdBy.id, displayName: pub.createdBy.displayName, email: pub.createdBy.email }
      : null,
  };
}

publicationsRouter.get(
  "/:treeId/publications",
  requireTreeAccess("viewer"),
  async (req, res) => {
    const list = await prisma.publication.findMany({
      where: { treeId: req.params.treeId },
      orderBy: [{ lastActivityAt: "desc" }, { createdAt: "desc" }],
      include: {
        photo: true,
        ...createdByInclude,
        ...tagsInclude(),
      },
    });
    return res.json({ publications: list.map(toPublicationResponse) });
  }
);

publicationsRouter.get(
  "/:treeId/publications/:publicationId",
  requireTreeAccess("viewer"),
  async (req, res) => {
    const pub = await prisma.publication.findFirst({
      where: { id: req.params.publicationId, treeId: req.params.treeId },
      include: { photo: true, ...createdByInclude, ...tagsInclude() },
    });
    if (!pub) return res.status(404).json({ error: "Publication not found" });
    return res.json({ publication: toPublicationResponse(pub) });
  }
);

function parseTagIds(body) {
  if (Array.isArray(body.tagIds)) return body.tagIds.filter((id) => typeof id === "string");
  if (typeof body.tagIds === "string") {
    return body.tagIds.trim()
      ? body.tagIds.split(",").map((s) => s.trim()).filter(Boolean)
      : [];
  }
  return [];
}

publicationsRouter.post(
  "/:treeId/publications",
  requireEditor,
  memoryUpload.single("photo"),
  async (req, res) => {
    const treeId = req.params.treeId;
    const content =
      typeof req.body.content === "string" ? req.body.content.trim() || null : null;
    const tagIds = parseTagIds(req.body);

    let photoId = null;
    if (req.file) {
      const ext = path.extname(req.file.originalname)?.toLowerCase() || ".jpg";
      const safeExt = /\.(jpe?g|png|gif|webp)$/.test(ext) ? ext : ".jpg";
      const photoCaption = typeof req.body.caption === "string" ? req.body.caption.trim() || null : content;
      const createdPhoto = await prisma.photo.create({
        data: { treeId, filePath: "/temp", caption: photoCaption },
      });
      const id = createdPhoto.id;
      const filename = `photo${safeExt}`;
      const relativePath = `/uploads/trees/${treeId}/photos/${id}/${filename}`;
      const dir = path.join(uploadsDir, treeId, "photos", id);
      try {
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, filename), req.file.buffer);
      } catch (err) {
        await prisma.photo.delete({ where: { id } });
        throw err;
      }
      await prisma.photo.update({
        where: { id },
        data: { filePath: relativePath },
      });
      photoId = id;
    }

    const publication = await prisma.publication.create({
      data: { treeId, content, photoId, createdById: req.user.id, lastActivityAt: new Date() },
      include: { photo: true, ...createdByInclude, ...tagsInclude() },
    });

    if (tagIds.length > 0) {
      const members = await prisma.member.findMany({
        where: { treeId, id: { in: tagIds } },
        select: { id: true },
      });
      const validIds = members.map((m) => m.id);
      await prisma.publicationTag.createMany({
        data: validIds.map((memberId) => ({
          publicationId: publication.id,
          memberId,
        })),
        skipDuplicates: true,
      });
    }

    const updated = await prisma.publication.findUnique({
      where: { id: publication.id },
      include: { photo: true, ...createdByInclude, ...tagsInclude() },
    });
    const payload = toPublicationResponse(updated);
    const io = req.app.get("io");
    if (io) io.to(`tree:${treeId}`).emit("publication:created", { publication: payload });
    return res.status(201).json({ publication: payload });
  }
);

publicationsRouter.patch(
  "/:treeId/publications/:publicationId",
  requireEditor,
  async (req, res) => {
    const content =
      typeof req.body.content === "string" ? req.body.content.trim() ?? undefined : undefined;
    const pub = await prisma.publication.findFirst({
      where: { id: req.params.publicationId, treeId: req.params.treeId },
      include: { ...createdByInclude },
    });
    if (!pub) return res.status(404).json({ error: "Publication not found" });
    if (pub.createdById !== req.user.id) {
      return res.status(403).json({ error: "Only the creator of this post can edit it" });
    }
    const updated = await prisma.publication.update({
      where: { id: pub.id },
      data: { content },
      include: { photo: true, ...createdByInclude, ...tagsInclude() },
    });
    return res.json({ publication: toPublicationResponse(updated) });
  }
);

publicationsRouter.delete(
  "/:treeId/publications/:publicationId",
  requireEditor,
  async (req, res) => {
    const pub = await prisma.publication.findFirst({
      where: { id: req.params.publicationId, treeId: req.params.treeId },
      include: { photo: true },
    });
    if (!pub) return res.status(404).json({ error: "Publication not found" });
    if (pub.createdById != null && pub.createdById !== req.user.id) {
      return res.status(403).json({ error: "Only the creator of this post can delete it" });
    }
    if (pub.photo) {
      const fullPath = path.join(__dirname, "..", "..", pub.photo.filePath);
      try {
        fs.unlinkSync(fullPath);
      } catch (_) {}
      try {
        const dir = path.dirname(fullPath);
        if (fs.readdirSync(dir).length === 0) fs.rmdirSync(dir);
      } catch (_) {}
      await prisma.photo.delete({ where: { id: pub.photo.id } });
    }
    await prisma.publication.delete({ where: { id: pub.id } });
    return res.status(204).send();
  }
);

publicationsRouter.post(
  "/:treeId/publications/:publicationId/tags",
  requireEditor,
  async (req, res) => {
    const { memberId } = req.body;
    if (!memberId || typeof memberId !== "string") {
      return res.status(400).json({ error: "memberId required" });
    }
    const pub = await prisma.publication.findFirst({
      where: { id: req.params.publicationId, treeId: req.params.treeId },
    });
    if (!pub) return res.status(404).json({ error: "Publication not found" });
    const member = await prisma.member.findFirst({
      where: { id: memberId, treeId: req.params.treeId },
    });
    if (!member) return res.status(404).json({ error: "Member not found" });
    await prisma.publicationTag.upsert({
      where: {
        publicationId_memberId: { publicationId: pub.id, memberId: member.id },
      },
      create: { publicationId: pub.id, memberId: member.id },
      update: {},
    });
    const updated = await prisma.publication.findUnique({
      where: { id: pub.id },
      include: { photo: true, ...tagsInclude() },
    });
    return res.json({
      tags: updated.tags.map((t) => ({ memberId: t.memberId, member: t.member })),
    });
  }
);

publicationsRouter.delete(
  "/:treeId/publications/:publicationId/tags/:memberId",
  requireEditor,
  async (req, res) => {
    const pub = await prisma.publication.findFirst({
      where: { id: req.params.publicationId, treeId: req.params.treeId },
    });
    if (!pub) return res.status(404).json({ error: "Publication not found" });
    await prisma.publicationTag.deleteMany({
      where: {
        publicationId: pub.id,
        memberId: req.params.memberId,
      },
    });
    return res.status(204).send();
  }
);
