// IST = UTC+5:30. All date-keys derive from IST regardless of viewer timezone.
export const IST_OFFSET_MIN = 330;

export function nowIST(): Date {
  const now = new Date();
  return new Date(now.getTime() + (now.getTimezoneOffset() + IST_OFFSET_MIN) * 60000);
}

export function istDateKey(d: Date = nowIST()): string {
  // d is already an IST-shifted Date when from nowIST()
  const y = d.getUTCFullYear ? d.getFullYear() : d.getFullYear();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function formatISTClock(d: Date = nowIST()): string {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss} IST`;
}

export function formatISTDate(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function msUntilNextISTMidnight(): number {
  const ist = nowIST();
  const next = new Date(ist);
  next.setHours(24, 0, 0, 0);
  return next.getTime() - ist.getTime();
}

export function lastNDays(n: number): string[] {
  const out: string[] = [];
  const today = nowIST();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    out.push(istDateKey(d));
  }
  return out;
}
