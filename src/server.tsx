import {
  createStartHandler,
  defaultStreamHandler,
} from "@tanstack/react-start/server";

// createRouter (./router.tsx) is picked up by convention by the TanStack
// Start Vite plugin — createStartHandler no longer takes it directly (API
// change between 1.132.0-alpha.25 and the 1.132.0 stable release).
const startFetch = createStartHandler(defaultStreamHandler);

// Pages under these prefixes are personalized (auth-gated dashboards, booking
// flow with per-session state, side-effecting cron/API endpoints) and must
// never be served from a shared CDN cache. Everything else — home, city/
// department/hospital/ALD SEO pages, blog, legal pages — renders the same
// HTML for every visitor, so it's safe to cache at the edge. This is what
// keeps repeat visits and crawler traffic from re-invoking the SSR function
// (and burning Fluid Active CPU) for content that hasn't changed.
const UNCACHEABLE_PREFIXES = [
  "/api",
  "/admin",
  "/tableau-de-bord",
  "/mes-reservations",
  "/reservation",
  "/confirmer-trajet",
  "/connexion",
  "/mot-de-passe-oublie",
  "/reinitialiser-mot-de-passe",
];

function isCacheableRequest(request: Request, pathname: string): boolean {
  if (request.method !== "GET" && request.method !== "HEAD") return false;
  return !UNCACHEABLE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export default {
  fetch: async (request: Request) => {
    const response = await startFetch(request);

    const { pathname } = new URL(request.url);
    if (
      response.status === 200 &&
      !response.headers.has("cache-control") &&
      isCacheableRequest(request, pathname)
    ) {
      const headers = new Headers(response.headers);
      // Edge cache for 1h; serve stale for up to a day while revalidating in
      // the background, so users never wait on a cold render.
      headers.set(
        "cache-control",
        "public, s-maxage=3600, stale-while-revalidate=86400"
      );
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    }

    return response;
  },
};
