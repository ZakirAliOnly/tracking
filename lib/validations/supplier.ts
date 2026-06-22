import { z } from "zod";

export const addSupplierSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().optional(),
  contactName: z.string().optional(),
  address: z.string().optional(),
  openingOwed: z.string().optional(),
  supplies: z.string().optional(),
});

export const editSupplierSchema = addSupplierSchema.extend({
  id: z.string().min(1, "ID is required"),
});

export const purchaseInvoiceSchema = z.object({
  supplierId: z.string().min(1, "Supplier is required"),
  deviceId: z.string().min(1, "Device is required"),
  quantity: z.string().min(1, "Quantity is required"),
  costPrice: z.string().min(1, "Cost price is required"),
  salePrice: z.string().optional(),
  amountPaid: z.string().optional(),
  invoiceDate: z.string().min(1, "Invoice date is required"),
  notes: z.string().optional(),
});

export const supplierPaymentSchema = z.object({
  supplierId: z.string().min(1, "Supplier is required"),
  amount: z.string().min(1, "Amount is required"),
  accountId: z.string().optional().nullable(),
  paidAt: z.string().min(1, "Payment date is required"),
  note: z.string().optional(),
});

export type AddSupplierInput = z.infer<typeof addSupplierSchema>;
export type EditSupplierInput = z.infer<typeof editSupplierSchema>;
export type PurchaseInvoiceInput = z.infer<typeof purchaseInvoiceSchema>;
export type SupplierPaymentInput = z.infer<typeof supplierPaymentSchema>;
