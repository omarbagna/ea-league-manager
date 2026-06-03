"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import type { VariantProps } from "class-variance-authority";
import type { buttonVariants } from "@/components/ui/button";

type SubmitButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    pendingText?: string;
  };

function SubmitButton({
  children,
  pendingText,
  disabled,
  ...props
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" loading={pending} disabled={disabled} {...props}>
      {pending && pendingText ? pendingText : children}
    </Button>
  );
}

export { SubmitButton };
