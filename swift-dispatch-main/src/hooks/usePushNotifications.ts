import { useEffect, useRef } from "react";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

/** Registra service worker e inscrição Web Push quando habilitado no servidor. */
export function usePushNotifications(enabled: boolean) {
  const subscribedRef = useRef(false);

  useEffect(() => {
    if (!enabled || subscribedRef.current) return;
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    let cancelled = false;

    (async () => {
      try {
        const keyRes = await fetch("/api/push/vapid-public-key");
        const keyData = (await keyRes.json()) as { enabled?: boolean; publicKey?: string };
        if (!keyData.enabled || !keyData.publicKey || cancelled) return;

        const permission = await Notification.requestPermission();
        if (permission !== "granted" || cancelled) return;

        const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        await navigator.serviceWorker.ready;

        let subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(keyData.publicKey),
          });
        }

        const json = subscription.toJSON();
        if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return;

        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            endpoint: json.endpoint,
            keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
          }),
        });

        if (!cancelled) subscribedRef.current = true;
      } catch {
        /* push opcional — falha silenciosa */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled]);
}
