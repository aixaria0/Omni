import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "h-12 w-full rounded-xl border border-border bg-elevated/90 px-4 text-sm text-fg shadow-[inset_0_1px_0_rgba(255,255,255,.02)] placeholder:text-subtle transition",
        "focus-visible:border-accent/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/10",
        className,
      )}
      {...props}
    />
  );
}
