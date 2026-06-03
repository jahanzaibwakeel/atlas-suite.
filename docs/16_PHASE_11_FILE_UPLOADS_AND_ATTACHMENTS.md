# Phase 11: File Uploads and Attachments

This phase adds job attachments with secure upload handling.

## What We Added

Dependencies:

- `multer`
- `@types/multer`

Backend:

- `JobAttachment` database model
- upload configuration
- multipart upload middleware
- local file storage service
- `POST /api/v1/jobs/:id/attachments`

Frontend:

- `FormData` support in the API client
- attachment types
- upload control on job cards
- attachment metadata display

Docker:

- `atlas_uploads` volume
- `UPLOAD_DIR`
- `MAX_UPLOAD_BYTES`

## Why Uploads Are Security-Sensitive

File upload endpoints are dangerous because users control:

- filename
- file size
- file content
- MIME type
- upload frequency

Bad upload systems can lead to:

- disk exhaustion
- malware storage
- path traversal
- accidental public exposure
- memory pressure
- serving executable content

## Storage Design

The database stores metadata:

```txt
originalFilename
storedFilename
storageKey
mimeType
sizeBytes
jobId
uploadedById
```

The file bytes live in the configured upload directory.

This is intentional. Databases are good at metadata and relationships. Object/file storage is better for large binary data.

## Current Local Storage

Files are stored under:

```txt
UPLOAD_DIR/jobs/:jobId/:randomFilename
```

The random stored filename prevents collisions and avoids trusting user filenames as storage paths.

## Upload Flow

```txt
Frontend file input
  -> FormData
  -> POST /jobs/:id/attachments
  -> requireAuth
  -> Multer parses one file into memory
  -> service verifies job visibility
  -> file written to upload storage
  -> metadata inserted in PostgreSQL
  -> audit log inserted
  -> attachment returned
```

## Why Memory Storage

Multer memory storage means the file is not written to disk until our service authorizes the job.

Trade-off:

- safer authorization ordering
- requires strict file size limits

The limit is currently:

```txt
MAX_UPLOAD_BYTES=5242880
```

5 MB is acceptable for local learning. Larger production uploads should stream directly to object storage using pre-signed URLs.

## Allowed File Types

Current MIME allowlist:

- `application/pdf`
- `image/jpeg`
- `image/png`
- `image/webp`
- `text/plain`

MIME type checks are useful but not perfect. Production systems often inspect file signatures and run virus scanning.

## Transaction Boundary

File storage and database writes cannot be part of the same PostgreSQL transaction.

Current compensation:

```txt
write file
try database transaction
if database transaction fails, delete file
```

This is called compensating cleanup.

Production alternatives:

- object storage lifecycle cleanup for orphaned files
- upload staging area
- promote file after metadata commit
- background cleanup job

## Object Storage Alternative

Production SaaS systems usually use:

- AWS S3
- Cloudflare R2
- Google Cloud Storage
- Azure Blob Storage

Typical production flow:

```txt
API creates upload intent
frontend uploads directly to object storage using pre-signed URL
API finalizes metadata
worker scans/processes file
```

## Common Mistakes

- trusting original filenames as paths
- allowing unlimited file sizes
- serving private files from a public static directory
- relying only on frontend validation
- storing large files directly in PostgreSQL
- forgetting authorization before download/upload
- not cleaning up orphaned files
- not scanning uploads in production

## Verification

- Prisma client regenerated.
- Backend TypeScript no-emit passed.
- Frontend TypeScript no-emit passed.
- Prisma schema validation passed.
- Docker Compose config passed.
