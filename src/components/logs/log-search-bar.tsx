"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";

import { cn } from "@/lib/utils";

interface LogSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function LogSearchBar({ value, onChange, className }: LogSearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [modHint, setModHint] = useState("⌘K");

  useEffect(() => {
    const isMac = /Mac|iPhone|iPad/i.test(navigator.userAgent);
    setModHint(isMac ? "⌘K" : "Ctrl K");
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
      if (e.key === "Escape" && document.activeElement === inputRef.current) {
        onChange("");
        inputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onChange]);

  return (
    <div className={cn("query-bar group", className)}>
      <span className="query-bar-icon" aria-hidden>
        <Search className="h-3.5 w-3.5" />
      </span>

      <input
        ref={inputRef}
        type="search"
        enterKeyHint="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search logs, requestId, endpoint, error message…"
        className="query-bar-input"
        aria-label="Search logs"
        autoComplete="off"
        spellCheck={false}
      />

      {value ? (
        <button
          type="button"
          onClick={() => {
            onChange("");
            inputRef.current?.focus();
          }}
          className="query-bar-clear"
          aria-label="Clear search"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : (
        <kbd className="query-bar-kbd" aria-hidden>
          {modHint}
        </kbd>
      )}
    </div>
  );
}
