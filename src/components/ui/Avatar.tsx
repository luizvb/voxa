import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"

import { cn } from "../../lib/cn"

export interface AvatarProps extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root> {
  src?: string;
  alt?: string;
  fallback?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizes = {
  sm: 'voxa-avatar-sm',
  md: 'voxa-avatar-md',
  lg: 'voxa-avatar-lg',
  xl: 'voxa-avatar-xl',
};

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  AvatarProps
>(({ className, src, alt, fallback, size = 'md', ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(
      "voxa-avatar",
      sizes[size],
      className
    )}
    {...props}
  >
    <AvatarPrimitive.Image
      src={src}
      alt={alt}
      className="voxa-avatar-image"
    />
    <AvatarPrimitive.Fallback
      className="voxa-avatar-fallback"
    >
      {fallback || alt?.charAt(0).toUpperCase() || '?'}
    </AvatarPrimitive.Fallback>
  </AvatarPrimitive.Root>
))
Avatar.displayName = AvatarPrimitive.Root.displayName

export { Avatar }
