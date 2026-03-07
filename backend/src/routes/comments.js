import { Router } from "express";
import { prisma } from "../db.js";
import { authMiddleware } from "../middleware/auth.js";
import { requireTreeAccess } from "../middleware/treeAccess.js";

export const commentsRouter = Router({ mergeParams: true });
commentsRouter.use(authMiddleware);

const authorSelect = { id: true, displayName: true, email: true };

function toCommentResponse(c) {
  return {
    id: c.id,
    publicationId: c.publicationId,
    authorId: c.authorId,
    author: c.author ? { id: c.author.id, displayName: c.author.displayName, email: c.author.email } : null,
    content: c.content,
    parentId: c.parentId,
    createdAt: c.createdAt,
  };
}

/** GET /trees/:treeId/publications/:publicationId/comments - list comments (flat, with parentId for threading) */
commentsRouter.get(
  "/",
  requireTreeAccess("viewer"),
  async (req, res) => {
    const { treeId, publicationId } = req.params;
    const pub = await prisma.publication.findFirst({
      where: { id: publicationId, treeId },
    });
    if (!pub) return res.status(404).json({ error: "Publication not found" });
    const comments = await prisma.comment.findMany({
      where: { publicationId },
      orderBy: { createdAt: "asc" },
      include: { author: { select: authorSelect } },
    });
    return res.json({ comments: comments.map(toCommentResponse) });
  }
);

/** POST /trees/:treeId/publications/:publicationId/comments - create comment or reply */
commentsRouter.post(
  "/",
  requireTreeAccess("viewer"),
  async (req, res) => {
    const { treeId, publicationId } = req.params;
    const content = typeof req.body.content === "string" ? req.body.content.trim() : "";
    const parentId = typeof req.body.parentId === "string" ? req.body.parentId.trim() || null : null;
    if (!content) return res.status(400).json({ error: "content is required" });
    const pub = await prisma.publication.findFirst({
      where: { id: publicationId, treeId },
    });
    if (!pub) return res.status(404).json({ error: "Publication not found" });
    if (parentId) {
      const parent = await prisma.comment.findFirst({
        where: { id: parentId, publicationId },
      });
      if (!parent) return res.status(404).json({ error: "Parent comment not found" });
    }
    const comment = await prisma.comment.create({
      data: {
        publicationId,
        authorId: req.user.id,
        content,
        parentId,
      },
      include: { author: { select: authorSelect } },
    });
    return res.status(201).json({ comment: toCommentResponse(comment) });
  }
);
