import React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  children,
  ...props
}: ButtonProps) {
  const baseStyles =
    "inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl select-none cursor-pointer";

  const variants = {
    primary:
      "bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-400 hover:to-blue-500 shadow-lg shadow-cyan-500/20 active:scale-[0.98]",
    secondary:
      "bg-slate-800 text-slate-100 hover:bg-slate-700 border border-slate-700 shadow-sm active:scale-[0.98]",
    outline:
      "bg-transparent text-slate-200 border border-slate-700 hover:bg-slate-800/60 hover:border-slate-600 active:scale-[0.98]",
    ghost:
      "bg-transparent text-slate-400 hover:text-slate-100 hover:bg-slate-800/40",
  };

  const sizes = {
    sm: "text-xs px-3.5 py-1.5 gap-1.5",
    md: "text-sm px-5 py-2.5 gap-2",
    lg: "text-base px-7 py-3.5 gap-2.5 font-semibold",
  };

  return (
    <button
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </button>
  );
}
