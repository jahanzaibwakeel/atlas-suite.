"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../auth/AuthContext";
import { LoginPage } from "../../views/LoginPage";

export default function LoginRoute() {
  const { ready, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (ready && user) {
      router.replace("/");
    }
  }, [ready, router, user]);

  if (!ready || user) {
    return null;
  }

  return <LoginPage />;
}
