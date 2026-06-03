"use client";

import { LogOut } from "lucide-react";
import { signOut } from "@/actions/auth";
import { SubmitButton } from "@/components/ui/submit-button";
import { cn } from "@/lib/utils";

export function AdminSignOutButton({ fullWidth = false }: { fullWidth?: boolean }) {
  if (fullWidth) {
    return (
      <form action={signOut} className="w-full">
        <SubmitButton
          variant="outline"
          pendingText="Signing out…"
          className={cn(
            "w-full border-outline-variant text-on-surface hover:border-error hover:bg-error-container/10 hover:text-error"
          )}
        >
          <LogOut className="size-4" />
          Sign out
        </SubmitButton>
      </form>
    );
  }

  return (
    <form action={signOut}>
      <SubmitButton
        variant="ghost"
        size="sm"
        pendingText="Signing out…"
        className="h-auto px-0 py-0 text-sm text-on-surface-variant hover:bg-transparent hover:text-error"
      >
        <LogOut className="size-4" />
        Sign out
      </SubmitButton>
    </form>
  );
}

export function AppSignOutButton({ fullWidth = false }: { fullWidth?: boolean }) {
  return (
    <form action={signOut} className={fullWidth ? "w-full" : undefined}>
      <SubmitButton
        variant="outline"
        size={fullWidth ? "default" : "sm"}
        pendingText="Signing out…"
        className={cn(
          "border-outline-variant text-on-surface hover:border-error hover:bg-error-container/10 hover:text-error",
          fullWidth ? "w-full" : "shrink-0"
        )}
      >
        <LogOut className="size-4" />
        Sign out
      </SubmitButton>
    </form>
  );
}
