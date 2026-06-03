import { config } from "../config.js";

type LogLevel = "debug" | "info" | "warn" | "error";
type LogFields = Record<string, unknown>;

const levelRank: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
};

function shouldLog(level: LogLevel) {
  return levelRank[level] >= levelRank[config.logLevel];
}

function serializeValue(_key: string, value: unknown) {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack
    };
  }

  return value;
}

function writeLog(level: LogLevel, message: string, fields: LogFields = {}) {
  if (!shouldLog(level)) {
    return;
  }

  const entry = {
    timestamp: new Date().toISOString(),
    level,
    service: "atlas-suite-backend",
    environment: config.nodeEnv,
    message,
    ...fields
  };

  const line = JSON.stringify(entry, serializeValue);

  if (level === "error") {
    console.error(line);
    return;
  }

  if (level === "warn") {
    console.warn(line);
    return;
  }

  console.log(line);
}

export const logger = {
  debug(message: string, fields?: LogFields) {
    writeLog("debug", message, fields);
  },
  info(message: string, fields?: LogFields) {
    writeLog("info", message, fields);
  },
  warn(message: string, fields?: LogFields) {
    writeLog("warn", message, fields);
  },
  error(message: string, fields?: LogFields) {
    writeLog("error", message, fields);
  }
};
