"use client";

import { useFormStatus } from "react-dom";
import { cn } from "@/lib/utils";

type Props = {
  children: React.ReactNode;
  /**
   * Replaces the children while the form is in flight. Pass an empty string on
   * icon-only buttons so nothing but the spinner shows.
   */
  pendingLabel?: string;
  /** A reason to block submission on top of the form already being busy. */
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  spinnerClassName?: string;
  "aria-label"?: string;
};

/**
 * The only submit button in the app. It reads the enclosing form's own status,
 * so from the moment a submit starts until the Server Action returns the button
 * is disabled and spinning — a second click, or Enter, cannot post the same
 * form twice and create a duplicate record.
 */
export function SubmitButton({
  children,
  pendingLabel,
  disabled,
  className,
  style,
  spinnerClassName,
  "aria-label": ariaLabel,
}: Props) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending || disabled}
      aria-busy={pending}
      aria-label={ariaLabel}
      className={className}
      style={style}
    >
      {pending && (
        <span
          // border-current keeps the ring the same colour as the button's label
          className={cn(
            "h-4 w-4 flex-none animate-spin rounded-full border-2 border-current border-t-transparent",
            spinnerClassName
          )}
        />
      )}
      {pending && pendingLabel !== undefined ? pendingLabel : children}
    </button>
  );
}
