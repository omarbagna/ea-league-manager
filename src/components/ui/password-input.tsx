"use client";

import { useState } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

type PasswordInputProps = Omit<React.ComponentProps<typeof Input>, "type"> & {
  showLockIcon?: boolean;
};

function PasswordInput({
  className,
  showLockIcon = false,
  id,
  ...props
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      {showLockIcon && (
        <Lock
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-outline"
          aria-hidden
        />
      )}
      <Input
        id={id}
        type={visible ? "text" : "password"}
        className={cn(showLockIcon && "pl-11", "pr-12", className)}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className={cn(
          "absolute right-2 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg border border-transparent",
          "text-on-surface-variant transition-colors",
          "hover:border-primary-container/50 hover:bg-primary-container/20 hover:text-primary-fixed",
          "active:bg-primary-container/30",
          "focus-visible:border-primary-container focus-visible:bg-primary-container/15 focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:outline-none"
        )}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-controls={id}
        aria-pressed={visible}
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

export { PasswordInput };
