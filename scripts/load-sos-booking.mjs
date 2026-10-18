import { randomUUID } from "node:crypto";

const base = process.env.PAWCARE_LOAD_BASE_URL;
const cookie = process.env.PAWCARE_LOAD_COOKIE;
if (!base || !cookie) throw new Error("Set PAWCARE_LOAD_BASE_URL and a dedicated PAWCARE_LOAD_COOKIE; never point this at production.");
const target = new URL(base);
const loopback = new Set(["localhost", "127.0.0.1", "::1"]).has(target.hostname);
const environment = process.env.PAWCARE_LOAD_ENV ?? "local";
if (!new Set(["local", "staging"]).has(environment)) throw new Error("Load tests are allowed only for local or staging environments.");
if (loopback && environment !== "local") throw new Error("Use PAWCARE_LOAD_ENV=local for loopback targets.");
if (!loopback && (environment !== "staging" || process.env.PAWCARE_LOAD_ALLOW_REMOTE !== "1")) throw new Error("Remote load targets require PAWCARE_LOAD_ENV=staging and PAWCARE_LOAD_ALLOW_REMOTE=1.");
const concurrency = Math.max(1, Math.min(100, Number(process.env.PAWCARE_LOAD_CONCURRENCY ?? 20)));
const sosTemplate = JSON.parse(process.env.PAWCARE_LOAD_SOS_BODY ?? "{}");
const bookingTemplate = JSON.parse(process.env.PAWCARE_LOAD_BOOKING_BODY ?? "{}");

async function request(path, body) {
  const started = performance.now();
  const response = await fetch(new URL(path, target), { method: "POST", headers: { cookie, origin: target.origin, "content-type": "application/json" }, body: JSON.stringify(body) });
  return { status: response.status, ms: performance.now() - started, body: await response.json().catch(() => null) };
}
function percentile(values, p) { return values.toSorted((a, b) => a - b)[Math.ceil(values.length * p) - 1] ?? 0; }
function report(label, values) {
  const times = values.map((v) => v.ms);
  const failures = values.filter((v) => v.status >= 500);
  console.log(JSON.stringify({ label, requests: values.length, concurrency, p50_ms: Math.round(percentile(times, .5)), p95_ms: Math.round(percentile(times, .95)), statuses: Object.fromEntries([...new Set(values.map((v) => v.status))].map((s) => [s, values.filter((v) => v.status === s).length])), server_errors: failures.length }));
  if (failures.length) process.exitCode = 1;
}

const sos = await Promise.all(Array.from({ length: concurrency }, (_, i) => request("/api/sos", { ...sosTemplate, idempotencyKey: randomUUID(), testRun: i })));
report("sos-fan-out-request-path", sos);
const booking = await Promise.all(Array.from({ length: concurrency }, () => request("/api/appointments", { ...bookingTemplate, idempotencyKey: randomUUID() })));
report("booking-same-slot-race", booking);
const bookingSuccesses = booking.filter((result) => result.status === 201).length;
if (bookingSuccesses !== 1) { console.error(`Expected one winner for the shared slot; observed ${bookingSuccesses}.`); process.exitCode = 1; }
