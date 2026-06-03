import { JobStatus } from "@prisma/client";
import { z } from "zod";

export const listJobsQuerySchema = z.object({
  status: z.nativeEnum(JobStatus).optional(),
  q: z.string().trim().min(1).max(100).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(50).default(20)
});

export const jobParamsSchema = z.object({
  id: z.string().min(1)
});

export const createJobSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(5),
  clientId: z.string().min(1),
  technicianId: z.string().min(1).optional().nullable(),
  scheduledAt: z.string().datetime().optional().nullable()
});

export const assignJobSchema = z.object({
  technicianId: z.string().min(1),
  scheduledAt: z.string().datetime().optional().nullable()
});

export const updateJobStatusSchema = z.object({
  status: z.nativeEnum(JobStatus)
});

export const createJobNoteSchema = z.object({
  body: z.string().min(2),
  isInternal: z.boolean().default(true)
});

export type ListJobsQuery = z.infer<typeof listJobsQuerySchema>;
export type JobParams = z.infer<typeof jobParamsSchema>;
export type CreateJobInput = z.infer<typeof createJobSchema>;
export type AssignJobInput = z.infer<typeof assignJobSchema>;
export type UpdateJobStatusInput = z.infer<typeof updateJobStatusSchema>;
export type CreateJobNoteInput = z.infer<typeof createJobNoteSchema>;
