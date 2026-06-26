"use client";

import { Bar, BarChart, Cell, ResponsiveContainer } from "recharts";

const TONE_COLORS: Record<string, string> = {
  error: "var(--red)",
  warn: "var(--yellow)",
  orange: "var(--orange)",
  info: "var(--blue)",
  success: "var(--green)",
};

/** Mini bar sparkline powered by Recharts — axis-free, metric-card sized. */
export function Sparkline({
  values,
  tone = "error",
  className,
}: {
  values: number[];
  tone?: "error" | "warn" | "orange" | "info" | "success";
  className?: string;
}) {
  const color = TONE_COLORS[tone];
  const bars = values.length > 0 ? values : [0];
  const data = bars.map((value, i) => ({ i, value }));
  const lastIndex = data.length - 1;

  return (
    <div className={className} style={{ width: 72, height: 28 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <Bar dataKey="value" radius={[1, 1, 0, 0]} maxBarSize={4} isAnimationActive={false}>
            {data.map((_, index) => (
              <Cell
                key={index}
                fill={color}
                fillOpacity={
                  index === lastIndex
                    ? 1
                    : lastIndex > 0
                      ? 0.35 + (index / lastIndex) * 0.35
                      : 0.5
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
