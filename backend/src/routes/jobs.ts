import { JobStatus, Role } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { prisma } from "../prisma.js";
import { recordAudit } from "../services/audit.js";
import { notifyMany, notifyUser } from "../services/notifications.js";
import { asyncHandler, HttpError } from "../utils/http.js";

const router = Router();

const jobInclude = {
  client: { select: { id: true, name: true, email: true } },
  technician: { select: { id: true, name: true, email: true } },
  notes: {
    include: { author: { select: { id: true, name: true, role: true } } },
    orderBy: { createdAt: "desc" as const }
  }
};

const createJobSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(5),
  clientId: z.string().min(1),
  technicianId: z.string().min(1).optional().nullable(),
  scheduledAt: z.string().datetime().optional().nullable()
});

const assignSchema = z.object({
  technicianId: z.string().min(1),
  scheduledAt: z.string().datetime().optional().nullable()
});

const statusSchema = z.object({
  status: z.nativeEnum(JobStatus)
});

const noteSchema = z.object({
  body: z.string().min(2),
  isInternal: z.boolean().default(true)
});

function visibleJobWhere(user: Express.Request["user"]) {
  if (!user) throw new HttpError(401, "Authentication required");
  if (user.role === Role.ADMIN) return {};
  if (user.role === Role.TECHNICIAN) return { technicianId: user.id };
  return { clientId: user.id };
}

async function ensureJobVisible(jobId: string, user: Express.Request["user"]) {
  const job = await prisma.job.findFirst({
    where: { id: jobId, ...visibleJobWhere(user) },
    include: jobInclude
  });

  if (!job) {
    throw new HttpError(404, "Job not found");
  }

  return job;
}

router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const jobs = await prisma.job.findMany({
      where: {
        ...visibleJobWhere(req.user),
        ...(status ? { status: status as JobStatus } : {})
      },
      include: jobInclude,
      orderBy: [{ scheduledAt: "asc" }, { createdAt: "desc" }]
    });

    const filteredJobs =
      req.user!.role === Role.CLIENT
        ? jobs.map((job) => ({ ...job, notes: job.notes.filter((note) => !note.isInternal) }))
        : jobs;

    res.json({ jobs: filteredJobs });
  })
);

router.post(
  "/",
  requireAuth,
  requireRole(Role.ADMIN),
  asyncHandler(async (req, res) => {
    const body = createJobSchema.parse(req.body);
    const client = await prisma.user.findFirst({ where: { id: body.clientId, role: Role.CLIENT } });

    if (!client) {
      throw new HttpError(400, "Client does not exist");
    }

    let technician = null;
    if (body.technicianId) {
      technician = await prisma.user.findFirst({
        where: { id: body.technicianId, role: Role.TECHNICIAN }
      });
      if (!technician) throw new HttpError(400, "Technician does not exist");
    }

    const status = body.technicianId
      ? JobStatus.ASSIGNED
      : body.scheduledAt
        ? JobStatus.SCHEDULED
        : JobStatus.NEW;

    const job = await prisma.job.create({
      data: {
        title: body.title,
        description: body.description,
        clientId: body.clientId,
        technicianId: body.technicianId ?? undefined,
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
        status
      },
      include: jobInclude
    });

    await recordAudit({
      actorId: req.user!.id,
      action: "JOB_CREATED",
      entityType: "Job",
      entityId: job.id,
      jobId: job.id,
      metadata: { status, technicianId: body.technicianId ?? null }
    });

    await notifyMany([
      {
        userId: body.clientId,
        title: "New job created",
        body: `${job.title} has been created for your account.`,
        jobId: job.id
      },
      ...(body.technicianId
        ? [
            {
              userId: body.technicianId,
              title: "Job assigned",
              body: `${job.title} has been assigned to you.`,
              jobId: job.id
            }
          ]
        : [])
    ]);

    res.status(201).json({ job });
  })
);

router.get(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const job = await ensureJobVisible(req.params.id, req.user);
    const visibleJob =
      req.user!.role === Role.CLIENT
        ? { ...job, notes: job.notes.filter((note) => !note.isInternal) }
        : job;

    res.json({ job: visibleJob });
  })
);

router.patch(
  "/:id/assign",
  requireAuth,
  requireRole(Role.ADMIN),
  asyncHandler(async (req, res) => {
    const body = assignSchema.parse(req.body);
    const technician = await prisma.user.findFirst({
      where: { id: body.technicianId, role: Role.TECHNICIAN }
    });
    if (!technician) throw new HttpError(400, "Technician does not exist");

    const previous = await prisma.job.findUnique({ where: { id: req.params.id } });
    if (!previous) throw new HttpError(404, "Job not found");
    const lockedStatuses: JobStatus[] = [JobStatus.COMPLETED, JobStatus.CANCELLED];
    if (lockedStatuses.includes(previous.status)) {
      throw new HttpError(400, "Completed or cancelled jobs cannot be reassigned");
    }

    const job = await prisma.job.update({
      where: { id: req.params.id },
      data: {
        technicianId: body.technicianId,
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : previous.scheduledAt,
        status: JobStatus.ASSIGNED
      },
      include: jobInclude
    });

    await recordAudit({
      actorId: req.user!.id,
      action: "JOB_ASSIGNED",
      entityType: "Job",
      entityId: job.id,
      jobId: job.id,
      metadata: { fromTechnicianId: previous.technicianId, toTechnicianId: body.technicianId }
    });

    await notifyUser({
      userId: body.technicianId,
      title: "Job assigned",
      body: `${job.title} has been assigned to you.`,
      jobId: job.id
    });

    res.json({ job });
  })
);

router.patch(
  "/:id/status",
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = statusSchema.parse(req.body);
    const previous = await ensureJobVisible(req.params.id, req.user);

    if (req.user!.role === Role.CLIENT) {
      throw new HttpError(403, "Clients cannot update job status");
    }

    if (req.user!.role === Role.TECHNICIAN) {
      const allowed: JobStatus[] = [JobStatus.IN_PROGRESS, JobStatus.BLOCKED, JobStatus.COMPLETED];
      if (!allowed.includes(body.status)) {
        throw new HttpError(403, "Technicians can only start, block, or complete assigned jobs");
      }
    }

    const job = await prisma.job.update({
      where: { id: previous.id },
      data: { status: body.status },
      include: jobInclude
    });

    await recordAudit({
      actorId: req.user!.id,
      action: "JOB_STATUS_CHANGED",
      entityType: "Job",
      entityId: job.id,
      jobId: job.id,
      metadata: { from: previous.status, to: body.status }
    });

    await notifyUser({
      userId: job.clientId,
      title: "Job status updated",
      body: `${job.title} moved from ${previous.status} to ${body.status}.`,
      jobId: job.id
    });

    res.json({ job });
  })
);

router.post(
  "/:id/notes",
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = noteSchema.parse(req.body);
    const job = await ensureJobVisible(req.params.id, req.user);

    if (req.user!.role === Role.CLIENT && body.isInternal) {
      throw new HttpError(403, "Clients cannot create internal notes");
    }

    const note = await prisma.jobNote.create({
      data: {
        body: body.body,
        isInternal: req.user!.role === Role.CLIENT ? false : body.isInternal,
        jobId: job.id,
        authorId: req.user!.id
      },
      include: { author: { select: { id: true, name: true, role: true } } }
    });

    await recordAudit({
      actorId: req.user!.id,
      action: "JOB_NOTE_ADDED",
      entityType: "JobNote",
      entityId: note.id,
      jobId: job.id,
      metadata: { isInternal: note.isInternal }
    });

    res.status(201).json({ note });
  })
);

export default router;
