import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../../lib/cn"

const badgeVariants = cva(
  "voxa-badge voxa-focus",
  {
    variants: {
      variant: {
        default: "voxa-badge-default",
        primary: "voxa-badge-primary",
        secondary: "voxa-badge-secondary",
        destructive: "voxa-badge-destructive",
        outline: "voxa-badge-outline",
        success: "voxa-badge-success",
        warning: "voxa-badge-warning",
        danger: "voxa-badge-danger",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
