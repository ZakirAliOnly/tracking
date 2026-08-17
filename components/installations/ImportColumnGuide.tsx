import type { ColumnSpec } from "@/lib/csv-import";

type Props = {
  columns: ColumnSpec[];
};

export function ImportColumnGuide({ columns }: Props) {
  return (
    <div className="overflow-hidden rounded-[12px] border border-border">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border bg-surface-muted">
            <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-text-muted">
              Column
            </th>
            <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-text-muted">
              Required
            </th>
            <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-text-muted">
              What goes in it
            </th>
          </tr>
        </thead>
        <tbody>
          {columns.map((column, i) => (
            <tr
              key={column.key}
              className={i < columns.length - 1 ? "border-b border-border-light" : ""}
            >
              <td className="px-4 py-2.5">
                <span className="block font-mono text-[12.5px] font-medium text-text-primary">
                  {column.header}
                </span>
                {column.format && (
                  <span className="mt-0.5 block font-mono text-[11.5px] text-text-muted">
                    ({column.format})
                  </span>
                )}
              </td>
              <td className="px-4 py-2.5">
                {column.required ? (
                  <span className="inline-flex rounded-full bg-error-light px-2.5 py-1 text-xs font-semibold text-error-foreground">
                    Required
                  </span>
                ) : (
                  <span className="inline-flex rounded-full bg-surface-tertiary px-2.5 py-1 text-xs font-semibold text-text-secondary">
                    Optional
                  </span>
                )}
              </td>
              <td className="px-4 py-2.5 text-[13px] text-text-secondary">{column.hint}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
