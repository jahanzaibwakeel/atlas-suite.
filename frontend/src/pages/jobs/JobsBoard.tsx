import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock, Wrench } from "lucide-react";
import { useState } from "react";
import { api } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import type { Job, JobStatus } from "../../types";

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

  const jobs = useQuery({
    queryKey: ["jobs"],
    queryFn: () => api<{ jobs: Job[] }>("/jobs")
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

  const allowedStatuses = user?.role === "ADMIN" ? adminStatuses : technicianStatuses;

  return (
    <section className="panel">
      <div className="section-title">
        <Wrench size={20} />
        <h2>{user?.role === "CLIENT" ? "Client job list" : "Jobs"}</h2>
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

            {user?.role !== "CLIENT" && (
              <div className="note-compose">
                <input
                  placeholder="Add a job note"
                  value={noteByJob[job.id] ?? ""}
                  onChange={(event) =>
                    setNoteByJob((current) => ({ ...current, [job.id]: event.target.value }))
                  }
                />
                <button
                  type="button"
                  onClick={() => addNote.mutate({ id: job.id, body: noteByJob[job.id] ?? "" })}
                  disabled={!noteByJob[job.id]}
                >
                  Add
                </button>
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

function StatusBadge({ status }: { status: JobStatus }) {
  const complete = status === "COMPLETED";
  return (
    <span className={`status-badge ${complete ? "complete" : ""}`}>
      {complete && <CheckCircle2 size={14} />}
      {status.replace("_", " ")}
    </span>
  );
}
