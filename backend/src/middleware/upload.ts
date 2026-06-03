import multer from "multer";
import { config } from "../config.js";
import { HttpError } from "../utils/http.js";

const allowedMimeTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/plain"
]);

export const uploadSingleAttachment = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.maxUploadBytes,
    files: 1
  },
  fileFilter: (_req, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      callback(new HttpError(400, "File type is not allowed", "FILE_TYPE_NOT_ALLOWED"));
      return;
    }

    callback(null, true);
  }
}).single("file");
