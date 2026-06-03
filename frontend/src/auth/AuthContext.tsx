"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import type { User } from "../types";

type LoginResponse = {
  accessToken?: string;
  token: string;
  user: User;
};

type AuthContextValue = {
  user: User | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem("fieldops_user");
    setUser(raw ? JSON.parse(raw) : null);
    setReady(true);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      ready,
      async login(email, password) {
        const data = await api<LoginResponse>("/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password })
        });
        localStorage.setItem("fieldops_token", data.accessToken ?? data.token);
        localStorage.setItem("fieldops_user", JSON.stringify(data.user));
        setUser(data.user);
      },
      async logout() {
        await api<void>("/auth/logout", { method: "POST" }).catch(() => undefined);
        localStorage.removeItem("fieldops_token");
        localStorage.removeItem("fieldops_user");
        setUser(null);
      }
    }),
    [ready, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
