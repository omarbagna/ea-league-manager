import Link from "next/link";
import { requireAdmin } from "@/actions/admin";
import { AdminSignOutButton } from "@/components/auth/sign-out-button";

const adminNav = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/seasons", label: "Seasons" },
  { href: "/admin/teams", label: "Registered Teams" },
  { href: "/admin/fixtures", label: "Fixtures" },
  { href: "/admin/standings", label: "Standings" },
  { href: "/admin/disputes", label: "Disputes" },
  { href: "/admin/users", label: "Users" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="w-56 border-r border-outline-variant bg-surface-container-low p-4">
        <Link href="/admin" className="font-display text-lg font-bold italic text-primary">
          Admin
        </Link>
        <nav className="mt-6 flex flex-col gap-1">
          {adminNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-sm text-on-surface-variant hover:bg-surface-container-highest hover:text-primary"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-8 space-y-2">
          <Link href="/dashboard" className="block text-sm text-primary-fixed hover:underline">
            ← Player App
          </Link>
          <AdminSignOutButton />
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}
