"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarPlus } from "lucide-react";
import { FormEvent, useState } from "react";
import { api } from "../../api/client";
import type { Job, JobStatus, User } from "../../types";
import { JobsBoard } from "../jobs/JobsBoard";

type Overview = {
  totalJobs: number;
  usersByRole: Array<{ role: string; _count: number }>;
  jobsByStatus: Array<{ status: JobStatus; _count: number }>;
  recentActivity: Array<{
    id: string;
    action: string;
    createdAt: string;
    actor: { name: string; role: string };
  }>;
};

export function AdminDashboard() {
  const queryClient = useQueryClient();
  const overview = useQuery({
    queryKey: ["admin-overview"],
    queryFn: () => api<Overview>("/admin/overview")
  });
  const clients = useQuery({
    queryKey: ["clients"],
    queryFn: () => api<{ clients: User[] }>("/users/clients")
  });
  const technicians = useQuery({
    queryKey: ["technicians"],
    queryFn: () => api<{ technicians: User[] }>("/users/technicians")
  });

  const [form, setForm] = useState({
    title: "",
    description: "",
    clientId: "",
    technicianId: "",
    scheduledAt: ""
  });

  const createJob = useMutation({
    mutationFn: () =>
      api<{ job: Job }>("/jobs", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          technicianId: form.technicianId || null,
          scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : null
        })
      }),
    onSuccess: () => {
      setForm({ title: "", description: "", clientId: "", technicianId: "", scheduledAt: "" });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    createJob.mutate();
  }

  return (
    <div className="dashboard-grid">
      <section className="metrics-row">
        <Metric label="Total jobs" value={overview.data?.totalJobs ?? 0} />
        {(overview.data?.jobsByStatus ?? []).map((item) => (
          <Metric key={item.status} label={item.status.replace("_", " ")} value={item._count} />
        ))}
      </section>

      <section className="two-column">
        <form className="panel form-stack" onSubmit={submit}>
          <div className="section-title">
            <CalendarPlus size={20} />
            <h2>Create and assign job</h2>
          </div>
          <label>
            Title
            <input
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              required
            />
          </label>
          <label>
            Description
            <textarea
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              required
            />
          </label>
          <label>
            Client
            <select
              value={form.clientId}
              onChange={(event) => setForm({ ...form, clientId: event.target.value })}
              required
            >
              <option value="">Select client</option>
              {clients.data?.clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Technician
            <select
              value={form.technicianId}
              onChange={(event) => setForm({ ...form, technicianId: event.target.value })}
            >
              <option value="">Unassigned</option>
              {technicians.data?.technicians.map((technician) => (
                <option key={technician.id} value={technician.id}>
                  {technician.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Scheduled time
            <input
              type="datetime-local"
              value={form.scheduledAt}
              onChange={(event) => setForm({ ...form, scheduledAt: event.target.value })}
            />
          </label>
          {createJob.error && <p className="error">{createJob.error.message}</p>}
          <button className="primary-button" disabled={createJob.isPending}>
            {createJob.isPending ? "Creating..." : "Create job"}
          </button>
        </form>

        <section className="panel">
          <div className="section-title">
            <h2>Recent activity</h2>
          </div>
          <div className="activity-list">
            {(overview.data?.recentActivity ?? []).map((activity) => (
              <article key={activity.id}>
                <strong>{activity.action.replaceAll("_", " ")}</strong>
                <span>
                  {activity.actor.name} · {new Date(activity.createdAt).toLocaleString()}
                </span>
              </article>
            ))}
          </div>
        </section>
      </section>

      <JobsBoard />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
