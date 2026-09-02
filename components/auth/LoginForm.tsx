"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import { Eye, EyeOff } from "lucide-react";
import { loginAction } from "@/actions/auth";
import { useActionToast } from "@/components/ui/ToastProvider";
import { SubmitButton } from "@/components/ui/SubmitButton";

export function LoginForm() {
  const [error, formAction] = useActionState(loginAction, undefined);
  const [showPassword, setShowPassword] = useState(false);

  useActionToast(error);

  return (
    <div
      className="w-full max-w-sm rounded-[20px] border border-border bg-surface p-8"
      style={{
        boxShadow:
          "0 1px 2px rgba(26,20,20,0.05), 0 6px 22px -8px rgba(26,20,20,0.14)",
      }}
    >
      {/* Logo — carries the name itself, so no separate wordmark is needed here */}
      <div className="mb-6 flex flex-col items-center gap-3">
        <Image src="/logo.jpeg" alt="Real Tracker" width={280} height={280} className="h-24 w-auto" priority />
        <div className="text-center">
          <h1 className="font-display text-[22px] font-bold text-text-primary">
            Welcome back
          </h1>
          <p className="mt-0.5 text-[13px] text-text-secondary">
            Sign in to your Real Tracker account
          </p>
        </div>
      </div>

      <form action={formAction} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="email"
            className="text-[13px] font-medium text-text-primary"
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            className="h-10 rounded-[9px] border border-border bg-surface px-3 text-[14px] text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-light transition-colors"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="password"
            className="text-[13px] font-medium text-text-primary"
          >
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="h-10 w-full rounded-[9px] border border-border bg-surface pl-3 pr-10 text-[14px] text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-light transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-[7px] text-text-muted transition-colors hover:bg-surface-tertiary hover:text-text-primary"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <SubmitButton
          pendingLabel="Signing in…"
          className="mt-1 flex h-10 w-full items-center justify-center gap-2 rounded-[9px] bg-accent text-[14px] font-semibold text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          style={{
            boxShadow:
              "0 1px 2px rgba(225,29,72,0.20), 0 4px 12px -4px rgba(225,29,72,0.40)",
          }}
        >
          Sign in
        </SubmitButton>
      </form>
    </div>
  );
}
