import { Role } from "@prisma/client";
import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { prisma } from "../prisma.js";
import { asyncHandler } from "../utils/http.js";

const router = Router();

router.get(
  "/technicians",
  requireAuth,
  requireRole(Role.ADMIN),
  asyncHandler(async (_req, res) => {
    const technicians = await prisma.user.findMany({
      where: { role: Role.TECHNICIAN },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" }
    });

    res.json({ technicians });
  })
);

router.get(
  "/clients",
  requireAuth,
  requireRole(Role.ADMIN),
  asyncHandler(async (_req, res) => {
    const clients = await prisma.user.findMany({
      where: { role: Role.CLIENT },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" }
    });

    res.json({ clients });
  })
);

export default router;
