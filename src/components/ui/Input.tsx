import * as React from "react"

import { cn } from "../../lib/cn"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
    error?: boolean;
  }

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, "aria-invalid": ariaInvalid, ...props }, ref) => {
    return (
      <input
        type={type}
        aria-invalid={error || ariaInvalid}
        className={cn(
          "voxa-input voxa-focus disabled:cursor-not-allowed disabled:opacity-45 file:border-0 file:bg-transparent file:text-sm file:font-medium",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
