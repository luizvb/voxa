import * as React from "react"
import { cn } from "../../lib/cn"

export interface SegmentedControlOption {
  value: string
  label: string
  icon?: React.ReactNode
}

export interface SegmentedControlProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  value: string
  options: SegmentedControlOption[]
  onValueChange: (value: string) => void
  "aria-label": string
}

function SegmentedControl({
  className,
  value,
  options,
  onValueChange,
  "aria-label": ariaLabel,
  ...props
}: SegmentedControlProps) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        "voxa-segmented",
        className
      )}
      {...props}
    >
      {options.map((option) => {
        const isSelected = option.value === value

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            data-selected={isSelected}
            className={cn(
              "voxa-segmented-item voxa-focus"
            )}
            onClick={() => onValueChange(option.value)}
          >
            {option.icon}
            <span>{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}

export { SegmentedControl }
