"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  CalendarRange,
  Users,
  Trophy,
  Gavel,
  ClipboardCheck,
  UserX,
  UserCog,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AdminSignOutButton } from "@/components/auth/sign-out-button";
import { AppLogo } from "@/components/brand/app-logo";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
};

const adminNavItems: NavItem[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/seasons", label: "Seasons", icon: CalendarRange },
  { href: "/admin/teams", label: "Teams", icon: Users },
  { href: "/admin/fixtures", label: "Fixtures", icon: Calendar },
  { href: "/admin/standings", label: "Standings", icon: Trophy },
  { href: "/admin/reports", label: "Reports", icon: ClipboardCheck },
  { href: "/admin/disputes", label: "Disputes", icon: Gavel },
  { href: "/admin/forfeits", label: "No-shows", icon: UserX },
  { href: "/admin/users", label: "Users", icon: UserCog },
];

const bottomNavItems = adminNavItems.slice(0, 4);

function isNavActive(pathname: string, href: string, exact?: boolean): boolean {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function AdminSidebarNav({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <>
      <div className="mb-8 px-2 pt-2">
        <AppLogo href="/admin" size="sm" showTitle />
        <p className="font-data mt-3 text-xs text-on-surface-variant uppercase">Admin</p>
      </div>
      <ul className="flex flex-1 flex-col gap-1 overflow-y-auto">
        {adminNavItems.map(({ href, label, icon: Icon, exact }) => {
          const active = isNavActive(pathname, href, exact);
          return (
            <li key={href}>
              <Link
                href={href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 transition-all",
                  active
                    ? "bg-primary-container font-bold text-on-primary-container shadow-[inset_0_0_8px_rgba(51,214,227,0.15)]"
                    : "text-on-surface-variant hover:bg-surface-container-highest"
                )}
              >
                <Icon className="size-5 shrink-0" />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="mt-auto space-y-2 border-t border-outline-variant pt-4">
        <Link href="/dashboard" onClick={onNavigate}>
          <Button variant="outline" className="w-full">
            Player App
          </Button>
        </Link>
        <AdminSignOutButton fullWidth />
      </div>
    </>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  const moreNavActive = adminNavItems
    .slice(4)
    .some(({ href, exact }) => isNavActive(pathname, href, exact));

  return (
    <div className="flex h-screen min-h-0 flex-col overflow-hidden bg-background md:flex-row">
      <nav className="fixed top-0 left-0 z-20 hidden h-full w-64 flex-col border-r border-outline-variant bg-surface-container-low p-3 md:flex">
        <AdminSidebarNav pathname={pathname} />
      </nav>

      {menuOpen && (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label="Close menu"
            onClick={closeMenu}
          />
          <nav className="relative flex h-full w-64 max-w-[85vw] flex-col border-r border-outline-variant bg-surface-container-low p-3 shadow-xl">
            <button
              type="button"
              className="absolute top-3 right-3 rounded-lg p-2 text-on-surface-variant hover:bg-surface-container-highest"
              aria-label="Close menu"
              onClick={closeMenu}
            >
              <X className="size-5" />
            </button>
            <AdminSidebarNav pathname={pathname} onNavigate={closeMenu} />
          </nav>
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col md:pl-64">
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-outline-variant bg-surface-container-lowest px-[var(--spacing-gutter)] shadow-[0_4px_24px_rgba(0,0,0,0.45)] md:hidden">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-lg p-2 text-on-surface-variant hover:bg-surface-container-highest"
              aria-label="Open menu"
              onClick={() => setMenuOpen(true)}
            >
              <Menu className="size-6" />
            </button>
            <AppLogo href="/admin" size="sm" showTitle />
          </div>
          <AdminSignOutButton />
        </header>

        <main className="relative z-0 min-h-0 flex-1 overflow-y-auto px-[var(--spacing-margin-mobile)] py-6 md:px-[var(--spacing-margin-desktop)]">
          {children}
        </main>

        <nav className="fixed bottom-0 left-0 z-50 flex h-16 w-full items-center justify-around border-t border-outline-variant bg-surface px-1 pb-1 shadow-[0_-4px_20px_rgba(0,0,0,0.5)] md:hidden">
          {bottomNavItems.map(({ href, label, icon: Icon, exact }) => {
            const active = isNavActive(pathname, href, exact);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex min-w-0 flex-1 flex-col items-center gap-0.5 p-2 text-[10px]",
                  active ? "border-t-2 border-primary text-primary" : "text-on-surface-variant"
                )}
              >
                <Icon className="size-6 shrink-0" />
                <span className="truncate">{label.split(" ")[0]}</span>
              </Link>
            );
          })}
          <button
            type="button"
            className={cn(
              "flex min-w-0 flex-1 flex-col items-center gap-0.5 p-2 text-[10px]",
              moreNavActive || menuOpen
                ? "border-t-2 border-primary text-primary"
                : "text-on-surface-variant"
            )}
            aria-label="Open menu"
            onClick={() => setMenuOpen(true)}
          >
            <Menu className="size-6 shrink-0" />
            <span>Menu</span>
          </button>
        </nav>
        <div className="h-16 md:hidden" />
      </div>
    </div>
  );
}
