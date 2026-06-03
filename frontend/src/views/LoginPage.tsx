"use client";

import { BriefcaseBusiness } from "lucide-react";
import { FormEvent, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { Button } from "../components/ui/Button";

const demoUsers = [
  ["Admin", "admin@fieldops.test"],
  ["Technician", "tech@fieldops.test"],
  ["Client", "client@fieldops.test"]
] as const;

export function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("admin@fieldops.test");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-panel">
        <div className="brand">
          <BriefcaseBusiness size={30} />
          <div>
            <h1>FieldOps</h1>
            <p>Field service operations console</p>
          </div>
        </div>

        <form onSubmit={submit} className="form-stack">
          <label>
            Email
            <input value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {error && <p className="error">{error}</p>}
          <Button variant="primary" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </Button>
        </form>

        <div className="demo-logins">
          {demoUsers.map(([label, demoEmail]) => (
            <button key={demoEmail} type="button" onClick={() => setEmail(demoEmail)}>
              {label}
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
