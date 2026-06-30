import { createServerFn } from "@tanstack/react-start";
import { logger } from "~/lib/logger";

// Client-side render exceptions only ever reach the browser console — pino's
// browser build doesn't write to stdout, so nothing shows up in Vercel
// Runtime Logs. This relays the error through a server function so it gets
// logged server-side where it's actually visible.
export const logClientErrorServerFn = createServerFn({ method: "POST" })
  .validator(
    (input: { message: string; stack?: string; url?: string; userAgent?: string }) => input
  )
  .handler(async ({ data }) => {
    logger.error("client.renderError", {
      message: data.message,
      stack: data.stack,
      url: data.url,
      userAgent: data.userAgent,
    });
  });
