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
import { CookieConsent } from "~/components/CookieConsent";
import { ToastProvider, useToast } from "~/components/ui/toast";
import { logger } from "~/lib/logger";
import { logClientErrorServerFn } from "~/server/errorReporting";
import { CONTACT_PHONE_DISPLAY, CONTACT_PHONE_TEL } from "~/lib/contact";
import { GOOGLE_ADS_ID } from "~/lib/googleAds";
import { initPostHog, posthog } from "~/lib/posthog";
import appCss from "~/styles/app.css?url";

/**
 * Google Consent Mode v2 default state, read from localStorage before
 * gtag.js loads. Must ship "denied" unless a prior explicit choice was
 * stored — /confidentialite already promises no advertising cookie is set
 * without consent, so this can't default to granted.
 */
const CONSENT_DEFAULT_SCRIPT = `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
window.gtag = gtag;
var storedConsent = null;
try { storedConsent = localStorage.getItem('dt_cookie_consent'); } catch (e) {}
var granted = storedConsent === 'granted';
gtag('consent', 'default', {
  ad_storage: granted ? 'granted' : 'denied',
  ad_user_data: granted ? 'granted' : 'denied',
  ad_personalization: granted ? 'granted' : 'denied',
  analytics_storage: granted ? 'granted' : 'denied'
});
`;

const GTAG_CONFIG_SCRIPT = `
gtag('js', new Date());
gtag('config', '${GOOGLE_ADS_ID}');
`;

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
 * Démarre PostHog au montage (client only) puis capture un $pageview manuel
 * à chaque changement d'URL — TanStack Router navigue en SPA sans
 * rechargement complet, donc l'autocapture de pageview de posthog-js
 * (capture_pageview: false, voir src/lib/posthog.ts) ne suffit pas seule.
 */
function PostHogTracker() {
  const href = useRouterState({ select: (s) => s.location.href });

  useEffect(() => {
    initPostHog();
    posthog.capture("$pageview");
  }, [href]);

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
      { name: "theme-color", content: "#1244E8" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap",
      },
      { rel: "icon", href: "/favicon.ico", sizes: "any" },
      { rel: "icon", type: "image/svg+xml", href: "/brand/docteur-taxi-badge.svg" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
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
        {/* Google Consent Mode default must be pushed before gtag.js loads. */}
        <script dangerouslySetInnerHTML={{ __html: CONSENT_DEFAULT_SCRIPT }} />
        <script async src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`} />
        <script dangerouslySetInnerHTML={{ __html: GTAG_CONFIG_SCRIPT }} />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <GlobalErrorListener />
            <AuthRedirectListener />
            <PostHogTracker />
            <Navbar />
            <main id="main-content">{children}</main>
            <Footer />
            <CookieConsent />
            {import.meta.env.DEV && <ReactQueryDevtools />}
          </ToastProvider>
        </QueryClientProvider>
        <Scripts />
      </body>
    </html>
  );
}
