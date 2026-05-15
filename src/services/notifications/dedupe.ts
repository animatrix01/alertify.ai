const STORAGE_KEY = "alertify:notified_alert_ids";
const MAX_IDS = 400;

function readIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((x): x is string => typeof x === "string"));
  } catch {
    return new Set();
  }
}

function writeIds(ids: Set<string>) {
  if (typeof window === "undefined") return;
  const trimmed = [...ids].slice(-MAX_IDS);
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    /* quota / private mode */
  }
}

const memory = readIds();

export function wasAlertAlreadyNotified(alertId: string): boolean {
  return memory.has(alertId);
}

export function markAlertNotified(alertId: string) {
  memory.add(alertId);
  writeIds(memory);
}
