import assert from "node:assert/strict";
import test from "node:test";

import { maskLogEntry, maskString } from "./masking.ts";
import type { LogEntry } from "./types";

test("masks auth tokens, headers, cookies, and key-value secrets", () => {
  const input = [
    "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signature",
    "cookie: session=abc123; refresh=def456",
    "password=correct-horse-battery-staple",
    "client_secret=super-secret-value",
    "api_key=sk_live_1234567890abcdef",
  ].join(" ");

  const masked = maskString(input);

  assert.match(masked, /\[REDACTED:authorization\]|Bearer \[REDACTED:token\]/);
  assert.match(masked, /\[REDACTED:cookie\]/);
  assert.match(masked, /password=\[REDACTED:secret\]/i);
  assert.match(masked, /client_secret=\[REDACTED:secret\]/i);
  assert.match(masked, /api_key=\[REDACTED:secret\]/i);
  assert.doesNotMatch(masked, /correct-horse|super-secret-value|sk_live_1234567890abcdef/);
});

test("masks emails, phone numbers, long ids, and base64-like values", () => {
  const input = [
    "email=ops@example.com",
    "phone +1 (415) 555-1212",
    "request 550e8400-e29b-41d4-a716-446655440000",
    "object 507f1f77bcf86cd799439011",
    "blob QWxhZGRpbjpvcGVuIHNlc2FtZTEyMzQ1Njc4OTA=",
  ].join(" ");

  const masked = maskString(input);

  assert.match(masked, /\[REDACTED:email\]/);
  assert.match(masked, /\[REDACTED:phone\]/);
  assert.match(masked, /\[REDACTED:id\]/);
  assert.match(masked, /\[REDACTED:secret\]/);
  assert.doesNotMatch(masked, /ops@example\.com|415\) 555-1212|550e8400|507f1f77|QWxhZGRpb/);
});

test("masks both message and rawPayload on log entries", () => {
  const row: LogEntry = {
    id: "1",
    timestamp: "2026-01-01T00:00:00.000Z",
    app: "ca-data-api",
    level: "INFO",
    stream: "stdout",
    revision: "ca-data-api--0001",
    replica: "ca-data-api-replica",
    message: "user admin@example.com token=abcd1234secret",
    rawPayload: JSON.stringify({ authorization: "Bearer abcdefghijklmnopqrstuvwxyz123456" }),
  };

  const masked = maskLogEntry(row);

  assert.doesNotMatch(masked.message, /admin@example\.com|abcd1234secret/);
  assert.doesNotMatch(masked.rawPayload, /abcdefghijklmnopqrstuvwxyz123456/);
  assert.match(masked.message, /\[REDACTED:email\]/);
  assert.match(masked.rawPayload, /\[REDACTED:authorization\]|Bearer \[REDACTED:token\]/);
});
