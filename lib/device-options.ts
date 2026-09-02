export type InstallableDevice = {
  id: string;
  name: string;
  /** Rupees, as a string — the sale price becomes the installation charge. */
  salePrice: string | null;
  quantity: number;
  type: "device" | "sim";
};

export function salePriceOf(device: InstallableDevice): number {
  return device.salePrice === null ? 0 : parseFloat(device.salePrice);
}

function fmtRs(value: number): string {
  return `Rs ${Math.round(value).toLocaleString("en-PK")}`;
}

/** What the read-only Amount box shows once a device is chosen. */
export function salePriceLabel(device: InstallableDevice | null): string {
  if (device === null) return "—";
  return device.salePrice === null ? "No sale price set" : fmtRs(salePriceOf(device));
}

/** "AOT120 · Rs 8,000 · 12 in stock", or a plain "no stock available". */
export function deviceLabel(device: InstallableDevice): string {
  const price = device.salePrice === null ? "no price set" : fmtRs(salePriceOf(device));
  const stock = device.quantity < 1 ? "no stock available" : `${device.quantity} in stock`;
  return `${device.name} · ${price} · ${stock}`;
}
