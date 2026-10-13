import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-[opacity,transform,background-color,color,border-color,box-shadow] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35 disabled:pointer-events-none disabled:opacity-40 active:scale-[0.985]",
  {
    variants: {
      variant: {
        default:
          "border border-accent/30 bg-accent text-accent-fg shadow-[0_8px_30px_rgba(118,232,255,.08)] hover:border-accent/50 hover:bg-[#9af0ff]",
        secondary:
          "border border-border bg-elevated/85 text-fg shadow-[inset_0_1px_0_rgba(255,255,255,.025)] hover:border-accent/20 hover:bg-surface",
        ghost: "border border-transparent text-muted hover:bg-elevated hover:text-fg",
        danger: "border border-danger/30 bg-danger/10 text-danger hover:bg-danger/15",
      },
      size: {
        default: "h-11 px-4",
        sm: "h-10 px-3.5 text-xs",
        lg: "h-12 px-5",
        icon: "size-11",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}
