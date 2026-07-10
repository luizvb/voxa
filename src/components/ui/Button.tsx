import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../../lib/cn"

const buttonVariants = cva(
  "voxa-button voxa-focus",
  {
    variants: {
      variant: {
        primary: "voxa-button-primary",
        secondary: "voxa-button-secondary",
        outline: "voxa-button-outline",
        destructive: "voxa-button-destructive",
        ghost: "voxa-button-ghost",
        link: "voxa-button-link",
        // Retrocompatibilidade
        gradient: "voxa-button-primary",
        icon: "voxa-button-icon",
      },
      size: {
        default: "",
        sm: "voxa-button-sm",
        md: "",
        lg: "voxa-button-lg",
        icon: "voxa-button-icon",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
