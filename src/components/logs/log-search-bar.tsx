"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";

import { cn } from "@/lib/utils";

interface LogSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const QUERY_HINTS = ["app:", "level:", "requestId:"];

export function LogSearchBar({ value, onChange, className }: LogSearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [modHint, setModHint] = useState("⌘K");
  const [focused, setFocused] = useState(false);

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

  const showHints = !value && !focused;

  return (
    <div
      className={cn(
        "query-bar",
        focused && "query-bar-focused",
        value.length > 0 && "query-bar-active",
        className,
      )}
    >
      <span className="query-bar-icon" aria-hidden>
        <Search className="h-3.5 w-3.5" strokeWidth={2.25} />
      </span>

      <span className="query-bar-divider" aria-hidden />

      <div className="query-bar-field min-w-0 flex-1">
        <input
          ref={inputRef}
          type="search"
          enterKeyHint="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Search logs…"
          className="query-bar-input"
          aria-label="Search logs, requestId, endpoint, error message"
          autoComplete="off"
          spellCheck={false}
        />

        {showHints && (
          <div className="query-bar-hints hidden xl:flex" aria-hidden>
            {QUERY_HINTS.map((hint) => (
              <button
                key={hint}
                type="button"
                tabIndex={-1}
                className="query-bar-hint"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(hint);
                  inputRef.current?.focus();
                }}
              >
                {hint}
              </button>
            ))}
          </div>
        )}
      </div>

      <span className="query-bar-divider query-bar-divider-trail" aria-hidden />

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
          <X className="h-3 w-3" strokeWidth={2.5} />
        </button>
      ) : (
        <kbd className="query-bar-kbd" aria-hidden>
          {modHint}
        </kbd>
      )}
    </div>
  );
}
