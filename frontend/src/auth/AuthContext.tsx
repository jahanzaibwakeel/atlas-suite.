import { createContext, useContext, useMemo, useState } from "react";
import { api } from "../api/client";
import type { User } from "../types";

type LoginResponse = {
  token: string;
  user: User;
};

type AuthContextValue = {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const raw = localStorage.getItem("fieldops_user");
    return raw ? JSON.parse(raw) : null;
  });

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      async login(email, password) {
        const data = await api<LoginResponse>("/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password })
        });
        localStorage.setItem("fieldops_token", data.token);
        localStorage.setItem("fieldops_user", JSON.stringify(data.user));
        setUser(data.user);
      },
      logout() {
        localStorage.removeItem("fieldops_token");
        localStorage.removeItem("fieldops_user");
        setUser(null);
      }
    }),
    [user]
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
