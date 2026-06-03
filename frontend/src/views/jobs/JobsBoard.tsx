"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock, Paperclip, Search, Upload, Wrench } from "lucide-react";
import { useState } from "react";
import { api } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import { Button } from "../../components/ui/Button";
import { Panel } from "../../components/ui/Panel";
import { StatusBadge } from "../../components/ui/StatusBadge";
import type { Job, JobStatus, Pagination } from "../../types";

const technicianStatuses: JobStatus[] = ["IN_PROGRESS", "BLOCKED", "COMPLETED"];
const adminStatuses: JobStatus[] = [
  "NEW",
  "SCHEDULED",
  "ASSIGNED",
  "IN_PROGRESS",
  "BLOCKED",
  "COMPLETED",
  "CANCELLED"
];

export function JobsBoard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [noteByJob, setNoteByJob] = useState<Record<string, string>>({});
  const [statusFilter, setStatusFilter] = useState<JobStatus | "">("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const jobs = useQuery({
    queryKey: ["jobs", { statusFilter, search, page }],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: "10"
      });

      if (statusFilter) params.set("status", statusFilter);
      if (search.trim()) params.set("q", search.trim());

      return api<{ jobs: Job[]; pagination: Pagination }>(`/jobs?${params.toString()}`);
    }
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: JobStatus }) =>
      api<{ job: Job }>(`/jobs/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
  });

  const addNote = useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) =>
      api(`/jobs/${id}/notes`, {
        method: "POST",
        body: JSON.stringify({ body, isInternal: user?.role !== "CLIENT" })
      }),
    onSuccess: (_data, variables) => {
      setNoteByJob((current) => ({ ...current, [variables.id]: "" }));
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    }
  });

  const uploadAttachment = useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => {
      const formData = new FormData();
      formData.set("file", file);
      return api(`/jobs/${id}/attachments`, {
        method: "POST",
        body: formData
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    }
  });

  const allowedStatuses = user?.role === "ADMIN" ? adminStatuses : technicianStatuses;

  return (
    <Panel>
      <div className="section-title">
        <Wrench size={20} />
        <h2>{user?.role === "CLIENT" ? "Client job list" : "Jobs"}</h2>
      </div>

      <div className="inline-controls">
        <label>
          <Search size={14} />
          <input
            placeholder="Search jobs"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </label>
        <select
          value={statusFilter}
          onChange={(event) => {
            setStatusFilter(event.target.value as JobStatus | "");
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          {adminStatuses.map((status) => (
            <option key={status} value={status}>
              {status.replace("_", " ")}
            </option>
          ))}
        </select>
      </div>

      <div className="jobs-list">
        {jobs.isLoading && <p className="muted">Loading jobs...</p>}
        {jobs.data?.jobs.map((job) => (
          <article className="job-card" key={job.id}>
            <div className="job-card-header">
              <div>
                <h3>{job.title}</h3>
                <p>{job.description}</p>
              </div>
              <StatusBadge status={job.status} />
            </div>

            <div className="job-meta">
              <span>{job.client.name}</span>
              <span>{job.technician ? job.technician.name : "Unassigned"}</span>
              <span>
                <Clock size={14} />
                {job.scheduledAt ? new Date(job.scheduledAt).toLocaleString() : "Unscheduled"}
              </span>
            </div>

            {user?.role !== "CLIENT" && (
              <div className="inline-controls">
                <select
                  value={job.status}
                  onChange={(event) =>
                    updateStatus.mutate({ id: job.id, status: event.target.value as JobStatus })
                  }
                >
                  {allowedStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status.replace("_", " ")}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="notes">
              {job.notes.slice(0, 3).map((note) => (
                <p key={note.id}>
                  <strong>{note.author.name}</strong>: {note.body}
                </p>
              ))}
            </div>

            {job.attachments.length > 0 && (
              <div className="notes">
                {job.attachments.slice(0, 3).map((attachment) => (
                  <p key={attachment.id}>
                    <Paperclip size={14} /> {attachment.originalFilename} ·{" "}
                    {Math.ceil(attachment.sizeBytes / 1024)} KB
                  </p>
                ))}
              </div>
            )}

            {user?.role !== "CLIENT" && (
              <div className="note-compose">
                <input
                  placeholder="Add a job note"
                  value={noteByJob[job.id] ?? ""}
                  onChange={(event) =>
                    setNoteByJob((current) => ({ ...current, [job.id]: event.target.value }))
                  }
                />
                <Button
                  type="button"
                  onClick={() => addNote.mutate({ id: job.id, body: noteByJob[job.id] ?? "" })}
                  disabled={!noteByJob[job.id]}
                >
                  Add
                </Button>
              </div>
            )}

            <div className="note-compose">
              <label className="file-upload">
                <Upload size={14} />
                <span>Upload attachment</span>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp,.txt"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      uploadAttachment.mutate({ id: job.id, file });
                      event.currentTarget.value = "";
                    }
                  }}
                />
              </label>
            </div>
          </article>
        ))}
      </div>

      {jobs.data?.pagination && (
        <div className="inline-controls">
          <Button
            type="button"
            disabled={!jobs.data.pagination.hasPreviousPage}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            Previous
          </Button>
          <span className="muted">
            Page {jobs.data.pagination.page} of {Math.max(1, jobs.data.pagination.totalPages)} ·{" "}
            {jobs.data.pagination.total} jobs
          </span>
          <Button
            type="button"
            disabled={!jobs.data.pagination.hasNextPage}
            onClick={() => setPage((current) => current + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </Panel>
  );
}
