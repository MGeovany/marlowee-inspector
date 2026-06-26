"use client";

import { useId } from "react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";

import { cn } from "@/lib/utils";

const TONE_COLORS: Record<string, string> = {
  error: "var(--red)",
  warn: "var(--orange)",
  orange: "var(--orange)",
  info: "var(--accent-bright)",
  success: "var(--green)",
};

/** Mini area sparkline for metric cards — axis-free, glass-friendly gradient fill. */
export function Sparkline({
  values,
  tone = "error",
  className,
  loading = false,
}: {
  values: number[];
  tone?: "error" | "warn" | "orange" | "info" | "success";
  className?: string;
  loading?: boolean;
}) {
  const gradientId = `spark-${useId().replace(/:/g, "")}`;
  const color = TONE_COLORS[tone];
  const series = values.length > 0 ? values : [0];
  const data = series.map((value, i) => ({ i, value }));

  return (
    <div
      className={cn("h-8 w-[88px] shrink-0", loading && "opacity-40", className)}
      aria-hidden
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 1, left: 1, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.38} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#${gradientId})`}
            isAnimationActive={!loading}
            animationDuration={420}
            animationEasing="ease-out"
            dot={false}
            activeDot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
