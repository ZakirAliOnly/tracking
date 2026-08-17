# UI Component Registry

Track every reusable UI component and the patterns they establish.

---

## Shared primitives (`components/ui/`)

shadcn/ui was never installed, so this folder holds the project's own primitives.

| Component | Path | Props | Notes |
|---|---|---|---|
| ToastProvider | components/ui/ToastProvider.tsx | children | Mounted once in `app/layout.tsx`. Renders the stack fixed at `right-5 top-5`, `z-[100]`, auto-dismissing after 6s |
| PhoneInput | components/ui/PhoneInput.tsx | name?, value?, defaultValue?, onChange?, required?, placeholder?, className? | Digits-only, hard-capped at 11. Works controlled (`value`) or uncontrolled (`name` + `defaultValue`) |
| SubmitButton | components/ui/SubmitButton.tsx | children, pendingLabel?, disabled?, className?, style?, spinnerClassName?, aria-label? | The only `type="submit"` in the app. Reads `useFormStatus()` itself |

**Save pattern (duplicate guard):** no form writes its own `type="submit"` button — every one is a `SubmitButton`. It calls `useFormStatus()` from inside the form, so from the first click until the Server Action returns it is `disabled` + `aria-busy` and shows a spinning ring, and neither a second click nor Enter can post the same form twice. Never hand-roll `disabled={isPending}` + a copied spinner span again; if a form needs its own reason to block (an unpicked row, an empty selection) pass it as `disabled`, which is OR-ed with the busy state. Because the button owns the pending state, `useActionState` is destructured as `const [state, formAction] = …` — the third element is not needed. The spinner is `border-current`, so it takes the button's own text colour on accent, success and error buttons alike. Icon-only submits (delete, sign out) pass `pendingLabel=""` so the spinner replaces the icon.

Buttons that are not form submits but still call the server (`ImportCsvModal`, `ReportsView`) keep their `useTransition` pending flag and follow the same rule by hand: disabled while pending, spinner in the label.

**Error pattern:** no form renders its own error banner. Every Server Action error goes to a toast via `useActionToast(state?.error)`, called immediately after `useActionState`. Non-action errors call `useToast()` directly. The hook de-duplicates, so the same message does not re-fire on unrelated re-renders.

**Password reveal pattern:** password fields sit in a `relative` wrapper with `pr-10` and an absolutely positioned `type="button"` toggle at `right-1 top-1/2 -translate-y-1/2` (h-8 w-8, `rounded-[7px]`, muted icon that darkens on hover). It flips the input between `type="password"` and `"text"` and swaps `Eye` / `EyeOff`, with `aria-label` following the state. Used by `components/auth/LoginForm.tsx`.

**Phone rule:** every phone or mobile field is exactly 11 digits. `PhoneInput` strips letters, spaces and dashes as you type and refuses a 12th digit; the Zod schemas re-check server-side and reject anything that is not 11. Optional phone fields still accept blank.

---

## Modals

There are no slide-in drawers left — every overlay panel is a centered modal.

| Component | Path | Props | Notes |
|---|---|---|---|
| AddCustomerModal | components/customers/AddCustomerModal.tsx | open, onClose, customer?, accounts | Add + edit via one form; `customer` triggers edit mode. In add mode a checkbox reveals one or more repeatable installation blocks (`InstallationBlockFields`, each with Registration No, Installetion Date, devices, Amount, Sim, Sim Number, Payment Method, Discount, Amount Paid) plus an "Add another installation" button; all blocks save under the one new customer in the same transaction |
| RecordRenewalModal | components/renewals/RecordRenewalModal.tsx | open, onClose, preFill?, installationOptions, accounts | One page, no staged reveal. Row-triggered (`preFill` set) shows a read-only customer/vehicle card. Toolbar-triggered (`preFill` null) shows two plain `<select>` dropdowns at the top — Customer, then Vehicle (options scoped to the picked customer, disabled until one is picked). Every other field (dates, Payment Method, Amount, SIM & Osting, Net, Other) is always rendered below, on the same page, whether or not a vehicle is picked yet — only the Save button is disabled until one is. Payment Method is required whenever the org has active accounts. Pre-fills amounts from last renewal or installation |
| NewInstallationModal | components/installations/NewInstallationModal.tsx | see Installations module | |
| ImportCsvModal | components/installations/ImportCsvModal.tsx | open, onClose | |
| AddSupplierModal | components/suppliers/AddSupplierModal.tsx | open, onClose, editTarget? | Add + edit via same form; `editTarget` triggers edit mode |
| NewInvoiceModal | components/suppliers/NewInvoiceModal.tsx | open, onClose, suppliers, devices, accounts, prefilledSupplierId? | Auto-increments device stock on submit. Payment Method select is always visible whenever the org has active accounts (not gated behind typing an amount) — becomes required only once "Amount paid now" > 0, matching `resolvePayingAccount`'s own rule; deducts from that account |
| PaySupplierModal | components/suppliers/PaySupplierModal.tsx | open, onClose, target, accounts | Creates supplier_payment record; shows est. payable |
| SupplierLedgerModal | components/suppliers/SupplierLedgerModal.tsx | open, onClose, supplierId, supplierName | Read-only ledger; no form or footer |
| AddDeviceModal | components/stock/AddDeviceModal.tsx | open, onClose, suppliers | Stock device add form |
| EditDeviceModal | components/stock/EditDeviceModal.tsx | open, onClose, device | Price update + mark faulty; two nested forms, no shared footer |
| AddAccountModal | components/accounts/AddAccountModal.tsx | open, onClose, editTarget? | Add + edit payment method |
| TransferFundsModal | components/accounts/TransferFundsModal.tsx | open, onClose, accounts, prefilledFromId? | Moves money between methods |

**Pattern:**

```tsx
if (!open) return null;          // after every hook — never before

<div className="fixed inset-0 z-40 bg-overlay/40 backdrop-blur-sm" onClick={onClose} />
<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
  <div className="flex w-full max-w-[Npx] max-h-[92vh] flex-col rounded-[20px] bg-surface"
       style={{ boxShadow: "0 20px 60px -12px rgba(15,27,45,0.25)" }}>
    {/* fixed header */}
    <form className="flex flex-1 flex-col overflow-y-auto">
      <div className="flex flex-col gap-5 px-6 py-6">…fields…</div>
      <div className="mt-auto flex flex-shrink-0 gap-3 border-t border-border px-6 py-5">…footer…</div>
    </form>
  </div>
</div>
```

- Every backdrop blurs the page — `backdrop-blur-sm` is not optional.
- The modal unmounts when closed, so nothing renders into the page until it opens.
- `formKey` state incremented on close (or success) forces form remount + field reset.
- Focus the first field on open with a 50ms timeout (there is no slide animation to wait out).

---

## Page Views

| Component | Path | Key types | Notes |
|---|---|---|---|
| SuppliersView | components/suppliers/SuppliersView.tsx | SupplierRow, InvoiceRow, SupplierStats | Two tabs: Suppliers / Purchase Invoices |
| StockView | components/stock/StockView.tsx | DeviceRow, StockStats | Filter tabs + stats cards |
| RenewalsView | components/renewals/RenewalsView.tsx | RenewalRow, RenewalStatus | Filter tabs with red due count badge |
| InstallationsView | components/installations/InstallationsView.tsx | InstallationRow | Expandable detail panel; toolbar opens New installation + Import CSV modals |

---

## Installations module

CSV import lives inside the installations module — there is no separate `/import` route.

| Component | Path | Props | Notes |
|---|---|---|---|
| NewInstallationModal | components/installations/NewInstallationModal.tsx | open, onClose, customers, accounts, devices | Client Name (search), Registration No, Installetion Date, Devices (repeatable), Amount, Sim, Payment Method, Sim Number, Discount (Rs/%), Amount Paid |
| DeviceLines | components/installations/DeviceLines.tsx | lines, devices, onChange, labelClassName, inputClassName, selectClassName | Repeatable device rows + Add another device. Class names are passed in because the two host forms use different label and input scales |
| PaymentSummary | components/installations/PaymentSummary.tsx | money | Total → Discount → Payable → Paid → Remaining. Shared by both installation forms |

**Device pattern:** an installation can carry several devices. `DeviceLines` (`components/installations/DeviceLines.tsx`) renders one row per device — a select, a quantity box and a remove button — under an **Add another device** button; the last remaining row cannot be removed. Every row posts `deviceId` + `deviceQuantity`, so the action reads them with `formData.getAll` and `toDeviceLines` pairs them up. Options come from `listInstallableDevices`, labelled `AOT120 · Rs 8,000 · 12 in stock` by `deviceLabel`; a line with no stock is still listed, reads **no stock available** and is `disabled` so it cannot be chosen.

**Amount pattern:** the Amount box follows the devices — it shows their combined sale price — but stays editable, the same freedom the CSV import's Amount column has. State is `amountOverride: string | null` where `null` means "still following the devices", so the value is derived during render rather than synced in an effect; a caption underneath says which of the two it is. The devices' own prices are never posted: the server re-reads them from stock for the line records.

`lib/device-options.ts` (type + display helpers) imports nothing so forms can use it; `lib/devices.ts` holds the Prisma queries. Keep them apart — importing the query module from a form would drag Prisma into the browser bundle.

**Multi-installation pattern (Add customer only):** `InstallationBlockFields` (`components/customers/InstallationBlockFields.tsx`) is one repeatable installation block — the same fields as `NewInstallationModal`, each block fully controlled in an `InstallationDraft`. `AddCustomerModal` holds an array of drafts, renders one block per entry under an **Add another installation** button (same remove-disabled-at-one-left rule as `DeviceLines`), and serializes the whole array to a single hidden `installationsJson` field on submit rather than posting raw per-field names — with N repeatable blocks each containing its own repeatable device lines, index-suffixed form-field names would collide or need bracket-parsing on the server, so JSON is simpler and every field is controlled state anyway. `upsertCustomer` (`actions/customers.ts`) parses that JSON, validates each entry with `customerInstallationSchema`, rejects the whole submit if two blocks share a registration number (case-insensitive, via `normalizeRegistration`), then resolves devices **sequentially** through `resolveInstallationDevices`'s `reserved` map so two blocks cannot both claim the same limited stock, before writing every block under the one new customer inside a single transaction.

**Money pattern:** there is no "received" tick any more. Both forms take a **Discount** (a number plus an Rs/% selector) and an **Amount Paid**, and `resolvePayment` in `lib/installation-money.ts` turns those into `{ total, discount, payable, amountPaid, remaining, received }`. The forms call it for the live summary and the Server Actions call it for what gets stored, so the figures on screen are the figures saved. A percentage is resolved to rupees before storage — the column holds rupees only. `received` is derived (`amountPaid >= payable`), never entered.

**Payment Method pattern:** the account select is required whenever the org has an active payment method and is not rendered at all when it has none, so a new org is never blocked from recording work. Markup is the `PaySupplierModal` select — `SELECT = INPUT + " w-full appearance-none pl-3 pr-8"`, a `relative` wrapper and an absolutely positioned `ChevronDown` (needed because `appearance-none` strips the native arrow). `required` on a select whose selected option carries `value=""` is what makes the browser refuse to submit. Options come from `listActiveAccounts(orgId)` in `lib/accounts.ts` — do not write a fourth copy of that query, and import the `AccountOption` type from there with `import type` (the module pulls in `prisma`).

**Pay-only variant:** `NewInvoiceModal`'s payment method select only appears once "Amount paid now" is greater than 0 (unmounting it when the amount drops back to 0 clears `accountId`, same unmount-clears-the-field logic as the optional-section pattern below). `resolvePayingAccount` in `lib/accounts.ts` is `resolveInstallationAccount`'s sibling for this shape: no amount paid → no account needed; amount paid but the org has no active accounts yet → still allowed, nothing to pick; amount paid and accounts exist → required and re-checked against the org.

**Optional-section pattern:** a form can carry a second entity behind a checkbox card (`bg-background`, same card as `received`). Ticking it renders the extra fields inside a bordered `bg-background` group below; unticked, the fields are unmounted so nothing is posted and the server skips that branch entirely. Used by `AddCustomerModal` → installation.

**Customer search pattern (Client Name):** a single text box — no dropdown, no separate name field. Typing filters existing customers into a list rendered directly beneath it (`absolute top-full`, max 6). Arrow keys move, Enter picks, Escape closes, `onMouseDown` + `preventDefault` on each option so the click lands before blur. The typed name *is* the identity: an exact case-insensitive match attaches to that customer whether picked or typed, anything else creates one. A line under the box always says which of the two will happen.
| ImportCsvModal | components/installations/ImportCsvModal.tsx | open, onClose | Template download + upload + review, all in one modal |
| ImportReview | components/installations/ImportReview.tsx | plan | Count tiles (new / update / duplicate / bad), duplicate and update lists |
| ImportColumnGuide | components/installations/ImportColumnGuide.tsx | columns | Reference table of the template columns, Required/Optional pills |
| ImportResultPanel | components/installations/ImportResultPanel.tsx | summary | Created / Updated / Skipped stat tiles + per-line skip reasons |

**Template heading pattern:** the downloaded template writes each column's format into its own heading — `Installetion Date (YYYY-MM-DD)`, `received (Yes or No)`, `Sim Number (11 digits)` — so the rule is visible in Excel above the cell being typed. `normalizeHeader` strips a trailing `(…)` before matching, so the bracketed form and a plain hand-typed `Installetion Date` both resolve to the same column. Formats live once on `ColumnSpec.format` and feed both the template heading and the on-screen guide; never write a format string into a data row, which would shift every reported line number.

**Import pattern:** the file is read with `file.text()`, parsed by `lib/csv-import.ts` and validated with the same Zod schema the server uses, so per-line errors appear before anything is submitted. The primary button then reads **Check for duplicates** — it runs the read-only preflight and swaps the body for the review; only then does it become **Import N rows**. Templates are generated from the column spec via `downloadCsv` (`lib/csv.ts`) — there is no static template file to drift.

**Diff pattern:** stored value on the left, incoming value on the right, both in `font-mono`, incoming in `font-semibold text-text-primary` and stored in `text-text-secondary`. Only fields that actually differ are listed.

---

## Table patterns

- Header: `text-[11px] font-semibold uppercase tracking-wide text-text-muted`
- Row hover: `hover:bg-surface-muted`
- Last row: no bottom border
- Footer row: `text-[12px] text-text-muted` showing "Showing N of M"

## Button patterns

| Variant | Classes |
|---|---|
| Primary (blue) | `bg-accent text-accent-foreground` + blue box-shadow |
| Outline | `border border-border bg-surface text-text-secondary` |
| Inline amber | `bg-warning-light text-warning-foreground` |
| Inline green | `bg-success-light text-success-foreground` |
| Inline blue | `bg-accent-light text-accent` |
| Danger (delete) | `hover:bg-error-light hover:text-error` on icon button |

## Status badge pattern

```tsx
<span className="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold {bg} {text}">
  {label}
</span>
```
