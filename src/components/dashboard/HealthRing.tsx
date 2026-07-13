type HealthRingProps = {
  value: number
}

export default function HealthRing({ value }: HealthRingProps) {
  const radius = 24
  const stroke = 4
  const normalizedRadius = radius - stroke / 2

  const circumference = normalizedRadius * 2 * Math.PI
  const strokeDashoffset =
    circumference - (value / 100) * circumference

  const color =
    value >= 70
      ? "#22c55e"
      : value >= 50
      ? "#facc15"
      : "#ef4444"

  return (
    <div className="flex flex-col items-center">
      <svg width="60" height="60">
        <circle
          stroke="#27272a"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx="30"
          cy="30"
        />

        <circle
          stroke={color}
          fill="transparent"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          r={normalizedRadius}
          cx="30"
          cy="30"
          style={{
            transition: "stroke-dashoffset .5s ease",
            transform: "rotate(-90deg)",
            transformOrigin: "50% 50%",
          }}
        />

        <text
          x="30"
          y="34"
          textAnchor="middle"
          className="fill-white text-sm font-bold"
        >
          {value}
        </text>
      </svg>

      <p className="mt-1 text-xs text-foreground/65">
        Health
      </p>
    </div>
  )
}
