"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  size?: "default" | "sm" | "lg"
  variant?: "default" | "outline"
  asChild?: boolean
}

const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(
  ({ className, size = "default", variant = "default", ...props }, ref) => {
    const sizes = {
      default: "h-10 px-4 py-2",
      sm: "h-9 rounded-md px-3",
      lg: "h-11 rounded-md px-8",
    }
    const base =
      "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
    const variants = {
      default: "bg-teal text-white hover:bg-[#1aa89a]",
      outline: "border border-gray-200 bg-white text-navy hover:bg-gray-50",
    }
    return (
      <a
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        {...props}
      />
    )
  }
)
Link.displayName = "Link"

export { Link }
