"use client";

import { Bell, LogOut } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../auth/AuthContext";
import { api } from "../api/client";
import type { Notification } from "../types";
import { Button } from "../components/ui/Button";
import { AdminDashboard } from "./admin/AdminDashboard";
import { JobsBoard } from "./jobs/JobsBoard";
import { useRealtimeInvalidation } from "../realtime/useRealtimeInvalidation";

export function Workspace() {
  const { user, logout } = useAuth();
  useRealtimeInvalidation();
  const notifications = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api<{ notifications: Notification[] }>("/notifications")
  });

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">AtlasSuite</p>
          <h1>{user?.role === "ADMIN" ? "Operations Dashboard" : "My Jobs"}</h1>
        </div>
        <div className="topbar-actions">
          <div className="notification-pill" title="Unread notifications">
            <Bell size={16} />
            {notifications.data?.notifications.filter((item) => !item.readAt).length ?? 0}
          </div>
          <div className="user-chip">
            <strong>{user?.name}</strong>
            <span>{user?.role}</span>
          </div>
          <Button variant="icon" onClick={logout} title="Sign out">
            <LogOut size={18} />
          </Button>
        </div>
      </header>

      {user?.role === "ADMIN" ? <AdminDashboard /> : <JobsBoard />}
    </main>
  );
}
