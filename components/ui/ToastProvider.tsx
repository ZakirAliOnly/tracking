"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, X } from "lucide-react";

export type ToastVariant = "error" | "success";

type ToastItem = { id: number; message: string; variant: ToastVariant };

type ToastFn = (message: string, variant?: ToastVariant) => void;

const ToastContext = createContext<ToastFn | null>(null);

const TOAST_MS = 6000;

let nextId = 0;

export function useToast(): ToastFn {
  const toast = useContext(ToastContext);
  if (!toast) throw new Error("useToast must be used inside <ToastProvider>");
  return toast;
}

/**
 * Raises a toast whenever a Server Action returns a new error, so forms do not
 * each need their own inline error box.
 */
export function useActionToast(error: string | null | undefined): void {
  const toast = useToast();
  const lastShown = useRef<string | null>(null);

  useEffect(() => {
    if (!error) {
      lastShown.current = null;
      return;
    }
    if (lastShown.current === error) return;
    lastShown.current = error;
    toast(error, "error");
  }, [error, toast]);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback<ToastFn>(
    (message, variant = "error") => {
      const id = nextId++;
      setToasts((list) => [...list, { id, message, variant }]);
      window.setTimeout(() => dismiss(id), TOAST_MS);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}

      <div
        className="pointer-events-none fixed right-5 top-5 z-[100] flex w-full max-w-[380px] flex-col gap-2.5"
        role="status"
        aria-live="polite"
      >
        {toasts.map((item) => (
          <ToastCard key={item.id} item={item} onDismiss={() => dismiss(item.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const isError = item.variant === "error";
  const Icon = isError ? AlertCircle : CheckCircle2;

  return (
    <div
      className={`animate-toast-in pointer-events-auto flex items-start gap-3 rounded-[12px] border bg-surface px-4 py-3 ${
        isError ? "border-error" : "border-success"
      }`}
      style={{ boxShadow: "0 10px 30px -8px rgba(26,20,20,0.28)" }}
    >
      <Icon
        className={`mt-0.5 h-[18px] w-[18px] flex-none ${
          isError ? "text-error-foreground" : "text-success-foreground"
        }`}
      />
      <p className="flex-1 text-[13px] font-medium text-text-primary">{item.message}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="flex h-6 w-6 flex-none items-center justify-center rounded-[7px] text-text-muted transition-colors hover:bg-surface-tertiary hover:text-text-primary"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
