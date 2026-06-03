import { CheckCircle2 } from "lucide-react";
import type { JobStatus } from "../../types";

export function StatusBadge({ status }: { status: JobStatus }) {
  const complete = status === "COMPLETED";

  return (
    <span className={`status-badge ${complete ? "complete" : ""}`}>
      {complete && <CheckCircle2 size={14} />}
      {status.replace("_", " ")}
    </span>
  );
}
