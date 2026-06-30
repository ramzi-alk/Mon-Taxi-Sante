import pino from "pino";

type LogMeta = Record<string, unknown>;

const level =
  (typeof process !== "undefined" && process.env?.LOG_LEVEL) || "info";

const pinoLogger = pino({
  level,
  base: null,
  messageKey: "message",
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label) => ({ level: label }),
  },
});

// Structured JSON logger backed by pino. On Vercel, anything written to
// stdout/stderr during SSR or a server function shows up in the project's
// Runtime Logs, and the JSON shape lets you filter by `level`/`message`/
// metadata fields there. Bundlers swap in pino's browser build for
// client-rendered code, where calls only land in the browser console.
export const logger = {
  info: (message: string, meta?: LogMeta) => pinoLogger.info(meta ?? {}, message),
  warn: (message: string, meta?: LogMeta) => pinoLogger.warn(meta ?? {}, message),
  error: (message: string, meta?: LogMeta) => pinoLogger.error(meta ?? {}, message),
};

// Wraps a server function's body so every call is traceable in Vercel
// Runtime Logs without each handler having to remember to log itself: one
// line on success (with duration) and one on failure (with duration, error
// message and stack) before the error is rethrown so existing onError
// handlers on the client keep working unchanged.
export async function withServerFnLogging<T>(
  name: string,
  meta: LogMeta,
  fn: () => Promise<T>
): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    logger.info(`serverFn.${name}`, { ...meta, durationMs: Date.now() - start });
    return result;
  } catch (error) {
    logger.error(`serverFn.${name} failed`, {
      ...meta,
      durationMs: Date.now() - start,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}
