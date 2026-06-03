import { JobStatus, Role } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { canCreateJobNote, canUpdateJobStatus, visibleJobWhere } from "./job.policy.js";
import type { AuthUser } from "../../types.js";

const admin: AuthUser = { id: "admin-1", email: "admin@test", role: Role.ADMIN };
const technician: AuthUser = { id: "tech-1", email: "tech@test", role: Role.TECHNICIAN };
const client: AuthUser = { id: "client-1", email: "client@test", role: Role.CLIENT };

describe("job authorization policy", () => {
  it("scopes visible jobs by role", () => {
    expect(visibleJobWhere(admin)).toEqual({});
    expect(visibleJobWhere(technician)).toEqual({ technicianId: technician.id });
    expect(visibleJobWhere(client)).toEqual({ clientId: client.id });
  });

  it("allows technicians to update only assigned jobs to allowed statuses", () => {
    expect(
      canUpdateJobStatus({
        user: technician,
        job: { technicianId: technician.id },
        nextStatus: JobStatus.IN_PROGRESS
      })
    ).toBe(true);

    expect(
      canUpdateJobStatus({
        user: technician,
        job: { technicianId: "other-tech" },
        nextStatus: JobStatus.IN_PROGRESS
      })
    ).toBe(false);

    expect(
      canUpdateJobStatus({
        user: technician,
        job: { technicianId: technician.id },
        nextStatus: JobStatus.CANCELLED
      })
    ).toBe(false);
  });

  it("prevents clients from creating internal notes", () => {
    expect(
      canCreateJobNote({
        user: client,
        job: { clientId: client.id, technicianId: technician.id },
        isInternal: true
      })
    ).toBe(false);

    expect(
      canCreateJobNote({
        user: client,
        job: { clientId: client.id, technicianId: technician.id },
        isInternal: false
      })
    ).toBe(true);
  });
});
