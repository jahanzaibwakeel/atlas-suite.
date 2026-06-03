import type { Request, Response } from "express";
import {
  assignJobSchema,
  createJobNoteSchema,
  createJobSchema,
  jobParamsSchema,
  listJobsQuerySchema,
  updateJobStatusSchema
} from "./jobs.schemas.js";
import { jobsService } from "./jobs.service.js";
import { presentJob, presentJobs } from "./jobs.presenter.js";

export class JobsController {
  async list(req: Request, res: Response) {
    const query = listJobsQuerySchema.parse(req.query);
    const result = await jobsService.listJobs(req.user!, query);
    res.json({
      jobs: presentJobs(result.items, req.user!),
      pagination: {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        totalPages: result.totalPages,
        hasNextPage: result.page < result.totalPages,
        hasPreviousPage: result.page > 1
      }
    });
  }

  async create(req: Request, res: Response) {
    const body = createJobSchema.parse(req.body);
    const job = await jobsService.createJob(req.user!, body);
    res.status(201).json({ job: presentJob(job, req.user!) });
  }

  async getById(req: Request, res: Response) {
    const params = jobParamsSchema.parse(req.params);
    const job = await jobsService.getJob(req.user!, params.id);
    res.json({ job: presentJob(job, req.user!) });
  }

  async assign(req: Request, res: Response) {
    const params = jobParamsSchema.parse(req.params);
    const body = assignJobSchema.parse(req.body);
    const job = await jobsService.assignJob(req.user!, params.id, body);
    res.json({ job: presentJob(job, req.user!) });
  }

  async updateStatus(req: Request, res: Response) {
    const params = jobParamsSchema.parse(req.params);
    const body = updateJobStatusSchema.parse(req.body);
    const job = await jobsService.updateJobStatus(req.user!, params.id, body);
    res.json({ job: presentJob(job, req.user!) });
  }

  async createNote(req: Request, res: Response) {
    const params = jobParamsSchema.parse(req.params);
    const body = createJobNoteSchema.parse(req.body);
    const note = await jobsService.createJobNote(req.user!, params.id, body);
    res.status(201).json({ note });
  }

  async uploadAttachment(req: Request, res: Response) {
    const params = jobParamsSchema.parse(req.params);
    const attachment = await jobsService.uploadAttachment(req.user!, params.id, req.file);
    res.status(201).json({ attachment });
  }
}

export const jobsController = new JobsController();
