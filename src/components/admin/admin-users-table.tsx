"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  ShieldCheck,
  ShieldOff,
  Users,
  UserRoundCheck,
  UserRoundX,
} from "lucide-react";
import { setUserBanned, setUserRole } from "@/actions/users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusPill } from "@/components/ui/status-pill";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

type UserRow = {
  id: string;
  email: string;
  team_name: string | null;
  ea_id: string | null;
  role: "admin" | "player";
  is_banned: boolean;
};

type Filter = "all" | "admins" | "banned";

export function AdminUsersTable({
  users,
  currentUserId,
}: {
  users: UserRow[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return users.filter((u) => {
      if (filter === "admins" && u.role !== "admin") return false;
      if (filter === "banned" && !u.is_banned) return false;
      if (!needle) return true;
      return [u.email, u.team_name, u.ea_id]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(needle));
    });
  }, [users, q, filter]);

  const run = (id: string, action: () => Promise<unknown>) => {
    setPendingId(id);
    startTransition(async () => {
      await action();
      router.refresh();
      setPendingId(null);
    });
  };

  const filters: { key: Filter; label: string }[] = [
    { key: "all", label: `All ${users.length}` },
    { key: "admins", label: "Admins" },
    { key: "banned", label: "Banned" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:max-w-xs sm:flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-outline" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search email, team, EA ID"
            className="pl-10"
            aria-label="Search users"
          />
        </div>
        <div className="flex overflow-hidden rounded-lg border border-outline-variant">
          {filters.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              aria-pressed={filter === f.key}
              className={cn(
                "px-3 py-2 font-data text-xs transition-colors",
                filter === f.key
                  ? "bg-primary-container text-on-primary-container"
                  : "text-on-surface-variant hover:bg-surface-container-high"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <EmptyState
          icon={Users}
          compact
          title="No users match"
          description="Clear the search or filter to see everyone."
        />
      ) : (
        <ul className="overflow-hidden rounded-xl border border-outline-variant bg-card">
          {shown.map((u) => {
            const busy = pendingId === u.id;
            const isSelf = u.id === currentUserId;
            return (
              <li
                key={u.id}
                className={cn(
                  "flex flex-col gap-3 border-b border-outline-variant/50 p-4 last:border-0 sm:flex-row sm:items-center sm:justify-between",
                  busy && "pointer-events-none opacity-60"
                )}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-medium text-on-surface">
                      {u.email}
                    </span>
                    {u.role === "admin" && (
                      <StatusPill tone="info" icon={ShieldCheck}>
                        Admin
                      </StatusPill>
                    )}
                    {u.is_banned && (
                      <StatusPill tone="critical">Banned</StatusPill>
                    )}
                    {isSelf && (
                      <span className="font-data text-[10px] uppercase tracking-wide text-outline">
                        You
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 font-data text-xs text-on-surface-variant">
                    {u.team_name?.trim() || "no team"}
                    {u.ea_id ? ` · EA: ${u.ea_id}` : ""}
                  </p>
                </div>

                {!isSelf && (
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      loading={busy}
                      disabled={busy}
                      onClick={() =>
                        run(u.id, () =>
                          setUserRole(
                            u.id,
                            u.role === "admin" ? "player" : "admin"
                          )
                        )
                      }
                    >
                      {u.role === "admin" ? (
                        <ShieldOff className="size-4" />
                      ) : (
                        <ShieldCheck className="size-4" />
                      )}
                      {u.role === "admin" ? "Make player" : "Make admin"}
                    </Button>
                    <Button
                      size="sm"
                      variant={u.is_banned ? "outline" : "destructive"}
                      loading={busy}
                      disabled={busy}
                      onClick={() =>
                        run(u.id, () => setUserBanned(u.id, !u.is_banned))
                      }
                    >
                      {u.is_banned ? (
                        <UserRoundCheck className="size-4" />
                      ) : (
                        <UserRoundX className="size-4" />
                      )}
                      {u.is_banned ? "Unban" : "Ban"}
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
