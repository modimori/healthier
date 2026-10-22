import type { ReactNode } from "react";

type ProgressRingProps = {
  value: number;
  size?: number;
  stroke?: number;
  children?: ReactNode;
  className?: string;
};

export function ProgressRing({
  value,
  size = 132,
  stroke = 8,
  children,
  className,
}: ProgressRingProps) {
  const radius = (size - stroke) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = Math.min(Math.max(value, 0), 1);
  const offset = circumference * (1 - progress);

  return (
    <div
      className={`progress-ring${className ? ` ${className}` : ""}`}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} aria-hidden="true">
        <circle
          className="progress-ring-track"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
        />
        <circle
          className="progress-ring-value"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="progress-ring-content">{children}</div>
    </div>
  );
}
