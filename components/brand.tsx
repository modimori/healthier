import type { SVGProps } from "react";

export function BrandMark({
  className,
  ...props
}: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <rect width="36" height="36" rx="11" fill="currentColor" />
      <path
        d="M9.5 20.5H14L16.2 13L20 26L22.6 20.5H26.5"
        stroke="#F5F2E9"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="wordmark" aria-label="Healthier">
      <BrandMark className="wordmark-mark" />
      {!compact && (
        <span className="wordmark-text">
          healthier<span className="wordmark-dot">.</span>
        </span>
      )}
    </span>
  );
}
