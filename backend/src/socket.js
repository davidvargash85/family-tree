import { verifyToken } from "./middleware/auth.js";
import { getTreeAccess } from "./middleware/treeAccess.js";
import { prisma } from "./db.js";

export function setupSocket(io) {
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error("Unauthorized"));
    }
    const decoded = verifyToken(token);
    if (!decoded) {
      return next(new Error("Invalid or expired token"));
    }
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true },
    });
    if (!user) {
      return next(new Error("User not found"));
    }
    socket.userId = user.id;
    next();
  });

  io.on("connection", (socket) => {
    socket.on("joinTree", async (treeId, cb) => {
      if (!treeId || typeof treeId !== "string") {
        cb?.(false);
        return;
      }
      try {
        const access = await getTreeAccess(socket.userId, treeId);
        if (!access) {
          cb?.(false);
          return;
        }
        socket.join(`tree:${treeId}`);
        cb?.(true);
      } catch {
        cb?.(false);
      }
    });

    socket.on("leaveTree", (treeId) => {
      if (treeId && typeof treeId === "string") {
        socket.leave(`tree:${treeId}`);
      }
    });
  });
}
