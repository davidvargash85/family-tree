import { Router } from "express";
import crypto from "crypto";
import { z } from "zod";
import { prisma } from "../db.js";
import { authMiddleware } from "../middleware/auth.js";
import { requireTreeAccess, requireOwner } from "../middleware/treeAccess.js";

export const treesRouter = Router();
treesRouter.use(authMiddleware);

const createTreeSchema = z.object({ name: z.string().min(1).max(200) });
const updateTreeSchema = z.object({ name: z.string().min(1).max(200).optional() });
const createInviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["viewer", "editor"]),
});

treesRouter.get("/", async (req, res) => {
  const accessList = await prisma.treeAccess.findMany({
    where: { userId: req.user.id },
    include: {
      tree: {
        include: {
          _count: { select: { members: true } },
        },
      },
    },
  });
  const owned = await prisma.tree.findMany({
    where: { ownerId: req.user.id },
    include: { _count: { select: { members: true } } },
  });
  const ownedIds = new Set(owned.map((t) => t.id));
  const trees = owned.map((t) => ({
    id: t.id,
    name: t.name,
    memberCount: t._count.members,
    role: "owner",
    createdAt: t.createdAt,
  }));
  for (const a of accessList) {
    if (ownedIds.has(a.treeId)) continue;
    trees.push({
      id: a.tree.id,
      name: a.tree.name,
      memberCount: a.tree._count.members,
      role: a.role,
      createdAt: a.tree.createdAt,
    });
  }
  trees.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return res.json({ trees });
});

treesRouter.post("/", async (req, res) => {
  const parsed = createTreeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input" });
  }
  const tree = await prisma.tree.create({
    data: {
      name: parsed.data.name,
      ownerId: req.user.id,
    },
  });
  await prisma.treeAccess.create({
    data: { userId: req.user.id, treeId: tree.id, role: "owner" },
  });
  return res.status(201).json({
    tree: {
      id: tree.id,
      name: tree.name,
      memberCount: 0,
      role: "owner",
      createdAt: tree.createdAt,
    },
  });
});

treesRouter.get("/:id", requireTreeAccess(), async (req, res) => {
  const tree = await prisma.tree.findUnique({
    where: { id: req.params.id },
    include: { _count: { select: { members: true } } },
  });
  return res.json({
    tree: {
      id: tree.id,
      name: tree.name,
      memberCount: tree._count.members,
      role: req.treeAccess.role,
      createdAt: tree.createdAt,
    },
  });
});

treesRouter.patch("/:id", requireTreeAccess("editor"), async (req, res) => {
  const parsed = updateTreeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input" });
  }
  const tree = await prisma.tree.update({
    where: { id: req.params.id },
    data: parsed.data,
  });
  return res.json({ tree });
});

treesRouter.delete("/:id", requireOwner, async (req, res) => {
  if (req.treeAccess.role !== "owner") {
    return res.status(403).json({ error: "Only owner can delete tree" });
  }
  await prisma.tree.delete({ where: { id: req.params.id } });
  return res.status(204).send();
});

treesRouter.post("/:treeId/invitations", requireOwner, async (req, res) => {
  const parsed = createInviteSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input" });
  }
  const { email, role } = parsed.data;
  const treeId = req.params.treeId;
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const inv = await prisma.invitation.create({
    data: {
      treeId,
      email,
      role,
      invitedById: req.user.id,
      token,
      expiresAt,
    },
    include: { tree: { select: { name: true } } },
  });
  const inviteUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/invite/${token}`;
  return res.status(201).json({
    invitation: {
      id: inv.id,
      email: inv.email,
      role: inv.role,
      token,
      inviteUrl,
      expiresAt: inv.expiresAt,
    },
  });
});

treesRouter.get("/:treeId/invitations", requireOwner, async (req, res) => {
  const list = await prisma.invitation.findMany({
    where: { treeId: req.params.treeId, acceptedAt: null },
    orderBy: { createdAt: "desc" },
  });
  const baseUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  const invitations = list.map((i) => ({
    id: i.id,
    email: i.email,
    role: i.role,
    inviteUrl: `${baseUrl}/invite/${i.token}`,
    expiresAt: i.expiresAt,
    createdAt: i.createdAt,
  }));
  return res.json({ invitations });
});

treesRouter.delete("/:treeId/invitations/:invId", requireOwner, async (req, res) => {
  const inv = await prisma.invitation.findFirst({
    where: { id: req.params.invId, treeId: req.params.treeId },
  });
  if (!inv) return res.status(404).json({ error: "Invitation not found" });
  await prisma.invitation.delete({ where: { id: inv.id } });
  return res.status(204).send();
});
