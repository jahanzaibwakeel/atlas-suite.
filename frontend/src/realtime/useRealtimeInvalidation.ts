"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../auth/AuthContext";
import { connectRealtime, disconnectRealtime } from "./client";

export function useRealtimeInvalidation() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) {
      disconnectRealtime();
      return;
    }

    const token = localStorage.getItem("fieldops_token");
    if (!token) {
      return;
    }

    const socket = connectRealtime(token);

    socket.on("jobs:changed", () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
    });

    socket.on("notifications:changed", () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    });

    return () => {
      disconnectRealtime();
    };
  }, [queryClient, user]);
}
