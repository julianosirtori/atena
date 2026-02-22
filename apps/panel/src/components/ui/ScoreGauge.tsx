interface ScoreGaugeProps {
  score: number
  size?: 'sm' | 'md' | 'lg'
}

function getColor(score: number): string {
  if (score >= 61) return '#dc2626'
  if (score >= 21) return '#2563eb'
  return '#6b7280'
}

const sizeConfig = {
  sm: { r: 20, stroke: 4, fontSize: 'text-xs', dim: 48 },
  md: { r: 30, stroke: 5, fontSize: 'text-sm', dim: 70 },
  lg: { r: 40, stroke: 6, fontSize: 'text-lg', dim: 92 },
}

export function ScoreGauge({ score, size = 'md' }: ScoreGaugeProps) {
  const { r, stroke, fontSize, dim } = sizeConfig[size]
  const circumference = 2 * Math.PI * r
  const pct = Math.min(score, 100) / 100
  const offset = circumference * (1 - pct)
  const color = getColor(score)

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: dim, height: dim }}>
      <svg className="-rotate-90" width={dim} height={dim}>
        <circle cx={dim / 2} cy={dim / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={stroke} />
        <circle
          cx={dim / 2}
          cy={dim / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span className={`absolute font-semibold ${fontSize}`} style={{ color }}>
        {score}
      </span>
    </div>
  )
}
