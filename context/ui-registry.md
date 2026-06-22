# UI Component Registry

Track every reusable UI component and the patterns they establish.

---

## Drawers (slide-in panels)

| Component | Path | Props | Notes |
|---|---|---|---|
| AddSupplierDrawer | components/suppliers/AddSupplierDrawer.tsx | open, onClose, editTarget? | Handles add + edit via same form; `editTarget` triggers edit mode |
| AddDeviceDrawer | components/stock/AddDeviceDrawer.tsx | open, onClose, suppliers | Stock device add form |
| EditDeviceDrawer | components/stock/EditDeviceDrawer.tsx | open, onClose, device | Price update + mark faulty |
| RecordRenewalDrawer | components/renewals/RecordRenewalDrawer.tsx | open, onClose, preFill?, installationOptions, accountOptions | Pre-fills amounts from last renewal or installation |
| NewInvoiceDrawer | components/suppliers/NewInvoiceDrawer.tsx | open, onClose, suppliers, devices, prefilledSupplierId? | Auto-increments device stock on submit |
| PaySupplierDrawer | components/suppliers/PaySupplierDrawer.tsx | open, onClose, target, accounts | Creates supplier_payment record; shows est. payable |

**Pattern:** `formKey` state incremented on close (or success) forces form remount + field reset.

---

## Page Views

| Component | Path | Key types | Notes |
|---|---|---|---|
| SuppliersView | components/suppliers/SuppliersView.tsx | SupplierRow, InvoiceRow, SupplierStats | Two tabs: Suppliers / Purchase Invoices |
| StockView | components/stock/StockView.tsx | DeviceRow, StockStats | Filter tabs + stats cards |
| RenewalsView | components/renewals/RenewalsView.tsx | RenewalRow, RenewalStatus | Filter tabs with red due count badge |
| InstallationsView | components/installations/InstallationsView.tsx | InstallationRow | Expandable detail panel |

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
