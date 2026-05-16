import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { prisma } from "../prisma.js";
import { asyncHandler } from "../utils/http.js";

const router = Router();

router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: "desc" },
      take: 30
    });

    res.json({ notifications });
  })
);

router.patch(
  "/:id/read",
  requireAuth,
  asyncHandler(async (req, res) => {
    const notification = await prisma.notification.update({
      where: { id: req.params.id, userId: req.user!.id },
      data: { readAt: new Date() }
    });

    res.json({ notification });
  })
);

export default router;
