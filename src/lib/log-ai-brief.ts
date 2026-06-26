import type { LogEntry, LogLevel } from "@/lib/types";

const MAX_BODY = 4000;

function truncate(text: string): string {
  if (text.length <= MAX_BODY) return text;
  return text.slice(0, MAX_BODY) + `\n… [truncated ${text.length - MAX_BODY} chars]`;
}

function fence(text: string, lang = ""): string {
  return "```" + lang + "\n" + text + "\n```";
}

const BRIEF_INTRO: Record<
  LogLevel,
  { title: string; prompt: string; section: string }
> = {
  ERROR: {
    title: "Application error — debug brief",
    prompt:
      "An error was logged in our Savvly container app. Help me identify the root cause, explain what failed, and propose a fix.",
    section: "Error",
  },
  WARN: {
    title: "Application warning — context brief",
    prompt:
      "A warning was logged in our Savvly container app. Help me understand whether this indicates a real problem, what triggered it, and what I should investigate.",
    section: "Warning",
  },
  INFO: {
    title: "Application log — context brief",
    prompt:
      "An informational log entry from our Savvly container app. Help me understand what operation occurred, why it was logged, and where it fits in the system.",
    section: "Event",
  },
  DEBUG: {
    title: "Debug trace — context brief",
    prompt:
      "A debug-level log from our Savvly container app. Help me trace execution flow, explain the underlying behavior, and point to relevant code paths.",
    section: "Debug output",
  },
  LOG: {
    title: "Application log — context brief",
    prompt:
      "An uncategorised log line from our Savvly container app. Help me understand what it represents, whether it matters, and where it fits in the system.",
    section: "Log output",
  },
};

/** Builds a self-contained, AI-friendly brief for a log entry. */
export function toLogAiBrief(entry: LogEntry, masked: boolean): string {
  const intro = BRIEF_INTRO[entry.level];
  const lines: string[] = [];

  lines.push(`# ${intro.title}`);
  lines.push("");
  lines.push(intro.prompt);
  if (masked) {
    lines.push("");
    lines.push(
      "_Note: this log may contain redacted/masked values. Treat placeholders as sensitive data._",
    );
  }
  lines.push("");
  lines.push(`## ${intro.section}`);
  lines.push(`- App: \`${entry.app}\``);
  lines.push(`- Level: **${entry.level}**`);
  lines.push(`- Time: ${entry.timeGenerated}`);
  lines.push(`- Stream: \`${entry.stream}\``);
  if (entry.requestId) {
    lines.push(`- Request ID: \`${entry.requestId}\``);
  }
  lines.push("");
  lines.push("Message:");
  lines.push(fence(truncate(entry.message)));
  lines.push("");
  lines.push("## Runtime context");
  lines.push(`- Revision: \`${entry.revision}\``);
  lines.push(`- Replica: \`${entry.replica}\``);
  lines.push("");
  lines.push("## Where to look");
  lines.push(
    `- Search the \`${entry.app}\` codebase for strings or patterns from the message above.`,
  );
  if (entry.requestId) {
    lines.push(
      `- Correlate with upstream/downstream logs using request ID \`${entry.requestId}\`.`,
    );
  }
  lines.push(
    `- Check recent deployments for revision \`${entry.revision}\` if this started after a release.`,
  );
  if (entry.level === "ERROR") {
    lines.push("- Look for stack traces, exception types, or failed dependencies in the raw payload.");
  } else if (entry.level === "WARN") {
    lines.push("- Check for degraded dependencies, retries, timeouts, or config drift near this timestamp.");
  } else if (entry.level === "INFO") {
    lines.push("- Use this as timeline context when debugging related errors or user reports.");
  } else {
    lines.push("- Follow variable values and call flow hints in the raw payload below.");
  }
  lines.push("");
  lines.push("## Raw payload");
  lines.push(fence(truncate(entry.raw)));

  return lines.join("\n");
}
