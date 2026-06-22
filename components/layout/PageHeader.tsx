type Props = {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
};

export function PageHeader({ title, subtitle, children }: Props) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h2 className="font-display text-[20px] font-bold leading-7 text-text-primary">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-0.5 text-[13px] text-text-secondary">{subtitle}</p>
        )}
      </div>
      {children && (
        <div className="flex flex-none items-center gap-3">{children}</div>
      )}
    </div>
  );
}
