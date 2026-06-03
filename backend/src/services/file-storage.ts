import { mkdir, rm, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { randomUUID } from "node:crypto";
import { config } from "../config.js";

function safeExtension(filename: string) {
  const extension = extname(filename).toLowerCase();
  return extension.replace(/[^a-z0-9.]/g, "").slice(0, 12);
}

export async function storeJobAttachmentFile(input: {
  jobId: string;
  originalFilename: string;
  buffer: Buffer;
}) {
  const storedFilename = `${randomUUID()}${safeExtension(input.originalFilename)}`;
  const relativeDirectory = join("jobs", input.jobId);
  const absoluteDirectory = join(config.uploadDir, relativeDirectory);
  const relativePath = join(relativeDirectory, storedFilename);
  const absolutePath = join(config.uploadDir, relativePath);

  await mkdir(absoluteDirectory, { recursive: true });
  await writeFile(absolutePath, input.buffer, { flag: "wx" });

  return {
    storedFilename,
    storageKey: relativePath,
    absolutePath
  };
}

export async function deleteStoredFile(absolutePath: string) {
  await rm(absolutePath, { force: true });
}
