export async function sendEmailVerification(input: { to: string; token: string }) {
  const url = `http://localhost:5173/verify-email?token=${encodeURIComponent(input.token)}`;
  console.log("[dev-email] Email verification", { to: input.to, url });
}

export async function sendPasswordReset(input: { to: string; token: string }) {
  const url = `http://localhost:5173/reset-password?token=${encodeURIComponent(input.token)}`;
  console.log("[dev-email] Password reset", { to: input.to, url });
}
