import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { authMiddleware } from "../middleware/auth.js";
import { requireTreeAccess, requireEditor } from "../middleware/treeAccess.js";

export const relationshipsRouter = Router();
relationshipsRouter.use(authMiddleware);

// Only "parent" for parent-child; always stored as parent (memberA) → child (memberB). No "child" type.
const RELATIONSHIP_TYPES = ["parent", "spouse", "sibling"];
const createRelationshipSchema = z.object({
  memberAId: z.string(),
  memberBId: z.string(),
  type: z.enum(RELATIONSHIP_TYPES),
});

relationshipsRouter.get("/:treeId/relationships", requireTreeAccess(), async (req, res) => {
  const relationships = await prisma.relationship.findMany({
    where: { treeId: req.params.treeId },
    include: {
      memberA: { select: { id: true, name: true, photoUrl: true } },
      memberB: { select: { id: true, name: true, photoUrl: true } },
    },
  });
  return res.json({ relationships });
});

relationshipsRouter.post("/:treeId/relationships", requireEditor, async (req, res) => {
  const parsed = createRelationshipSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input" });
  }
  const { memberAId, memberBId, type } = parsed.data;
  if (memberAId === memberBId) {
    return res.status(400).json({ error: "Members must be different" });
  }
  const treeId = req.params.treeId;
  const [memberA, memberB] = await Promise.all([
    prisma.member.findFirst({ where: { id: memberAId, treeId } }),
    prisma.member.findFirst({ where: { id: memberBId, treeId } }),
  ]);
  if (!memberA || !memberB) {
    return res.status(400).json({ error: "Both members must exist in this tree" });
  }
  const existing = await prisma.relationship.findFirst({
    where: {
      treeId,
      memberAId,
      memberBId,
      type,
    },
  });
  if (existing) {
    return res.status(409).json({ error: "Relationship already exists" });
  }
  // For parent-child, reject the reverse too (only one direction stored: parent → child)
  if (type === "parent") {
    const reverse = await prisma.relationship.findFirst({
      where: {
        treeId,
        memberAId: memberBId,
        memberBId: memberAId,
        type: "parent",
      },
    });
    if (reverse) {
      return res.status(409).json({ error: "Relationship already exists" });
    }
  }
  const relationship = await prisma.relationship.create({
    data: { treeId, memberAId, memberBId, type },
    include: {
      memberA: { select: { id: true, name: true, photoUrl: true } },
      memberB: { select: { id: true, name: true, photoUrl: true } },
    },
  });
  return res.status(201).json({ relationship });
});

relationshipsRouter.delete("/:treeId/relationships/:relId", requireEditor, async (req, res) => {
  const rel = await prisma.relationship.findFirst({
    where: {
      id: req.params.relId,
      treeId: req.params.treeId,
    },
  });
  if (!rel) return res.status(404).json({ error: "Relationship not found" });
  await prisma.relationship.delete({ where: { id: req.params.relId } });
  return res.status(204).send();
});
