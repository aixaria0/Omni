import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Badge({
  className,
  tone = "neutral",
  children,
}: {
  className?: string;
  tone?: "neutral" | "ok" | "warn" | "danger" | "accent";
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium tracking-wide",
        tone === "neutral" && "border-border text-muted",
        tone === "ok" && "border-ok/30 text-ok",
        tone === "warn" && "border-warn/30 text-warn",
        tone === "danger" && "border-danger/30 text-danger",
        tone === "accent" && "border-accent/30 text-accent",
        className,
      )}
    >
      {children}
    </span>
  );
}
