import { useEffect, useRef, useState } from "react";

export const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string;

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string;
      reset: (widgetId: string) => void;
    };
  }
}

/**
 * Loads the Cloudflare Turnstile widget script once and renders it into
 * containerRef. Shared between any form that needs anti-bot verification
 * (booking lookup, admin login) — see src/server/turnstile.ts for the
 * matching server-side verification call.
 */
export function useTurnstile(siteKey: string) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [token, setToken] = useState("");

  useEffect(() => {
    if (!siteKey) return;

    const renderWidget = () => {
      if (!containerRef.current || !window.turnstile) return;
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        callback: (t: string) => setToken(t),
        "expired-callback": () => setToken(""),
      });
    };

    if (window.turnstile) {
      renderWidget();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
    script.async = true;
    script.onload = renderWidget;
    document.body.appendChild(script);

    return () => {
      script.remove();
    };
  }, [siteKey]);

  const reset = () => {
    if (window.turnstile && widgetIdRef.current) {
      window.turnstile.reset(widgetIdRef.current);
    }
    setToken("");
  };

  return { containerRef, token, reset };
}
