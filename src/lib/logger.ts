type LogLevel = "info" | "warn" | "error";

type LogMeta = Record<string, unknown>;

function emit(level: LogLevel, message: string, meta?: LogMeta) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta,
  };
  const line = JSON.stringify(entry);

  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

// Structured JSON logger. On Vercel, anything written to stdout/stderr during
// SSR or a server function shows up in the project's Runtime Logs, and the
// JSON shape lets you filter by `level`/`message`/metadata fields there.
// Calls made from client-rendered code only land in the browser console.
export const logger = {
  info: (message: string, meta?: LogMeta) => emit("info", message, meta),
  warn: (message: string, meta?: LogMeta) => emit("warn", message, meta),
  error: (message: string, meta?: LogMeta) => emit("error", message, meta),
};
