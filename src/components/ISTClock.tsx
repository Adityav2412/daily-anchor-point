import { useEffect, useState } from "react";
import { formatISTClock, nowIST } from "@/lib/ist";

export function ISTClock({ className = "" }: { className?: string }) {
  const [t, setT] = useState(() => formatISTClock(nowIST()));
  useEffect(() => {
    const i = setInterval(() => setT(formatISTClock(nowIST())), 1000);
    return () => clearInterval(i);
  }, []);
  return <span className={className}>{t}</span>;
}
