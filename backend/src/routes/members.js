import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { authMiddleware } from "../middleware/auth.js";
import { requireTreeAccess, requireEditor } from "../middleware/treeAccess.js";
import { getLayoutedElements } from "../services/treeLayout.js";

export const membersRouter = Router();
membersRouter.use(authMiddleware);

const dateOptional = z.union([z.string().datetime(), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]).optional().nullable();
const ALIVE_SENTINEL = new Date("9999-12-31");

const RELATIONSHIP_TYPES = ["parent", "spouse", "sibling"];
const createMemberSchema = z.object({
  name: z.string().min(1).max(200),
  birthDate: dateOptional,
  deathDate: dateOptional,
  deceased: z.boolean().optional(),
  bio: z.string().optional().nullable(),
  linkAfterCreate: z
    .object({
      otherMemberId: z.string(),
      type: z.enum(RELATIONSHIP_TYPES),
    })
    .optional(),
});
const updateMemberSchema = createMemberSchema.partial();

membersRouter.get("/:treeId/members", requireTreeAccess(), async (req, res) => {
  const members = await prisma.member.findMany({
    where: { treeId: req.params.treeId },
    orderBy: { createdAt: "asc" },
  });
  return res.json({ members });
});

const MIN_SEARCH_LENGTH = 3;
membersRouter.get("/:treeId/members/search", requireTreeAccess(), async (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (q.length < MIN_SEARCH_LENGTH) {
    return res.status(400).json({ error: `Search query must be at least ${MIN_SEARCH_LENGTH} characters` });
  }
  const members = await prisma.member.findMany({
    where: {
      treeId: req.params.treeId,
      name: { contains: q, mode: "insensitive" },
    },
    orderBy: { name: "asc" },
    take: 20,
  });
  return res.json({ members });
});

membersRouter.post("/:treeId/members", requireEditor, async (req, res) => {
  const treeId = req.params.treeId;
  const parsed = createMemberSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input" });
  }
  const { linkAfterCreate, ...memberData } = parsed.data;
  const deceased = memberData.deceased === true;
  if (deceased && !memberData.deathDate) {
    return res.status(400).json({ error: "Death date is required when deceased is checked" });
  }
  const deathDate =
    deceased && memberData.deathDate
      ? new Date(memberData.deathDate)
      : ALIVE_SENTINEL;
  const member = await prisma.member.create({
    data: {
      treeId,
      name: memberData.name,
      birthDate: memberData.birthDate ? new Date(memberData.birthDate) : null,
      deathDate,
      bio: memberData.bio ?? null,
    },
  });

  let relationship = null;
  if (linkAfterCreate) {
    const { otherMemberId, type } = linkAfterCreate;
    if (otherMemberId === member.id) {
      return res.status(400).json({ error: "Members must be different" });
    }
    const [otherMember] = await Promise.all([
      prisma.member.findFirst({ where: { id: otherMemberId, treeId } }),
    ]);
    if (!otherMember) {
      return res.status(404).json({ error: "Other member not found in this tree" });
    }
    const memberAId = otherMemberId;
    const memberBId = member.id;
    const existing = await prisma.relationship.findFirst({
      where: { treeId, memberAId, memberBId, type },
    });
    if (existing) {
      return res.status(409).json({ error: "Relationship already exists" });
    }
    if (type === "parent") {
      const reverse = await prisma.relationship.findFirst({
        where: { treeId, memberAId: memberBId, memberBId: memberAId, type: "parent" },
      });
      if (reverse) {
        return res.status(409).json({ error: "Relationship already exists" });
      }
    }
    relationship = await prisma.relationship.create({
      data: { treeId, memberAId, memberBId, type },
      include: {
        memberA: { select: { id: true, name: true, photoUrl: true } },
        memberB: { select: { id: true, name: true, photoUrl: true } },
      },
    });
  }

  const [tree, members, relationships] = await Promise.all([
    prisma.tree.findUnique({
      where: { id: treeId },
      select: { layoutPositions: true },
    }),
    prisma.member.findMany({
      where: { treeId },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, photoUrl: true, deathDate: true },
    }),
    prisma.relationship.findMany({
      where: { treeId },
      select: { id: true, memberAId: true, memberBId: true, type: true },
    }),
  ]);
  const layoutPositions =
    tree?.layoutPositions && typeof tree.layoutPositions === "object"
      ? tree.layoutPositions
      : null;
  const { nodes, edges } = getLayoutedElements(members, relationships, layoutPositions);

  const payload = { member, layout: { nodes, edges } };
  if (relationship) payload.relationship = relationship;
  return res.status(201).json(payload);
});

membersRouter.get("/:treeId/members/:memberId", requireTreeAccess(), async (req, res) => {
  const member = await prisma.member.findFirst({
    where: {
      id: req.params.memberId,
      treeId: req.params.treeId,
    },
  });
  if (!member) return res.status(404).json({ error: "Member not found" });
  return res.json({ member });
});

membersRouter.patch("/:treeId/members/:memberId", requireEditor, async (req, res) => {
  const parsed = updateMemberSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input" });
  }
  const member = await prisma.member.findFirst({
    where: {
      id: req.params.memberId,
      treeId: req.params.treeId,
    },
  });
  if (!member) return res.status(404).json({ error: "Member not found" });
  const data = {};
  if (parsed.data.name != null) data.name = parsed.data.name;
  if (parsed.data.birthDate != null) data.birthDate = parsed.data.birthDate ? new Date(parsed.data.birthDate) : null;
  if (parsed.data.deceased !== undefined) {
    data.deathDate = parsed.data.deceased === true && parsed.data.deathDate
      ? new Date(parsed.data.deathDate)
      : ALIVE_SENTINEL;
  } else if (parsed.data.deathDate != null) {
    data.deathDate = parsed.data.deathDate ? new Date(parsed.data.deathDate) : null;
  }
  if (parsed.data.bio != null) data.bio = parsed.data.bio;
  const updated = await prisma.member.update({
    where: { id: req.params.memberId },
    data,
  });
  return res.json({ member: updated });
});

function getDescendantIds(childrenMap, memberId) {
  const seen = new Set();
  const queue = [memberId];
  while (queue.length) {
    const id = queue.shift();
    if (seen.has(id)) continue;
    seen.add(id);
    const children = childrenMap.get(id) || [];
    queue.push(...children);
  }
  seen.delete(memberId);
  return [...seen];
}

membersRouter.delete("/:treeId/members/:memberId", requireEditor, async (req, res) => {
  const { treeId, memberId } = req.params;
  const member = await prisma.member.findFirst({
    where: { id: memberId, treeId },
  });
  if (!member) return res.status(404).json({ error: "Member not found" });

  const parentRels = await prisma.relationship.findMany({
    where: { treeId, type: "parent" },
    select: { memberAId: true, memberBId: true },
  });
  const childrenMap = new Map();
  parentRels.forEach((r) => {
    if (!childrenMap.has(r.memberAId)) childrenMap.set(r.memberAId, []);
    childrenMap.get(r.memberAId).push(r.memberBId);
  });

  const descendantIds = getDescendantIds(childrenMap, memberId);

  const txOps = [];
  if (descendantIds.length > 0) {
    txOps.push(prisma.member.deleteMany({ where: { id: { in: descendantIds }, treeId } }));
  }
  txOps.push(prisma.member.delete({ where: { id: memberId } }));
  await prisma.$transaction(txOps);
  return res.status(204).send();
});
