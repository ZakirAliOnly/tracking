export const PAGE_SIZE = 25;

/** Clamped to a positive integer — a stray `?page=0` or `?page=abc` lands on page 1. */
export function parsePage(value: string | undefined): number {
  const n = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

export function pageWindow(page: number, pageSize: number = PAGE_SIZE): { skip: number; take: number } {
  return { skip: (page - 1) * pageSize, take: pageSize };
}

export function totalPages(total: number, pageSize: number = PAGE_SIZE): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

/**
 * A tab or page-number link's href: the current search params with `patch`
 * merged in. Changing a filter always resets `page` back to 1 unless the
 * patch says otherwise, so a filter switch never strands the reader on a
 * page number that filter doesn't have.
 */
export function buildHref(
  basePath: string,
  current: Record<string, string | undefined>,
  patch: Record<string, string | undefined>
): string {
  const params = new URLSearchParams();
  const merged = { ...current, page: "1", ...patch };

  for (const [key, value] of Object.entries(merged)) {
    if (value !== undefined && value !== "") params.set(key, value);
  }

  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}
