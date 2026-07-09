import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function Logo({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={twMerge(clsx("w-8 h-8", className))}
      {...props}
    >
      <defs>
        <linearGradient id="voxa-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00E5FF" />
          <stop offset="100%" stopColor="#B400FF" />
        </linearGradient>
      </defs>
      
      {/* Left sound wave forming the left side of V */}
      <path
        d="M20 15 C 30 35, 40 60, 50 85 C 45 60, 35 35, 30 15 Z"
        fill="url(#voxa-gradient)"
        opacity="0.8"
      />
      <path
        d="M10 25 C 20 45, 35 70, 48 85 C 40 70, 25 45, 20 25 Z"
        fill="url(#voxa-gradient)"
        opacity="0.5"
      />

      {/* Right sound wave forming the right side of V */}
      <path
        d="M80 15 C 70 35, 60 60, 50 85 C 55 60, 65 35, 70 15 Z"
        fill="url(#voxa-gradient)"
        opacity="0.8"
      />
      <path
        d="M90 25 C 80 45, 65 70, 52 85 C 60 70, 75 45, 80 25 Z"
        fill="url(#voxa-gradient)"
        opacity="0.5"
      />
      
      {/* Center core connection */}
      <circle cx="50" cy="85" r="5" fill="url(#voxa-gradient)" />
    </svg>
  );
}
