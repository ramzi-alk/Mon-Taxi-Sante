import { createMiddleware, createStart } from "@tanstack/react-start";
import { randomUUID } from "node:crypto";
import { isErrorLogged, logger, markErrorLogged } from "~/lib/logger";

// Loaded once per server instance (TanStack Start dynamically imports this
// module — see `#tanstack-start-entry` in createStartHandler — so it never
// reaches the browser bundle). Registers the global middleware every
// request and every server function go through, giving Vercel Runtime Logs
// full request-level coverage without touching each route/handler.

const SLOW_REQUEST_MS = 3000;

interface RequestScopedContext {
  requestId?: string;
}

// Every HTTP request TanStack Start handles — SSR page loads, `routes/api/*`
// handlers, cron endpoints, and the RPC calls a server function makes under
// the hood — passes through this middleware first. It stamps a requestId
// (reusing Vercel's own `x-vercel-id` when present, so it lines up with the
// platform's own request log) and logs one structured line per request with
// its method, path, status and duration.
const requestLoggingMiddleware = createMiddleware({ type: "request" }).server(
  async ({ request, next }) => {
    const requestId = request.headers.get("x-vercel-id") ?? randomUUID();
    // Not `pathname` from the middleware options: at this point in the
    // pipeline (global request middleware runs before route matching) it's
    // always empty — only populated later, once a route has been resolved.
    const pathname = new URL(request.url).pathname;
    const start = Date.now();

    try {
      const result = await next({ context: { requestId } satisfies RequestScopedContext });
      const durationMs = Date.now() - start;
      const status = result.response.status;

      const message = "http.request";
      const fields = { requestId, method: request.method, pathname, status, durationMs };
      if (status >= 500) {
        logger.error(message, fields);
      } else if (status >= 400 || durationMs > SLOW_REQUEST_MS) {
        logger.warn(message, fields);
      } else {
        logger.info(message, fields);
      }

      return result;
    } catch (error) {
      logger.error("http.request failed", {
        requestId,
        method: request.method,
        pathname,
        durationMs: Date.now() - start,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      markErrorLogged(error);
      throw error;
    }
  }
);

// Safety net around every server function call: `~/lib/logger`'s
// `withServerFnLogging` already gives most handlers a rich success/failure
// line, but a handful of server functions don't use it (see
// `src/server/errorReporting.ts`, `pushSend.ts`, `turnstile.ts`, `seo.ts`)
// and any new one added later could just as easily forget to. This catches
// whatever slips through so a failure never disappears silently into a
// generic Vercel function-crash log with no context. `isErrorLogged` avoids
// double-logging failures `withServerFnLogging` already reported.
const functionLoggingMiddleware = createMiddleware({ type: "function" }).server(
  async ({ next, functionId, context }) => {
    const start = Date.now();
    try {
      return await next();
    } catch (error) {
      if (!isErrorLogged(error)) {
        logger.error("serverFn.unhandled failed", {
          functionId,
          requestId: (context as RequestScopedContext | undefined)?.requestId,
          durationMs: Date.now() - start,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
        markErrorLogged(error);
      }
      throw error;
    }
  }
);

// Without these, an exception thrown outside any request (a rejected
// promise nobody awaited, a callback error) only ever surfaces as an opaque
// "FUNCTION_INVOCATION_FAILED" in Vercel with no message or stack attached.
// This module is meant to run server-side only, but unlike the middleware
// above (which TanStack Start's compiler strips from the client build),
// this plain top-level side effect isn't recognized by that compiler and
// does ship in the client bundle — so it's explicitly gated to never touch
// `process` (not polyfilled in the browser here) at runtime. Also guarded
// against re-registration across warm-lambda module re-imports and Vite
// dev-server HMR reloads of this file.
declare global {
  var __docteurTaxiProcessLoggingRegistered: boolean | undefined;
}

if (typeof window === "undefined" && !globalThis.__docteurTaxiProcessLoggingRegistered) {
  globalThis.__docteurTaxiProcessLoggingRegistered = true;

  process.on("uncaughtException", (error) => {
    logger.error("process.uncaughtException", { error: error.message, stack: error.stack });
  });

  process.on("unhandledRejection", (reason) => {
    logger.error("process.unhandledRejection", {
      error: reason instanceof Error ? reason.message : String(reason),
      stack: reason instanceof Error ? reason.stack : undefined,
    });
  });
}

export const startInstance = createStart(() => ({
  // The client bootstrap (`tz` in the built bundle) unconditionally does
  // `options.serializationAdapters.push(...)` once a `startInstance` is
  // registered — omitting this field left it `undefined` there, throwing
  // "Cannot read properties of undefined (reading 'push')" during
  // hydration and blanking out the whole page right after the server-
  // rendered HTML painted.
  serializationAdapters: [],
  requestMiddleware: [requestLoggingMiddleware],
  functionMiddleware: [functionLoggingMiddleware],
}));
