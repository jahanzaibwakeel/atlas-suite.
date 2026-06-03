import type { AuthUser } from "../../types.js";
import { serializeJobForUser } from "../authorization/job.policy.js";
import type { JobWithDetails } from "./jobs.repository.js";

export function presentJob(job: JobWithDetails, user: AuthUser) {
  return serializeJobForUser(job, user);
}

export function presentJobs(jobs: JobWithDetails[], user: AuthUser) {
  return jobs.map((job) => presentJob(job, user));
}
