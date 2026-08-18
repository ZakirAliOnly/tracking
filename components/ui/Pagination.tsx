import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buildHref, PAGE_SIZE } from "@/lib/pagination";

type Props = {
  page: number;
  total: number;
  /** What's being counted, singular — "supplier", "renewal", "device" */
  label: string;
  basePath: string;
  searchParams: Record<string, string | undefined>;
  pageSize?: number;
  /** The query param this control reads/writes — "page" unless a page hosts more than one independently-paged table */
  paramName?: string;
};

/**
 * The table-footer pagination control. A Server Component — Prev/Next are
 * plain links that carry the rest of the current query string (filters,
 * other tables' page numbers) along with them, so navigating a page never
 * resets a filter tab or a sibling table's position.
 */
export function Pagination({
  page,
  total,
  label,
  basePath,
  searchParams,
  pageSize = PAGE_SIZE,
  paramName = "page",
}: Props) {
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  const prevHref = buildHref(basePath, searchParams, { [paramName]: String(Math.max(1, page - 1)) });
  const nextHref = buildHref(basePath, searchParams, { [paramName]: String(Math.min(lastPage, page + 1)) });

  return (
    <div className="flex items-center justify-between border-t border-border px-5 py-3">
      <p className="text-[12px] text-text-muted">
        Showing <strong>{start}–{end}</strong> of <strong>{total}</strong> {total === 1 ? label : `${label}s`}
      </p>

      <div className="flex items-center gap-2">
        <PagerLink href={prevHref} disabled={page <= 1} aria-label="Previous page">
          <ChevronLeft className="h-3.5 w-3.5" />
          Prev
        </PagerLink>
        <span className="text-[12px] text-text-muted">
          Page {page} of {lastPage}
        </span>
        <PagerLink href={nextHref} disabled={page >= lastPage} aria-label="Next page">
          Next
          <ChevronRight className="h-3.5 w-3.5" />
        </PagerLink>
      </div>
    </div>
  );
}

function PagerLink({
  href,
  disabled,
  children,
  ...rest
}: {
  href: string;
  disabled: boolean;
  children: React.ReactNode;
} & React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  const classes =
    "flex h-8 items-center gap-1 rounded-[8px] border border-border px-2.5 text-[12.5px] font-medium transition-colors";

  if (disabled) {
    return (
      <span className={`${classes} cursor-not-allowed text-text-muted opacity-50`} aria-disabled>
        {children}
      </span>
    );
  }

  return (
    <Link href={href} className={`${classes} text-text-secondary hover:border-accent hover:text-accent`} {...rest}>
      {children}
    </Link>
  );
}
