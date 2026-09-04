"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Spinner } from "@/components/ui/spinner";
import { markNotificationRead, markAllNotificationsRead } from "@/actions/notifications";
import type { Notification } from "@/types/database";
import { cn } from "@/lib/utils";

function notificationHref(n: Notification): string | null {
  const fixtureId = (n.payload as { fixture_id?: unknown })?.fixture_id;
  return typeof fixtureId === "string"
    ? `/matches/report?fixtureId=${fixtureId}`
    : null;
}

export function NotificationsBell() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const load = async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    setNotifications((data as Notification[]) ?? []);
  };

  useEffect(() => {
    load();
    const supabase = createClient();
    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        () => load()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const unread = notifications.filter((n) => !n.read_at).length;

  const handleRead = (id: string) => {
    startTransition(async () => {
      await markNotificationRead(id);
      await load();
    });
  };

  const handleClick = (n: Notification) => {
    const href = notificationHref(n);
    handleRead(n.id);
    if (href) {
      setOpen(false);
      router.push(href);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-busy={pending}
          className="relative rounded-full p-1 text-on-surface-variant hover:bg-surface-container-high hover:text-primary"
        >
          {pending ? (
            <Spinner size="sm" className="size-6" />
          ) : (
            <Bell className="size-6" />
          )}
          {!pending && unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-secondary-fixed text-[10px] font-bold text-on-secondary-fixed">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="max-h-80 overflow-y-auto">
        <div className="mb-2 flex items-center justify-between">
          <h4 className="font-display font-semibold text-primary">Notifications</h4>
          {unread > 0 && (
            <button
              type="button"
              disabled={pending}
              className="inline-flex items-center gap-1 text-xs text-primary-fixed hover:underline disabled:opacity-50"
              onClick={() =>
                startTransition(async () => {
                  await markAllNotificationsRead();
                  await load();
                })
              }
            >
              {pending && <Spinner size="sm" className="size-3" />}
              {pending ? "Updating…" : "Mark all read"}
            </button>
          )}
        </div>
        {notifications.length === 0 ? (
          <p className="py-4 text-center text-sm text-on-surface-variant">No notifications</p>
        ) : (
          <ul className="space-y-2">
            {notifications.map((n) => {
              const href = notificationHref(n);
              return (
                <li
                  key={n.id}
                  className={cn(
                    "cursor-pointer rounded-lg border border-outline-variant/50 p-2 text-sm transition-colors hover:bg-surface-container-high",
                    !n.read_at && "border-primary-container/30 bg-primary-container/5",
                    pending && "pointer-events-none opacity-60"
                  )}
                  onClick={() => handleClick(n)}
                >
                  <p className="font-medium text-on-surface">{n.title}</p>
                  {n.body && (
                    <p className="mt-0.5 text-xs text-on-surface-variant">{n.body}</p>
                  )}
                  {href && (
                    <p className="mt-1 font-data text-[11px] text-primary-fixed">
                      Report now →
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
