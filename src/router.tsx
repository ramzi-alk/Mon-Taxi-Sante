import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { QueryClient } from "@tanstack/react-query";
import { routeTree } from "./routeTree.gen";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
    },
  },
});

// Named getRouter (not createRouter) — required by convention: the
// TanStack Start Vite plugin picks up this file as the "#tanstack-router-entry"
// virtual module and imports this exact export name from it, both for SSR
// (a fresh router per request) and for client hydration (API change between
// 1.132.0-alpha.25 and the 1.132.0 stable release).
export function getRouter() {
  return createTanStackRouter({
    routeTree,
    context: { queryClient },
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
    scrollRestoration: true,
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
