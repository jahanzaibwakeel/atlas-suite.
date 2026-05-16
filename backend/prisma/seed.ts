import bcrypt from "bcryptjs";
import { JobStatus, PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("password123", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@fieldops.test" },
    update: {},
    create: {
      name: "Amina Admin",
      email: "admin@fieldops.test",
      passwordHash,
      role: Role.ADMIN
    }
  });

  const technician = await prisma.user.upsert({
    where: { email: "tech@fieldops.test" },
    update: {},
    create: {
      name: "Tariq Technician",
      email: "tech@fieldops.test",
      passwordHash,
      role: Role.TECHNICIAN
    }
  });

  const secondTechnician = await prisma.user.upsert({
    where: { email: "sana.tech@fieldops.test" },
    update: {},
    create: {
      name: "Sana Technician",
      email: "sana.tech@fieldops.test",
      passwordHash,
      role: Role.TECHNICIAN
    }
  });

  const client = await prisma.user.upsert({
    where: { email: "client@fieldops.test" },
    update: {},
    create: {
      name: "Bilal Client",
      email: "client@fieldops.test",
      passwordHash,
      role: Role.CLIENT
    }
  });

  const secondClient = await prisma.user.upsert({
    where: { email: "ops@northstar.test" },
    update: {},
    create: {
      name: "Northstar Facilities",
      email: "ops@northstar.test",
      passwordHash,
      role: Role.CLIENT
    }
  });

  const count = await prisma.job.count();
  if (count === 0) {
    const job = await prisma.job.create({
      data: {
        title: "Repair warehouse loading dock sensor",
        description: "Sensor intermittently fails during morning dispatch window.",
        clientId: client.id,
        technicianId: technician.id,
        scheduledAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
        status: JobStatus.ASSIGNED,
        notes: {
          create: {
            body: "Client reports failures mostly before 10 AM.",
            authorId: admin.id
          }
        }
      }
    });

    await prisma.job.create({
      data: {
        title: "Quarterly fire panel inspection",
        description: "Perform standard inspection and upload findings in job notes.",
        clientId: secondClient.id,
        technicianId: secondTechnician.id,
        scheduledAt: new Date(Date.now() + 1000 * 60 * 60 * 48),
        status: JobStatus.ASSIGNED
      }
    });

    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        action: "SEED_JOB_CREATED",
        entityType: "Job",
        entityId: job.id,
        jobId: job.id,
        metadata: { source: "seed" }
      }
    });
  }

  console.log("Seed complete");
  console.table([
    { role: "Admin", email: admin.email, password: "password123" },
    { role: "Technician", email: technician.email, password: "password123" },
    { role: "Client", email: client.email, password: "password123" }
  ]);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
