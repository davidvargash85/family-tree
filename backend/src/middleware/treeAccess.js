import { prisma } from "../db.js";

export async function getTreeAccess(userId, treeId) {
  const tree = await prisma.tree.findUnique({
    where: { id: treeId },
    select: { ownerId: true },
  });
  if (!tree) return null;
  if (tree.ownerId === userId) {
    return { role: "owner", tree };
  }
  const access = await prisma.treeAccess.findUnique({
    where: { userId_treeId: { userId, treeId } },
  });
  return access ? { role: access.role, tree } : null;
}

export function requireTreeAccess(minRole = "viewer") {
  const rank = { viewer: 0, editor: 1, owner: 2 };
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const treeId = req.params.treeId || req.params.id;
    if (!treeId) {
      return res.status(400).json({ error: "Missing tree id" });
    }
    const result = await getTreeAccess(req.user.id, treeId);
    if (!result) {
      return res.status(404).json({ error: "Tree not found or access denied" });
    }
    if (rank[result.role] < rank[minRole]) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    req.treeAccess = result;
    next();
  };
}

export function requireEditor(req, res, next) {
  return requireTreeAccess("editor")(req, res, next);
}

export function requireOwner(req, res, next) {
  return requireTreeAccess("owner")(req, res, next);
}
