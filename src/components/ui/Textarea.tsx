import * as React from "react"

import { cn } from "../../lib/cn"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    error?: boolean;
  }

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, "aria-invalid": ariaInvalid, ...props }, ref) => {
    return (
      <textarea
        aria-invalid={error || ariaInvalid}
        className={cn(
          "voxa-textarea voxa-focus disabled:cursor-not-allowed disabled:opacity-45",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
