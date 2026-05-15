/**
 * Registers the Alertify service worker when enabled.
 * Disabled in dev by default (avoids fighting Vite HMR); set VITE_ENABLE_SW=1 to test locally.
 */
export function shouldRegisterServiceWorker(): boolean {
  if (typeof window === "undefined") return false;
  if (!("serviceWorker" in navigator)) return false;
  if (import.meta.env.PROD) return true;
  return import.meta.env.VITE_ENABLE_SW === "1" || import.meta.env.VITE_ENABLE_SW === "true";
}

function serviceWorkerUrlAndScope(): { url: string; scope: string } {
  const base = import.meta.env.BASE_URL || "/";
  const scope = base.endsWith("/") ? base : `${base}/`;
  const url = `${scope}alertify-sw.js`;
  return { url, scope };
}

export async function registerAlertifyServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!shouldRegisterServiceWorker()) return null;
  try {
    const { url, scope } = serviceWorkerUrlAndScope();
    const reg = await navigator.serviceWorker.register(url, { scope });
    return reg;
  } catch (e) {
    console.warn("[Alertify] Service worker registration failed:", e);
    return null;
  }
}
