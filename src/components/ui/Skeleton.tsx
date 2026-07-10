import * as React from "react"
import { cn } from "../../lib/cn"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("voxa-skeleton rounded-lg", className)}
      {...props}
    />
  )
}

export { Skeleton }
