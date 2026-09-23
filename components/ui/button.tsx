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
    "inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 dark:focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl select-none cursor-pointer";

  const variants = {
    primary:
      "bg-gradient-to-r from-sky-500 to-blue-600 dark:from-cyan-500 dark:to-blue-600 text-white hover:from-sky-600 hover:to-blue-700 dark:hover:from-cyan-400 dark:hover:to-blue-500 shadow-md shadow-sky-500/20 dark:shadow-cyan-500/20 hover:shadow-lg active:scale-[0.98]",
    secondary:
      "bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-100 dark:border-slate-700 shadow-sm active:scale-[0.98]",
    outline:
      "bg-transparent text-slate-700 hover:text-slate-900 border border-slate-300 hover:bg-slate-100 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-800/60 dark:hover:border-slate-600 active:scale-[0.98]",
    ghost:
      "bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800/40",
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
