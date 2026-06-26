import {
  createRootRouteWithContext,
  Outlet,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import type { ReactNode } from "react";
import { Navbar } from "~/components/Navbar";
import { Footer } from "~/components/Footer";
import { ToastProvider } from "~/components/ui/toast";
import { logger } from "~/lib/logger";
import { CONTACT_PHONE_DISPLAY, CONTACT_PHONE_TEL } from "~/lib/contact";
import appCss from "~/styles/app.css?url";

interface RouterContext {
  queryClient: QueryClient;
}

function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-4xl font-bold text-gray-900">404</h1>
      <p className="text-lg text-gray-600">Page introuvable</p>
      <a href="/" className="btn-cta px-6 py-3 text-white">
        Retour à l'accueil
      </a>
    </div>
  );
}

function RouteError({ error, reset }: ErrorComponentProps) {
  logger.error("route.render failed", {
    error: error instanceof Error ? error.message : String(error),
  });

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center px-4">
      <h1 className="text-4xl font-bold text-gray-900">Une erreur est survenue</h1>
      <p className="text-lg text-gray-600 max-w-md">
        Désolé, quelque chose s&apos;est mal passé. Réessayez ou contactez-nous
        si le problème persiste.
      </p>
      <div className="flex items-center gap-3">
        <button onClick={reset} className="btn-cta px-6 py-3 text-white">
          Réessayer
        </button>
        <a
          href={`tel:${CONTACT_PHONE_TEL}`}
          className="rounded-xl border border-gray-200 px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Appeler le {CONTACT_PHONE_DISPLAY}
        </a>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "theme-color", content: "#1D6FD6" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap",
      },
      { rel: "icon", href: "/favicon.ico" },
    ],
  }),
  notFoundComponent: NotFound,
  errorComponent: RouteError,
  component: RootComponent,
});

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

function RootDocument({ children }: { children: ReactNode }) {
  const { queryClient } = Route.useRouteContext();

  return (
    <html lang="fr" className="scroll-smooth">
      <head>
        <HeadContent />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <Navbar />
            <main id="main-content">{children}</main>
            <Footer />
            {import.meta.env.DEV && <ReactQueryDevtools />}
          </ToastProvider>
        </QueryClientProvider>
        <Scripts />
      </body>
    </html>
  );
}
