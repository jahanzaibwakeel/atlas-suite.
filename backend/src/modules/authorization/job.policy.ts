import { JobStatus, Role, type Job } from "@prisma/client";
import type { AuthUser } from "../../types.js";
import { HttpError } from "../../utils/http.js";

export function visibleJobWhere(user: AuthUser | undefined) {
  if (!user) {
    throw new HttpError(401, "Authentication required", "AUTHENTICATION_REQUIRED");
  }

  if (user.role === Role.ADMIN) {
    return {};
  }

  if (user.role === Role.TECHNICIAN) {
    return { technicianId: user.id };
  }

  return { clientId: user.id };
}

export function canUpdateJobStatus(input: { user: AuthUser; job: Pick<Job, "technicianId">; nextStatus: JobStatus }) {
  if (input.user.role === Role.ADMIN) {
    return true;
  }

  if (input.user.role === Role.CLIENT) {
    return false;
  }

  const allowedTechnicianStatuses: JobStatus[] = [
    JobStatus.IN_PROGRESS,
    JobStatus.BLOCKED,
    JobStatus.COMPLETED
  ];

  return input.job.technicianId === input.user.id && allowedTechnicianStatuses.includes(input.nextStatus);
}

export function canCreateJobNote(input: { user: AuthUser; job: Pick<Job, "clientId" | "technicianId">; isInternal: boolean }) {
  if (input.user.role === Role.ADMIN) {
    return true;
  }

  if (input.user.role === Role.TECHNICIAN) {
    return input.job.technicianId === input.user.id;
  }

  return input.job.clientId === input.user.id && !input.isInternal;
}

export function serializeJobForUser<T extends { notes: Array<{ isInternal: boolean }> }>(job: T, user: AuthUser) {
  if (user.role !== Role.CLIENT) {
    return job;
  }

  return {
    ...job,
    notes: job.notes.filter((note) => !note.isInternal)
  };
}
