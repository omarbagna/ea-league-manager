"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  Trophy,
  Gamepad2,
  Plus,
  Settings,
  History,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { NotificationsBell } from "@/components/notifications/notifications-bell";
import { AppSignOutButton } from "@/components/auth/sign-out-button";
import { AppLogo } from "@/components/brand/app-logo";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/fixtures", label: "Fixtures", icon: Calendar },
  { href: "/standings", label: "Standings", icon: Trophy },
  { href: "/history", label: "History", icon: History },
  { href: "/matches/report", label: "Submit Score", icon: Gamepad2 },
  { href: "/settings", label: "Settings", icon: Settings },
];

// Mobile bottom bar stays at five; History lives in the sidebar and links.
const bottomNavItems = navItems.filter((i) => i.href !== "/history");

export function AppShell({
  children,
  seasonName,
  userEmail,
  isAdmin,
}: {
  children: React.ReactNode;
  seasonName?: string;
  userEmail?: string;
  isAdmin?: boolean;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen min-h-0 flex-col overflow-hidden bg-background md:flex-row">
      <nav className="fixed top-0 left-0 z-20 hidden h-full w-64 flex-col border-r border-outline-variant bg-surface-container-low p-3 md:flex">
        <div className="mb-8 px-2 pt-2">
          <AppLogo href="/dashboard" size="sm" showTitle />
          <p className="font-data mt-3 text-xs text-on-surface-variant uppercase">
            {seasonName ?? "Season"}
          </p>
        </div>
        <ul className="flex flex-1 flex-col gap-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 transition-all",
                    active
                      ? "bg-primary-container font-bold text-on-primary-container shadow-[inset_0_0_8px_rgba(51,214,227,0.15)]"
                      : "text-on-surface-variant hover:bg-surface-container-highest"
                  )}
                >
                  <Icon className="size-5" />
                  <span>{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="mt-auto space-y-2 border-t border-outline-variant pt-4">
          {userEmail && (
            <p className="truncate px-2 text-xs text-on-surface-variant" title={userEmail}>
              {userEmail}
            </p>
          )}
          {isAdmin && (
            <Link href="/admin">
              <Button variant="outline" className="w-full">
                Admin Panel
              </Button>
            </Link>
          )}
          <Link href="/matches/report">
            <Button variant="secondary" className="w-full">
              <Plus className="size-4" />
              Report Match
            </Button>
          </Link>
          <AppSignOutButton fullWidth />
        </div>
      </nav>

      <div className="flex min-h-0 flex-1 flex-col md:pl-64">
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-outline-variant bg-surface-container-lowest px-[var(--spacing-gutter)] shadow-[0_4px_24px_rgba(0,0,0,0.45)]">
          <AppLogo href="/dashboard" size="sm" showTitle className="md:hidden" />
          <nav className="hidden gap-6 lg:flex lg:items-end lg:self-stretch">
            {navItems.slice(0, 2).map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "pb-4 font-display text-sm font-semibold transition-colors",
                  pathname === href
                    ? "border-b-2 border-primary text-primary"
                    : "text-on-surface-variant hover:text-primary"
                )}
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <NotificationsBell />
            <span className="hidden max-w-[140px] truncate text-xs text-on-surface-variant md:inline lg:max-w-[200px]">
              {userEmail}
            </span>
            <AppSignOutButton />
          </div>
        </header>

        <main className="relative z-0 min-h-0 flex-1 overflow-y-auto px-[var(--spacing-margin-mobile)] py-6 md:px-[var(--spacing-margin-desktop)]">
          {children}
        </main>

        <nav className="fixed bottom-0 left-0 z-50 flex h-16 w-full items-center justify-around border-t border-outline-variant bg-surface px-1 pb-1 shadow-[0_-4px_20px_rgba(0,0,0,0.5)] md:hidden">
          {bottomNavItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex flex-col items-center gap-0.5 p-2 text-[10px]",
                  active ? "border-t-2 border-primary text-primary" : "text-on-surface-variant"
                )}
              >
                <Icon className="size-6" />
                {label.split(" ")[0]}
              </Link>
            );
          })}
        </nav>
        <div className="h-16 md:hidden" />
      </div>
    </div>
  );
}
