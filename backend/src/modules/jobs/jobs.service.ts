import { JobStatus } from "@prisma/client";
import { visibleJobWhere, canCreateJobNote, canUpdateJobStatus } from "../authorization/job.policy.js";
import type { AuthUser } from "../../types.js";
import { recordAudit } from "../../services/audit.js";
import { deleteStoredFile, storeJobAttachmentFile } from "../../services/file-storage.js";
import { notifyMany, notifyUser } from "../../services/notifications.js";
import { emitJobChanged, emitUserNotificationsChanged } from "../../realtime/socket.js";
import { HttpError } from "../../utils/http.js";
import type {
  AssignJobInput,
  CreateJobInput,
  CreateJobNoteInput,
  ListJobsQuery,
  UpdateJobStatusInput
} from "./jobs.schemas.js";
import { jobsRepository } from "./jobs.repository.js";

export class JobsService {
  async listJobs(user: AuthUser, query: ListJobsQuery) {
    const where = {
      ...visibleJobWhere(user),
      ...(query.status ? { status: query.status } : {}),
      ...(query.q
        ? {
            OR: [
              { title: { contains: query.q, mode: "insensitive" as const } },
              { description: { contains: query.q, mode: "insensitive" as const } }
            ]
          }
        : {})
    };

    const skip = (query.page - 1) * query.pageSize;
    const result = await jobsRepository.listJobs({
      where,
      skip,
      take: query.pageSize
    });

    return {
      items: result.items,
      page: query.page,
      pageSize: query.pageSize,
      total: result.total,
      totalPages: Math.ceil(result.total / query.pageSize)
    };
  }

  async getJob(user: AuthUser, jobId: string) {
    return this.ensureJobVisible(user, jobId);
  }

  async createJob(user: AuthUser, input: CreateJobInput) {
    const client = await jobsRepository.findClientById(input.clientId);
    if (!client) {
      throw new HttpError(400, "Client does not exist", "CLIENT_NOT_FOUND");
    }

    if (input.technicianId) {
      const technician = await jobsRepository.findTechnicianById(input.technicianId);
      if (!technician) {
        throw new HttpError(400, "Technician does not exist", "TECHNICIAN_NOT_FOUND");
      }
    }

    const status = input.technicianId
      ? JobStatus.ASSIGNED
      : input.scheduledAt
        ? JobStatus.SCHEDULED
        : JobStatus.NEW;

    const job = await jobsRepository.transaction(async (tx) => {
      const job = await jobsRepository.createJob(
        {
          title: input.title,
          description: input.description,
          clientId: input.clientId,
          technicianId: input.technicianId ?? undefined,
          scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : undefined,
          status
        },
        tx
      );

      await recordAudit(
        {
          actorId: user.id,
          action: "JOB_CREATED",
          entityType: "Job",
          entityId: job.id,
          jobId: job.id,
          metadata: { status, technicianId: input.technicianId ?? null }
        },
        tx
      );

      await notifyMany(
        [
          {
            userId: input.clientId,
            title: "New job created",
            body: `${job.title} has been created for your account.`,
            jobId: job.id
          },
          ...(input.technicianId
            ? [
                {
                  userId: input.technicianId,
                  title: "Job assigned",
                  body: `${job.title} has been assigned to you.`,
                  jobId: job.id
                }
              ]
            : [])
        ],
        tx
      );

      return job;
    });

    emitJobChanged({ jobId: job.id, userIds: [job.clientId, ...(job.technicianId ? [job.technicianId] : [])] });
    emitUserNotificationsChanged(job.clientId);
    if (job.technicianId) {
      emitUserNotificationsChanged(job.technicianId);
    }

    return job;
  }

  async assignJob(user: AuthUser, jobId: string, input: AssignJobInput) {
    const technician = await jobsRepository.findTechnicianById(input.technicianId);
    if (!technician) {
      throw new HttpError(400, "Technician does not exist", "TECHNICIAN_NOT_FOUND");
    }

    const previous = await jobsRepository.findJobById(jobId);
    if (!previous) {
      throw new HttpError(404, "Job not found", "JOB_NOT_FOUND");
    }

    const lockedStatuses: JobStatus[] = [JobStatus.COMPLETED, JobStatus.CANCELLED];
    if (lockedStatuses.includes(previous.status)) {
      throw new HttpError(400, "Completed or cancelled jobs cannot be reassigned", "JOB_LOCKED");
    }

    const job = await jobsRepository.transaction(async (tx) => {
      const job = await jobsRepository.assignJob(
        {
          id: jobId,
          technicianId: input.technicianId,
          scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : previous.scheduledAt,
          status: JobStatus.ASSIGNED
        },
        tx
      );

      await recordAudit(
        {
          actorId: user.id,
          action: "JOB_ASSIGNED",
          entityType: "Job",
          entityId: job.id,
          jobId: job.id,
          metadata: { fromTechnicianId: previous.technicianId, toTechnicianId: input.technicianId }
        },
        tx
      );

      await notifyUser(
        {
          userId: input.technicianId,
          title: "Job assigned",
          body: `${job.title} has been assigned to you.`,
          jobId: job.id
        },
        tx
      );

      return job;
    });

    emitJobChanged({
      jobId: job.id,
      userIds: [job.clientId, input.technicianId, ...(previous.technicianId ? [previous.technicianId] : [])]
    });
    emitUserNotificationsChanged(input.technicianId);

    return job;
  }

  async updateJobStatus(user: AuthUser, jobId: string, input: UpdateJobStatusInput) {
    const previous = await this.ensureJobVisible(user, jobId);

    if (!canUpdateJobStatus({ user, job: previous, nextStatus: input.status })) {
      throw new HttpError(403, "You cannot move this job to the requested status", "JOB_STATUS_FORBIDDEN");
    }

    const job = await jobsRepository.transaction(async (tx) => {
      const job = await jobsRepository.updateStatus({ id: previous.id, status: input.status }, tx);

      await recordAudit(
        {
          actorId: user.id,
          action: "JOB_STATUS_CHANGED",
          entityType: "Job",
          entityId: job.id,
          jobId: job.id,
          metadata: { from: previous.status, to: input.status }
        },
        tx
      );

      await notifyUser(
        {
          userId: job.clientId,
          title: "Job status updated",
          body: `${job.title} moved from ${previous.status} to ${input.status}.`,
          jobId: job.id
        },
        tx
      );

      return job;
    });

    emitJobChanged({ jobId: job.id, userIds: [job.clientId, ...(job.technicianId ? [job.technicianId] : [])] });
    emitUserNotificationsChanged(job.clientId);

    return job;
  }

  async createJobNote(user: AuthUser, jobId: string, input: CreateJobNoteInput) {
    const job = await this.ensureJobVisible(user, jobId);

    if (!canCreateJobNote({ user, job, isInternal: input.isInternal })) {
      throw new HttpError(403, "You cannot add this note to the job", "JOB_NOTE_FORBIDDEN");
    }

    const note = await jobsRepository.transaction(async (tx) => {
      const note = await jobsRepository.createNote(
        {
          body: input.body,
          isInternal: user.role === "CLIENT" ? false : input.isInternal,
          jobId: job.id,
          authorId: user.id
        },
        tx
      );

      await recordAudit(
        {
          actorId: user.id,
          action: "JOB_NOTE_ADDED",
          entityType: "JobNote",
          entityId: note.id,
          jobId: job.id,
          metadata: { isInternal: note.isInternal }
        },
        tx
      );

      return note;
    });

    emitJobChanged({ jobId: job.id, userIds: [job.clientId, ...(job.technicianId ? [job.technicianId] : [])] });

    return note;
  }

  async uploadAttachment(user: AuthUser, jobId: string, file: Express.Multer.File | undefined) {
    if (!file) {
      throw new HttpError(400, "Attachment file is required", "FILE_REQUIRED");
    }

    const job = await this.ensureJobVisible(user, jobId);
    const stored = await storeJobAttachmentFile({
      jobId: job.id,
      originalFilename: file.originalname,
      buffer: file.buffer
    });

    try {
      const attachment = await jobsRepository.transaction(async (tx) => {
        const attachment = await jobsRepository.createAttachment(
          {
            jobId: job.id,
            uploadedById: user.id,
            originalFilename: file.originalname,
            storedFilename: stored.storedFilename,
            storageKey: stored.storageKey,
            mimeType: file.mimetype,
            sizeBytes: file.size
          },
          tx
        );

        await recordAudit(
          {
            actorId: user.id,
            action: "JOB_ATTACHMENT_UPLOADED",
            entityType: "JobAttachment",
            entityId: attachment.id,
            jobId: job.id,
            metadata: {
              mimeType: file.mimetype,
              sizeBytes: file.size,
              originalFilename: file.originalname
            }
          },
          tx
        );

        return attachment;
      });

      emitJobChanged({ jobId: job.id, userIds: [job.clientId, ...(job.technicianId ? [job.technicianId] : [])] });

      return attachment;
    } catch (error) {
      await deleteStoredFile(stored.absolutePath);
      throw error;
    }
  }

  private async ensureJobVisible(user: AuthUser, jobId: string) {
    const job = await jobsRepository.findVisibleJob(jobId, visibleJobWhere(user));
    if (!job) {
      throw new HttpError(404, "Job not found", "JOB_NOT_FOUND");
    }

    return job;
  }
}

export const jobsService = new JobsService();
