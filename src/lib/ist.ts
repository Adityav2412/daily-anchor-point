// IST = UTC+5:30. All date-keys derive from IST regardless of viewer timezone.
export const IST_OFFSET_MIN = 330;

export function nowIST(): Date {
  const now = new Date();
  return new Date(now.getTime() + (now.getTimezoneOffset() + IST_OFFSET_MIN) * 60000);
}

export function istDateKey(d: Date = nowIST()): string {
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

// Monday-first week containing today (IST). Returns 7 date keys Mon→Sun.
export function currentWeekKeysIST(): string[] {
  const today = nowIST();
  const dow = today.getDay(); // 0=Sun, 1=Mon ... 6=Sat
  const daysFromMonday = (dow + 6) % 7;
  const monday = new Date(today);
  monday.setDate(today.getDate() - daysFromMonday);
  const out: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    out.push(istDateKey(d));
  }
  return out;
}

// Convert "YYYY-MM-DD" IST date to the ms timestamp of IST midnight that day.
export function istMidnightMs(dateKey: string): number {
  const [y, m, d] = dateKey.split("-").map(Number);
  return Date.UTC(y, m - 1, d, 0, 0, 0) - IST_OFFSET_MIN * 60_000;
}

export function istYesterdayKey(): string {
  const d = nowIST();
  d.setDate(d.getDate() - 1);
  return istDateKey(d);
}

export function istGreeting(name = "Akshay"): string {
  const h = nowIST().getHours();
  if (h >= 5 && h < 12) return `Good morning, ${name}`;
  if (h >= 12 && h < 17) return `Good afternoon, ${name}`;
  if (h >= 17 && h < 22) return `Good evening, ${name}`;
  return `Good night, ${name}`;
}

export function formatHM(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

export function formatClock(iso: string): string {
  const d = new Date(iso);
  // convert to IST
  const ist = new Date(d.getTime() + (d.getTimezoneOffset() + IST_OFFSET_MIN) * 60000);
  return `${String(ist.getHours()).padStart(2, "0")}:${String(ist.getMinutes()).padStart(2, "0")}`;
}
