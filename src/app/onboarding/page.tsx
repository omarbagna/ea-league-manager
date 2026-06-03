import { OnboardingForm } from "@/components/auth/onboarding-form";

export default function OnboardingPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black p-[var(--spacing-gutter)]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(59,73,75,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(59,73,75,0.05)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(circle_at_center,black,transparent_80%)]" />
      <div className="pointer-events-none absolute top-1/2 left-1/2 size-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-container/5 blur-[120px]" />
      <OnboardingForm />
    </div>
  );
}
