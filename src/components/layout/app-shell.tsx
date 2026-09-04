"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  Trophy,
  Gamepad2,
  Medal,
  Plus,
  Settings,
  History,
  MoreHorizontal,
  ShieldHalf,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { NotificationsBell } from "@/components/notifications/notifications-bell";
import { AppSignOutButton } from "@/components/auth/sign-out-button";
import { AppLogo } from "@/components/brand/app-logo";
import {
  SidebarContextChip,
  SidebarNavGroupLabel,
  SidebarNavItem,
} from "@/components/layout/sidebar-nav-item";

const REPORT = { href: "/matches/report", label: "Report", icon: Gamepad2 };

const primaryNav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/fixtures", label: "Fixtures", icon: Calendar },
  { href: "/standings", label: "Standings", icon: Trophy },
  REPORT,
];

const secondaryNav = [
  { href: "/leaderboards", label: "Leaderboards", icon: Medal },
  { href: "/history", label: "History", icon: History },
  { href: "/settings", label: "Settings", icon: Settings },
];

const PAGE_TITLES: [string, string][] = [
  ["/dashboard", "Overview"],
  ["/fixtures", "Fixtures"],
  ["/standings", "Standings"],
  ["/matches/report", "Match Reporting"],
  ["/leaderboards", "Leaderboards"],
  ["/history", "Hall of Fame"],
  ["/settings", "Settings"],
  ["/teams", "Team"],
];

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function pageTitle(pathname: string): string {
  return PAGE_TITLES.find(([href]) => isActive(pathname, href))?.[1] ?? "";
}

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
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!moreOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [moreOpen]);

  const moreActive = secondaryNav.some((i) => isActive(pathname, i.href));
  const title = pageTitle(pathname);
  const emailInitial = (userEmail?.[0] ?? "?").toUpperCase();

  return (
    <div className="flex h-screen min-h-0 flex-col overflow-hidden bg-background md:flex-row">
      <nav className="fixed top-0 left-0 z-20 hidden h-full w-64 flex-col border-r border-outline-variant bg-surface-container-low p-3 md:flex">
        <div className="mb-4 px-2 pt-2">
          <AppLogo href="/dashboard" size="sm" showTitle />
          <div>
            <SidebarContextChip
              label={seasonName ?? "No season"}
              live={!!seasonName}
            />
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-0.5 overflow-y-auto pb-2">
          {primaryNav.map((item) => (
            <SidebarNavItem
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={isActive(pathname, item.href)}
            />
          ))}
          <SidebarNavGroupLabel>More</SidebarNavGroupLabel>
          {secondaryNav.map((item) => (
            <SidebarNavItem
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={isActive(pathname, item.href)}
            />
          ))}
        </div>

        <div className="mt-auto space-y-2.5 border-t border-outline-variant pt-3">
          {userEmail && (
            <div className="flex items-center gap-2 px-1">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-container-highest font-data text-xs font-bold text-on-surface-variant">
                {emailInitial}
              </span>
              <span
                className="truncate text-xs text-on-surface-variant"
                title={userEmail}
              >
                {userEmail}
              </span>
            </div>
          )}
          {isAdmin && (
            <Link
              href="/admin"
              className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs text-on-surface-variant transition-colors hover:bg-surface-container-high/60 hover:text-on-surface"
            >
              <ShieldHalf className="size-4" />
              Admin console
            </Link>
          )}
          <Link href="/matches/report" className="block">
            <Button variant="secondary" className="w-full">
              <Plus className="size-4" />
              Report a match
            </Button>
          </Link>
          <AppSignOutButton fullWidth />
        </div>
      </nav>

      <div className="flex min-h-0 flex-1 flex-col md:pl-64">
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-outline-variant bg-surface-container-lowest px-[var(--spacing-gutter)] shadow-[0_4px_24px_rgba(0,0,0,0.45)]">
          <AppLogo href="/dashboard" size="sm" showTitle className="md:hidden" />
          {title && (
            <span className="hidden font-display text-sm font-semibold text-on-surface md:inline">
              {title}
            </span>
          )}
          <div className="flex items-center gap-2 sm:gap-3">
            <NotificationsBell />
            <span className="hidden max-w-[140px] truncate text-xs text-on-surface-variant md:inline lg:max-w-[200px]">
              {userEmail}
            </span>
            <AppSignOutButton />
          </div>
        </header>

        <main className="relative z-0 min-h-0 flex-1 overflow-y-auto px-[var(--spacing-margin-mobile)] py-6 md:px-6 lg:px-[var(--spacing-margin-desktop)]">
          {children}
        </main>

        {/* Mobile "More" sheet */}
        {moreOpen && (
          <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
            <button
              type="button"
              className="absolute inset-0 bg-black/60"
              aria-label="Close menu"
              onClick={() => setMoreOpen(false)}
            />
            <div className="absolute bottom-0 left-0 w-full rounded-t-2xl border-t border-outline-variant bg-surface-container-low p-4 pb-8 shadow-[0_-8px_32px_rgba(0,0,0,0.6)]">
              <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-outline-variant" />
              <div className="mb-2 flex items-center justify-between">
                <span className="font-display font-semibold text-primary">More</span>
                <button
                  type="button"
                  aria-label="Close menu"
                  onClick={() => setMoreOpen(false)}
                  className="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-container-highest"
                >
                  <X className="size-5" />
                </button>
              </div>
              <div className="flex flex-col gap-0.5">
                {secondaryNav.map((item) => (
                  <SidebarNavItem
                    key={item.href}
                    href={item.href}
                    label={item.label}
                    icon={item.icon}
                    active={isActive(pathname, item.href)}
                    onNavigate={() => setMoreOpen(false)}
                  />
                ))}
                {isAdmin && (
                  <SidebarNavItem
                    href="/admin"
                    label="Admin console"
                    icon={ShieldHalf}
                    active={isActive(pathname, "/admin")}
                    onNavigate={() => setMoreOpen(false)}
                  />
                )}
              </div>
              {userEmail && (
                <p className="mt-3 truncate border-t border-outline-variant px-3 pt-3 text-xs text-on-surface-variant">
                  {userEmail}
                </p>
              )}
              <div className="mt-2 px-1">
                <AppSignOutButton fullWidth />
              </div>
            </div>
          </div>
        )}

        <nav className="fixed bottom-0 left-0 z-40 flex h-16 w-full items-center justify-around border-t border-outline-variant bg-surface px-1 pb-1 shadow-[0_-4px_20px_rgba(0,0,0,0.5)] md:hidden">
          {primaryNav.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className="flex min-w-0 flex-1 flex-col items-center gap-1 p-1.5 text-[11px]"
              >
                <span
                  className={cn(
                    "flex size-9 items-center justify-center rounded-lg transition-colors",
                    active
                      ? "bg-primary-container/[0.14] text-primary-fixed"
                      : "text-on-surface-variant"
                  )}
                >
                  <Icon className="size-5 shrink-0" />
                </span>
                <span
                  className={cn(
                    "truncate",
                    active ? "text-primary-fixed" : "text-on-surface-variant"
                  )}
                >
                  {label}
                </span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-label="More"
            className="flex min-w-0 flex-1 flex-col items-center gap-1 p-1.5 text-[11px]"
          >
            <span
              className={cn(
                "flex size-9 items-center justify-center rounded-lg transition-colors",
                moreActive || moreOpen
                  ? "bg-primary-container/[0.14] text-primary-fixed"
                  : "text-on-surface-variant"
              )}
            >
              <MoreHorizontal className="size-5 shrink-0" />
            </span>
            <span
              className={cn(
                moreActive || moreOpen
                  ? "text-primary-fixed"
                  : "text-on-surface-variant"
              )}
            >
              More
            </span>
          </button>
        </nav>
        <div className="h-16 md:hidden" />
      </div>
    </div>
  );
}
