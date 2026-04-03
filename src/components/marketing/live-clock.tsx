"use client";

import { useEffect, useState } from "react";

/** Real local time — tiny proof the page is alive. */
export function LiveClock() {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    function tick() {
      setLabel(
        new Date().toLocaleTimeString(undefined, {
          hour: "numeric",
          minute: "2-digit",
          second: "2-digit",
        }),
      );
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <span className="tabular-nums tracking-tight text-sage-forest">
      {label ?? "—"}
    </span>
  );
}
