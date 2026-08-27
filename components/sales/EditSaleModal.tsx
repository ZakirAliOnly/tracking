"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Pencil, Search, X } from "lucide-react";
import {
  searchInstallationsByReg,
  updateSaleAmounts,
  type InstallationActionState,
  type SaleSearchResult,
} from "@/actions/installations";
import { useActionToast } from "@/components/ui/ToastProvider";
import { SubmitButton } from "@/components/ui/SubmitButton";

const FIELD =
  "h-10 rounded-[9px] border border-border bg-surface px-3 text-[14px] text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-light transition-colors";

function fmtRs(v: string | number) {
  const n = typeof v === "string" ? parseFloat(v) : v;
  return `Rs ${Math.round(n || 0).toLocaleString("en-PK")}`;
}

export function EditSaleTrigger() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<SaleSearchResult | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SaleSearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [searching, setSearching] = useState(false);

  const [amount, setAmount] = useState("");
  const [simPayment, setSimPayment] = useState("");
  const [devicePayment, setDevicePayment] = useState("");

  const [state, formAction] = useActionState<InstallationActionState, FormData>(
    updateSaleAmounts,
    null
  );
  const [formKey, setFormKey] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useActionToast(state?.error);

  useEffect(() => {
    if (state?.success) {
      close();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.success]);

  function reset() {
    setSelected(null);
    setQuery("");
    setResults([]);
    setShowResults(false);
    setAmount("");
    setSimPayment("");
    setDevicePayment("");
    setFormKey((k) => k + 1);
  }

  function close() {
    setOpen(false);
    reset();
  }

  function onQueryChange(value: string) {
    setQuery(value);
    setSelected(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const q = value.trim();
    if (!q) {
      setResults([]);
      setShowResults(false);
      return;
    }

    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      const rows = await searchInstallationsByReg(q);
      setResults(rows);
      setShowResults(true);
      setSearching(false);
    }, 250);
  }

  function pick(row: SaleSearchResult) {
    setSelected(row);
    setQuery(row.registrationNo);
    setShowResults(false);
    setAmount(row.amount);
    setSimPayment(row.simPayment);
    setDevicePayment(row.devicePayment);
  }

  const total =
    (parseFloat(amount) || 0) - (parseFloat(simPayment) || 0) - (parseFloat(devicePayment) || 0);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-9 items-center gap-1.5 rounded-[9px] border border-border bg-surface px-3.5 text-[13px] font-medium text-text-secondary transition-colors hover:border-accent hover:text-accent"
      >
        <Pencil className="h-3.5 w-3.5" />
        Edit a sale
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-overlay/40 backdrop-blur-sm" onClick={close} />

          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="flex w-full max-w-[640px] max-h-[92vh] flex-col rounded-[20px] bg-surface"
              style={{ boxShadow: "0 20px 60px -12px rgba(26,20,20,0.25)" }}
            >
              <div className="flex flex-shrink-0 items-center justify-between border-b border-border px-6 py-5">
                <div>
                  <h2 className="font-display text-[17px] font-semibold text-text-primary">
                    Edit a sale
                  </h2>
                  <p className="mt-0.5 text-[13px] text-text-secondary">
                    Find an installation by registration number
                  </p>
                </div>
                <button
                  type="button"
                  onClick={close}
                  className="flex h-8 w-8 items-center justify-center rounded-[9px] text-text-muted transition-colors hover:bg-surface-tertiary hover:text-text-primary"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex flex-col gap-5 overflow-visible px-6 py-6">
                <div className="relative flex flex-col gap-1.5">
                  <label
                    htmlFor="sale-reg-search"
                    className="text-[12px] font-medium uppercase tracking-wider text-text-muted"
                  >
                    Registration number
                  </label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                    <input
                      id="sale-reg-search"
                      autoFocus
                      value={query}
                      onChange={(e) => onQueryChange(e.target.value)}
                      onFocus={() => results.length > 0 && setShowResults(true)}
                      placeholder="e.g. LEB-1234"
                      className={`${FIELD} w-full pl-9`}
                      autoComplete="off"
                    />
                  </div>

                  {showResults && (
                    <div
                      className="absolute left-0 right-0 top-full z-10 mt-1 max-h-64 overflow-y-auto rounded-[12px] border border-border bg-surface py-1"
                      style={{ boxShadow: "0 8px 24px -8px rgba(26,20,20,0.25)" }}
                    >
                      {searching ? (
                        <p className="px-3.5 py-3 text-[13px] text-text-muted">Searching…</p>
                      ) : results.length === 0 ? (
                        <p className="px-3.5 py-3 text-[13px] text-text-muted">No matches.</p>
                      ) : (
                        results.map((r) => (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => pick(r)}
                            className="flex w-full flex-col items-start gap-0.5 px-3.5 py-2.5 text-left transition-colors hover:bg-surface-muted"
                          >
                            <span className="font-mono text-[13px] font-semibold text-text-primary">
                              {r.registrationNo}
                            </span>
                            <span className="text-[12.5px] text-text-secondary">
                              {r.customerName} · {fmtRs(r.amount)}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {selected && (
                  <form key={formKey} action={formAction} className="flex flex-col gap-5">
                    <input type="hidden" name="installationId" value={selected.id} />

                    <div className="rounded-[12px] border border-border bg-background px-4 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                        {selected.registrationNo}
                      </p>
                      <p className="mt-0.5 text-[13px] font-medium text-text-primary">
                        {selected.customerName}
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="flex flex-col gap-1.5">
                        <label
                          htmlFor="sale-amount"
                          className="text-[12px] font-medium uppercase tracking-wider text-text-muted"
                        >
                          Amount
                        </label>
                        <input
                          id="sale-amount"
                          name="amount"
                          type="number"
                          min="0"
                          step="any"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          className={FIELD}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label
                          htmlFor="sale-sim"
                          className="text-[12px] font-medium uppercase tracking-wider text-text-muted"
                        >
                          Sim
                        </label>
                        <input
                          id="sale-sim"
                          name="simPayment"
                          type="number"
                          min="0"
                          step="any"
                          value={simPayment}
                          onChange={(e) => setSimPayment(e.target.value)}
                          className={FIELD}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label
                          htmlFor="sale-device"
                          className="text-[12px] font-medium uppercase tracking-wider text-text-muted"
                        >
                          Device
                        </label>
                        <input
                          id="sale-device"
                          name="devicePayment"
                          type="number"
                          min="0"
                          step="any"
                          value={devicePayment}
                          onChange={(e) => setDevicePayment(e.target.value)}
                          className={FIELD}
                        />
                      </div>
                    </div>

                    <div className="rounded-[12px] border border-border bg-background px-4 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                        Total sale
                      </p>
                      <p
                        className={`mt-0.5 font-display text-[22px] font-bold leading-8 ${
                          total < 0 ? "text-error" : "text-success-foreground"
                        }`}
                      >
                        {fmtRs(total)}
                      </p>
                      <p className="mt-0.5 text-[11.5px] text-text-muted">
                        Amount less Sim and Device
                      </p>
                    </div>

                    <div className="flex gap-3 border-t border-border pt-5">
                      <button
                        type="button"
                        onClick={close}
                        className="h-10 flex-1 rounded-[9px] border border-border bg-surface text-[14px] font-medium text-text-secondary transition-colors hover:text-text-primary"
                      >
                        Cancel
                      </button>
                      <SubmitButton
                        pendingLabel="Saving…"
                        className="flex h-10 flex-1 items-center justify-center gap-2 rounded-[9px] bg-accent text-[14px] font-semibold text-accent-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                        style={{
                          boxShadow:
                            "0 1px 2px rgba(225,29,72,0.20), 0 4px 12px -4px rgba(225,29,72,0.40)",
                        }}
                      >
                        Save changes
                      </SubmitButton>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
