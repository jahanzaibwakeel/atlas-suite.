import { JobStatus, Role } from "@prisma/client";
import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { prisma } from "../prisma.js";
import { asyncHandler } from "../utils/http.js";

const router = Router();

router.get(
  "/overview",
  requireAuth,
  requireRole(Role.ADMIN),
  asyncHandler(async (_req, res) => {
    const [totalJobs, usersByRole, jobsByStatus, recentActivity, upcomingJobs] =
      await Promise.all([
        prisma.job.count(),
        prisma.user.groupBy({ by: ["role"], _count: true }),
        prisma.job.groupBy({ by: ["status"], _count: true }),
        prisma.auditLog.findMany({
          include: { actor: { select: { name: true, role: true } } },
          orderBy: { createdAt: "desc" },
          take: 8
        }),
        prisma.job.findMany({
          where: { status: { notIn: [JobStatus.COMPLETED, JobStatus.CANCELLED] } },
          include: {
            client: { select: { name: true } },
            technician: { select: { name: true } }
          },
          orderBy: [{ scheduledAt: "asc" }, { createdAt: "desc" }],
          take: 6
        })
      ]);

    res.json({
      totalJobs,
      usersByRole,
      jobsByStatus,
      recentActivity,
      upcomingJobs
    });
  })
);

export default router;
