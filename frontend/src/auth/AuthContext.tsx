"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api, getAccessToken, setAccessToken } from "../api/client";
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
    let cancelled = false;

    async function restoreSession() {
      try {
        const data = await api<LoginResponse>("/auth/refresh", { method: "POST" });

        if (cancelled) {
          return;
        }

        setAccessToken(data.accessToken ?? data.token);
        setUser(data.user);
      } catch {
        if (!cancelled) {
          setAccessToken(undefined);
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setReady(true);
        }
      }
    }

    void restoreSession();

    return () => {
      cancelled = true;
    };
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
        setAccessToken(data.accessToken ?? data.token);
        setUser(data.user);
      },
      async logout() {
        await api<void>("/auth/logout", { method: "POST" }).catch(() => undefined);
        setAccessToken(undefined);
        setUser(null);
      }
    }),
    [ready, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAccessToken() {
  return getAccessToken();
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
