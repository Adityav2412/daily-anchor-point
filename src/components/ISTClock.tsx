import { useEffect, useState } from "react";
import { formatISTClock, nowIST } from "@/lib/ist";

export function ISTClock({ className = "" }: { className?: string }) {
  const [t, setT] = useState<string>("");
  useEffect(() => {
    setT(formatISTClock(nowIST()));
    const i = setInterval(() => setT(formatISTClock(nowIST())), 1000);
    return () => clearInterval(i);
  }, []);
  // suppressHydrationWarning since clock is client-only
  return <span suppressHydrationWarning className={className}>{t || "\u00a0"}</span>;
}
