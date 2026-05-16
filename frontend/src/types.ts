export type Role = "ADMIN" | "TECHNICIAN" | "CLIENT";

export type JobStatus =
  | "NEW"
  | "SCHEDULED"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "BLOCKED"
  | "COMPLETED"
  | "CANCELLED";

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

export type JobNote = {
  id: string;
  body: string;
  isInternal: boolean;
  createdAt: string;
  author: Pick<User, "id" | "name" | "role">;
};

export type Job = {
  id: string;
  title: string;
  description: string;
  status: JobStatus;
  scheduledAt: string | null;
  createdAt: string;
  client: Pick<User, "id" | "name" | "email">;
  technician: Pick<User, "id" | "name" | "email"> | null;
  notes: JobNote[];
};

export type Notification = {
  id: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
  jobId: string | null;
};
