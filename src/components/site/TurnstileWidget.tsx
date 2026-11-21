import { useEffect, useRef } from "react";

type TurnstileApi = {
  render: (element: HTMLElement, options: Record<string, unknown>) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let scriptLoading: Promise<void> | null = null;
function ensureScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("Browser required"));
  if (window.turnstile) return Promise.resolve();
  if (scriptLoading) return scriptLoading;

  scriptLoading = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.onload = () => window.turnstile ? resolve() : reject(new Error("Turnstile unavailable"));
    script.onerror = () => reject(new Error("Turnstile could not load"));
    document.head.appendChild(script);
  }).catch((error) => {
    scriptLoading = null; // Permit retry after network error.
    throw error;
  });
  return scriptLoading;
}

/** Live-only, explicitly rendered Cloudflare Turnstile. Each quote form owns its widget. */
export function TurnstileWidget({
  siteKey,
  onToken,
  resetSignal,
}: {
  siteKey: string;
  onToken: (token: string | null) => void;
  resetSignal: number;
}) {
  const container = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    ensureScript().then(() => {
      if (cancelled || !container.current || !window.turnstile) return;
      widgetId.current = window.turnstile.render(container.current, {
        sitekey: siteKey,
        action: "cleaning_enquiry",
        theme: "auto",
        callback: (token: string) => onToken(token),
        "expired-callback": () => onToken(null),
        "error-callback": () => onToken(null),
        "timeout-callback": () => onToken(null),
      });
    }).catch(() => onToken(null));
    return () => {
      cancelled = true;
      if (widgetId.current) window.turnstile?.remove(widgetId.current);
      widgetId.current = null;
    };
  }, [siteKey, onToken]);

  useEffect(() => {
    if (resetSignal > 0 && widgetId.current) {
      window.turnstile?.reset(widgetId.current);
      onToken(null);
    }
  }, [resetSignal, onToken]);

  return <div ref={container} aria-label="Security verification" />;
}
