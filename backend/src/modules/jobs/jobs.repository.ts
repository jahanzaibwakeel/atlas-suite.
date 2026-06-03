import { JobStatus, Role, type Prisma } from "@prisma/client";
import { prisma } from "../../prisma.js";

type DbClient = typeof prisma | Prisma.TransactionClient;

export const jobInclude = {
  client: { select: { id: true, name: true, email: true } },
  technician: { select: { id: true, name: true, email: true } },
  notes: {
    include: { author: { select: { id: true, name: true, role: true } } },
    orderBy: { createdAt: "desc" as const }
  },
  attachments: {
    include: { uploadedBy: { select: { id: true, name: true, role: true } } },
    orderBy: { createdAt: "desc" as const }
  }
};

export type JobWithDetails = Prisma.JobGetPayload<{ include: typeof jobInclude }>;

export class JobsRepository {
  transaction<T>(handler: (tx: Prisma.TransactionClient) => Promise<T>) {
    return prisma.$transaction(handler);
  }

  async listJobs(input: { where: Prisma.JobWhereInput; skip: number; take: number }) {
    const [items, total] = await prisma.$transaction([
      prisma.job.findMany({
        where: input.where,
        include: jobInclude,
        orderBy: [{ scheduledAt: "asc" }, { createdAt: "desc" }, { id: "asc" }],
        skip: input.skip,
        take: input.take
      }),
      prisma.job.count({ where: input.where })
    ]);

    return { items, total };
  }

  findVisibleJob(id: string, where: Prisma.JobWhereInput, db: DbClient = prisma) {
    return db.job.findFirst({
      where: { id, ...where },
      include: jobInclude
    });
  }

  findJobById(id: string, db: DbClient = prisma) {
    return db.job.findUnique({ where: { id } });
  }

  findClientById(id: string, db: DbClient = prisma) {
    return db.user.findFirst({ where: { id, role: Role.CLIENT } });
  }

  findTechnicianById(id: string, db: DbClient = prisma) {
    return db.user.findFirst({ where: { id, role: Role.TECHNICIAN } });
  }

  createJob(input: {
    title: string;
    description: string;
    clientId: string;
    technicianId?: string;
    scheduledAt?: Date;
    status: JobStatus;
  }, db: DbClient = prisma) {
    return db.job.create({
      data: input,
      include: jobInclude
    });
  }

  assignJob(input: { id: string; technicianId: string; scheduledAt: Date | null; status: JobStatus }, db: DbClient = prisma) {
    return db.job.update({
      where: { id: input.id },
      data: {
        technicianId: input.technicianId,
        scheduledAt: input.scheduledAt,
        status: input.status
      },
      include: jobInclude
    });
  }

  updateStatus(input: { id: string; status: JobStatus }, db: DbClient = prisma) {
    return db.job.update({
      where: { id: input.id },
      data: { status: input.status },
      include: jobInclude
    });
  }

  createNote(input: { jobId: string; authorId: string; body: string; isInternal: boolean }, db: DbClient = prisma) {
    return db.jobNote.create({
      data: input,
      include: { author: { select: { id: true, name: true, role: true } } }
    });
  }

  createAttachment(input: {
    jobId: string;
    uploadedById: string;
    originalFilename: string;
    storedFilename: string;
    storageKey: string;
    mimeType: string;
    sizeBytes: number;
  }, db: DbClient = prisma) {
    return db.jobAttachment.create({
      data: input,
      include: { uploadedBy: { select: { id: true, name: true, role: true } } }
    });
  }
}

export const jobsRepository = new JobsRepository();
