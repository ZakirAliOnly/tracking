"use client";

import { useActionState } from "react";
import { MapPin } from "lucide-react";
import { loginAction } from "@/actions/auth";

export function LoginForm() {
  const [error, formAction, isPending] = useActionState(loginAction, undefined);

  return (
    <div
      className="w-full max-w-sm rounded-[20px] border border-border bg-surface p-8"
      style={{
        boxShadow:
          "0 1px 2px rgba(15,27,45,0.05), 0 6px 22px -8px rgba(15,27,45,0.14)",
      }}
    >
      {/* Logo */}
      <div className="mb-6 flex flex-col items-center gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-[10px]"
          style={{
            background: "linear-gradient(135deg, #2D6BFF 0%, #5A8BFF 100%)",
          }}
        >
          <MapPin className="h-5 w-5 text-white" />
        </div>
        <div className="text-center">
          <h1 className="font-display text-[22px] font-bold text-text-primary">
            Welcome back
          </h1>
          <p className="mt-0.5 text-[13px] text-text-secondary">
            Sign in to your TrackFleet account
          </p>
        </div>
      </div>

      <form action={formAction} className="flex flex-col gap-4">
        {error && (
          <div className="rounded-[9px] bg-error-light px-3 py-2.5">
            <p className="text-[13px] font-medium text-error-foreground">
              {error}
            </p>
          </div>
        )}

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
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="••••••••"
            className="h-10 rounded-[9px] border border-border bg-surface px-3 text-[14px] text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-light transition-colors"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="mt-1 h-10 w-full rounded-[9px] bg-accent text-[14px] font-semibold text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          style={{
            boxShadow:
              "0 1px 2px rgba(45,107,255,0.20), 0 4px 12px -4px rgba(45,107,255,0.40)",
          }}
        >
          {isPending ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
