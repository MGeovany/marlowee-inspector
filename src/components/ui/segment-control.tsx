"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  disabled?: boolean;
  title?: string;
}

interface SegmentControlProps<T extends string> {
  value: T;
  onValueChange: (value: T) => void;
  options: SegmentOption<T>[];
  className?: string;
  optionClassName?: string;
  mono?: boolean;
}

export function SegmentControl<T extends string>({
  value,
  onValueChange,
  options,
  className,
  optionClassName,
  mono = false,
}: SegmentControlProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef(new Map<T, HTMLButtonElement>());
  const [indicator, setIndicator] = useState({ left: 0, width: 0, ready: false });

  const updateIndicator = useCallback(() => {
    const container = containerRef.current;
    const activeBtn = buttonRefs.current.get(value);
    if (!container || !activeBtn) return;

    const containerRect = container.getBoundingClientRect();
    const btnRect = activeBtn.getBoundingClientRect();

    setIndicator({
      left: btnRect.left - containerRect.left,
      width: btnRect.width,
      ready: true,
    });
  }, [value]);

  useLayoutEffect(() => {
    updateIndicator();
  }, [updateIndicator, options]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const ro = new ResizeObserver(updateIndicator);
    ro.observe(container);
    return () => ro.disconnect();
  }, [updateIndicator]);

  return (
    <div ref={containerRef} className={cn("filter-segment", className)} role="group">
      <div
        aria-hidden
        className={cn("segment-indicator", indicator.ready && "segment-indicator-visible")}
        style={{
          transform: `translateX(${indicator.left}px)`,
          width: indicator.width,
        }}
      />
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            ref={(el) => {
              if (el) buttonRefs.current.set(opt.value, el);
              else buttonRefs.current.delete(opt.value);
            }}
            type="button"
            disabled={opt.disabled}
            title={opt.title}
            aria-pressed={active}
            onClick={() => onValueChange(opt.value)}
            className={cn(
              "segment-option",
              mono && "segment-option-mono",
              active && "segment-option-active",
              opt.disabled && "cursor-not-allowed opacity-35",
              optionClassName,
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
