import {
  createRootRouteWithContext,
  Outlet,
  HeadContent,
  Scripts,
  useRouterState,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useEffect, type ReactNode } from "react";
import { Navbar } from "~/components/Navbar";
import { Footer } from "~/components/Footer";
import { ToastProvider, useToast } from "~/components/ui/toast";
import { logger } from "~/lib/logger";
import { logClientErrorServerFn } from "~/server/errorReporting";
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

  useEffect(() => {
    logClientErrorServerFn({
      data: {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        url: window.location.href,
        userAgent: navigator.userAgent,
      },
    }).catch(() => {
      // Best-effort — don't let logging failures compound the original error.
    });
  }, [error]);

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

/**
 * Catches errors React's error boundary never sees: thrown in event
 * handlers, timers, or rejected promises that nobody awaited. Without this,
 * those failures only ever reach the browser console (invisible in Vercel
 * Runtime Logs) — relay them through the same server-side logger as
 * RouteError above.
 */
function GlobalErrorListener() {
  useEffect(() => {
    const reportError = (message: string, stack?: string) => {
      logClientErrorServerFn({
        data: { message, stack, url: window.location.href, userAgent: navigator.userAgent },
      }).catch(() => {
        // Best-effort — don't let logging failures compound the original error.
      });
    };

    const onError = (event: ErrorEvent) => {
      reportError(event.message, event.error instanceof Error ? event.error.stack : undefined);
    };
    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      reportError(
        reason instanceof Error ? reason.message : String(reason),
        reason instanceof Error ? reason.stack : undefined
      );
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  return null;
}

/**
 * Supabase Auth (GoTrue) redirects here after /auth/v1/verify with the
 * outcome appended as a URL hash fragment (#access_token=... on success,
 * #error=...&error_code=...&error_description=... on failure). Without
 * this, a successful confirmation looks identical to a plain page load,
 * so users re-click the (now consumed, single-use) link and hit
 * otp_expired. This surfaces a clear message and strips the hash.
 */
function AuthRedirectListener() {
  const { toast } = useToast();

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash || hash.length < 2) return;

    const params = new URLSearchParams(hash.slice(1));
    const errorCode = params.get("error_code");
    const accessToken = params.get("access_token");
    const type = params.get("type");

    if (errorCode) {
      toast({
        title:
          errorCode === "otp_expired"
            ? "Ce lien a déjà été utilisé"
            : "Erreur de confirmation",
        description:
          errorCode === "otp_expired"
            ? "Ce lien de confirmation est à usage unique et a déjà été utilisé. Si vous l'avez déjà cliqué une première fois, votre compte est probablement déjà confirmé : essayez de vous connecter. Sinon, demandez un nouvel e-mail."
            : "Une erreur est survenue lors de la confirmation. Réessayez ou demandez un nouvel e-mail.",
        variant: "error",
      });
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    } else if (accessToken) {
      toast({
        title: type === "recovery" ? "Vous pouvez réinitialiser votre mot de passe" : "Compte confirmé !",
        description:
          type === "recovery"
            ? undefined
            : "Votre adresse e-mail a été confirmée avec succès. Vous pouvez désormais vous connecter.",
        variant: "success",
      });
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }, [toast]);

  return null;
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
  // Pages d'aperçu autonomes (ex. rebranding) : elles composent leur propre
  // habillage de bout en bout, le chrome public ne doit pas s'y superposer.
  const hideChrome = useRouterState({
    select: (s) => s.location.pathname.startsWith("/preview/"),
  });

  return (
    <html lang="fr" className="scroll-smooth">
      <head>
        <HeadContent />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <GlobalErrorListener />
            <AuthRedirectListener />
            {!hideChrome && <Navbar />}
            <main id="main-content">{children}</main>
            {!hideChrome && <Footer />}
            {import.meta.env.DEV && <ReactQueryDevtools />}
          </ToastProvider>
        </QueryClientProvider>
        <Scripts />
      </body>
    </html>
  );
}
