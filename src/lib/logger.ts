import pino from "pino";

type LogMeta = Record<string, unknown>;

const isServer = typeof process !== "undefined" && !!process.versions?.node;

const level = (isServer && process.env.LOG_LEVEL) || "info";

// Static fields stamped on every log line so a Vercel Runtime Logs export
// (or a log drain) can tell which deployment/region/commit produced it
// without cross-referencing the dashboard. Vercel sets these automatically
// on the server; there's nothing equivalent to stamp from the browser.
const baseFields = isServer
  ? {
      env: process.env.VERCEL_ENV || process.env.NODE_ENV || "development",
      ...(process.env.VERCEL_REGION ? { region: process.env.VERCEL_REGION } : {}),
      ...(process.env.VERCEL_GIT_COMMIT_SHA
        ? { commit: process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 7) }
        : {}),
    }
  : null;

const pinoLogger = pino({
  level,
  base: baseFields,
  messageKey: "message",
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label) => ({ level: label }),
  },
});

// Belt-and-braces scrubbing: nothing in this app deliberately logs secrets
// today, but `meta` is a free-form bag filled in ad hoc at ~50 call sites,
// and Vercel Runtime Logs are not a safe place for a token or password to
// end up by accident. Matches by key name regardless of nesting depth.
const SENSITIVE_KEY_PATTERN =
  /password|secret|token|authoriz|api[-_]?key|cookie|cvc|card[-_]?number|ssn/i;
const REDACTED = "[redacted]";
const MAX_REDACT_DEPTH = 6;

function redact(value: unknown, depth = 0): unknown {
  if (value == null || depth >= MAX_REDACT_DEPTH) return value;
  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1));
  if (typeof value === "object") {
    if (value instanceof Error) return value;
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      out[key] = SENSITIVE_KEY_PATTERN.test(key) ? REDACTED : redact(val, depth + 1);
    }
    return out;
  }
  return value;
}

// Marks an error as already logged (with its own context) so that a
// safety-net logger higher up the call chain — e.g. the global server
// function middleware in ~/start.ts — doesn't emit a second, redundant
// line for the same failure before rethrowing it.
const LOGGED_MARKER = Symbol.for("docteur-taxi.logger.logged");

export function markErrorLogged(error: unknown): void {
  if (error && typeof error === "object") {
    (error as Record<PropertyKey, unknown>)[LOGGED_MARKER] = true;
  }
}

export function isErrorLogged(error: unknown): boolean {
  return !!(error && typeof error === "object" && (error as Record<PropertyKey, unknown>)[LOGGED_MARKER]);
}

// Structured JSON logger backed by pino. On Vercel, anything written to
// stdout/stderr during SSR or a server function shows up in the project's
// Runtime Logs, and the JSON shape lets you filter by `level`/`message`/
// metadata fields there. Bundlers swap in pino's browser build for
// client-rendered code, where calls only land in the browser console.
export const logger = {
  debug: (message: string, meta?: LogMeta) => pinoLogger.debug(redact(meta ?? {}) as LogMeta, message),
  info: (message: string, meta?: LogMeta) => pinoLogger.info(redact(meta ?? {}) as LogMeta, message),
  warn: (message: string, meta?: LogMeta) => pinoLogger.warn(redact(meta ?? {}) as LogMeta, message),
  error: (message: string, meta?: LogMeta) => pinoLogger.error(redact(meta ?? {}) as LogMeta, message),
};

// Above this, a successful call is logged as a warning instead of info so
// slow server functions surface in Vercel Runtime Logs without needing an
// error to make them visible.
const SLOW_SERVER_FN_MS = 3000;

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
    const durationMs = Date.now() - start;
    if (durationMs > SLOW_SERVER_FN_MS) {
      logger.warn(`serverFn.${name} slow`, { ...meta, durationMs });
    } else {
      logger.info(`serverFn.${name}`, { ...meta, durationMs });
    }
    return result;
  } catch (error) {
    logger.error(`serverFn.${name} failed`, {
      ...meta,
      durationMs: Date.now() - start,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    markErrorLogged(error);
    throw error;
  }
}
