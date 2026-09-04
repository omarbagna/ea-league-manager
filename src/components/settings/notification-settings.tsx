"use client";

import { useEffect, useState, useTransition } from "react";
import { Bell, BellOff, Check } from "lucide-react";
import {
  deletePushSubscription,
  savePushSubscription,
  updateNotificationPrefs,
} from "@/actions/notifications";
import {
  NOTIFICATION_CATEGORIES,
  type NotificationCategory,
} from "@/lib/notification-prefs";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToBuffer(base64: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const buf = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i);
  return buf;
}

function Toggle({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-6 w-10 shrink-0 rounded-full border transition-colors disabled:opacity-50",
        checked
          ? "border-primary-container bg-primary-container/30"
          : "border-outline-variant bg-surface-container-high"
      )}
    >
      <span
        className={cn(
          "absolute top-1/2 size-4 -translate-y-1/2 rounded-full transition-all",
          checked
            ? "left-[calc(100%-1.15rem)] bg-primary-container"
            : "left-0.5 bg-outline"
        )}
      />
    </button>
  );
}

export function NotificationSettings({
  initialPrefs,
}: {
  initialPrefs: Partial<Record<NotificationCategory, boolean>>;
}) {
  const [prefs, setPrefs] =
    useState<Partial<Record<NotificationCategory, boolean>>>(initialPrefs);
  const [saved, setSaved] = useState(false);
  const [, startTransition] = useTransition();

  const setCategory = (key: NotificationCategory, value: boolean) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    setSaved(false);
    startTransition(async () => {
      await updateNotificationPrefs(next);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    });
  };

  return (
    <div className="space-y-6">
      <ul className="divide-y divide-outline-variant/50">
        {NOTIFICATION_CATEGORIES.map((c) => {
          const enabled = prefs[c.key] !== false;
          return (
            <li
              key={c.key}
              className="flex items-start justify-between gap-4 py-3 first:pt-0"
            >
              <div>
                <p className="text-sm font-medium text-on-surface">{c.label}</p>
                <p className="mt-0.5 text-xs text-on-surface-variant">
                  {c.description}
                </p>
              </div>
              <Toggle
                checked={enabled}
                onChange={(v) => setCategory(c.key, v)}
                label={c.label}
              />
            </li>
          );
        })}
      </ul>
      {saved && (
        <p className="inline-flex items-center gap-1 font-data text-xs text-secondary-fixed">
          <Check className="size-3.5" />
          Saved
        </p>
      )}

      <div className="border-t border-outline-variant/50 pt-5">
        <PushToggle />
      </div>
    </div>
  );
}

function PushToggle() {
  const [state, setState] = useState<
    "loading" | "unsupported" | "unconfigured" | "on" | "off" | "denied"
  >("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window)
    ) {
      setState("unsupported");
      return;
    }
    if (!VAPID_PUBLIC_KEY) {
      setState("unconfigured");
      return;
    }
    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setState(sub ? "on" : "off"))
      .catch(() => setState("off"));
  }, []);

  const enable = async () => {
    setError(null);
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToBuffer(VAPID_PUBLIC_KEY as string),
      });
      const json = sub.toJSON();
      const res = await savePushSubscription({
        endpoint: sub.endpoint,
        p256dh: json.keys?.p256dh ?? "",
        auth: json.keys?.auth ?? "",
        userAgent: navigator.userAgent,
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      setState("on");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await deletePushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setState("off");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <p className="text-sm font-medium text-on-surface">Push notifications</p>
      <p className="mt-0.5 text-xs text-on-surface-variant">
        Get these on this device even when the app is closed.
      </p>

      <div className="mt-3">
        {state === "loading" && (
          <p className="font-data text-xs text-outline">Checking…</p>
        )}
        {state === "unsupported" && (
          <p className="font-data text-xs text-outline">
            This browser doesn&apos;t support push notifications.
          </p>
        )}
        {state === "unconfigured" && (
          <p className="font-data text-xs text-outline">
            Push isn&apos;t configured for this league yet.
          </p>
        )}
        {state === "denied" && (
          <p className="font-data text-xs text-warn">
            Blocked. Allow notifications for this site in your browser settings,
            then reload.
          </p>
        )}
        {state === "off" && (
          <Button size="sm" onClick={enable} loading={busy} disabled={busy}>
            <Bell className="size-4" />
            Enable on this device
          </Button>
        )}
        {state === "on" && (
          <Button
            size="sm"
            variant="outline"
            onClick={disable}
            loading={busy}
            disabled={busy}
          >
            <BellOff className="size-4" />
            Turn off on this device
          </Button>
        )}
        {error && <p className="mt-2 text-xs text-error">{error}</p>}
      </div>
    </div>
  );
}
