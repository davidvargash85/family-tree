import { Router } from "express";
import { prisma } from "../db.js";
import { authMiddleware, optionalAuth } from "../middleware/auth.js";

export const invitationsRouter = Router();

invitationsRouter.post("/accept", authMiddleware, async (req, res) => {
  const token = req.body.token ?? req.query.token;
  if (!token) {
    return res.status(400).json({ error: "Missing token" });
  }
  const inv = await prisma.invitation.findUnique({
    where: { token },
    include: { tree: true },
  });
  if (!inv) {
    return res.status(404).json({ error: "Invitation not found" });
  }
  if (inv.acceptedAt) {
    return res.status(400).json({ error: "Invitation already accepted" });
  }
  if (new Date() > inv.expiresAt) {
    return res.status(400).json({ error: "Invitation expired" });
  }
  await prisma.$transaction([
    prisma.invitation.update({
      where: { id: inv.id },
      data: { acceptedAt: new Date() },
    }),
    prisma.treeAccess.upsert({
      where: {
        userId_treeId: { userId: req.user.id, treeId: inv.treeId },
      },
      create: { userId: req.user.id, treeId: inv.treeId, role: inv.role },
      update: { role: inv.role },
    }),
  ]);
  return res.json({
    tree: { id: inv.tree.id, name: inv.tree.name },
    role: inv.role,
  });
});

invitationsRouter.get("/by-token/:token", optionalAuth, async (req, res) => {
  const inv = await prisma.invitation.findUnique({
    where: { token: req.params.token },
    include: { tree: { select: { id: true, name: true } }, invitedBy: { select: { displayName: true, email: true } } },
  });
  if (!inv) return res.status(404).json({ error: "Invitation not found" });
  if (inv.acceptedAt) return res.status(400).json({ error: "Already accepted" });
  if (new Date() > inv.expiresAt) return res.status(400).json({ error: "Expired" });
  return res.json({
    invitation: {
      treeId: inv.tree.id,
      treeName: inv.tree.name,
      email: inv.email,
      role: inv.role,
      invitedBy: inv.invitedBy.displayName || inv.invitedBy.email,
    },
  });
});
