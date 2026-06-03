import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export default function ResetPasswordPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-surface-container-lowest p-[var(--spacing-gutter)]">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-surface-container-lowest via-transparent to-surface-container-lowest" />
      <ResetPasswordForm />
    </div>
  );
}
