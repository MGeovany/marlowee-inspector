"use client";

/** Mini bar sparkline — values are normalized internally. */
export function Sparkline({
  values,
  tone = "error",
  className,
}: {
  values: number[];
  tone?: "error" | "warn" | "info" | "success";
  className?: string;
}) {
  const max = Math.max(...values, 1);
  const bars = values.length > 0 ? values : [0];

  const fill: Record<string, string> = {
    error: "bg-level-error/70",
    warn: "bg-level-warn/70",
    info: "bg-level-info/70",
    success: "bg-[var(--green)]/70",
  };

  return (
    <div className={`flex h-7 items-end gap-[2px] ${className ?? ""}`}>
      {bars.map((v, i) => (
        <span
          key={i}
          className={`w-[3px] rounded-[1px] ${fill[tone]}`}
          style={{ height: `${Math.max(12, (v / max) * 100)}%` }}
        />
      ))}
    </div>
  );
}
