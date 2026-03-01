import { PieChart, Pie, Cell } from 'recharts'

interface LeadScoreGaugeProps {
  score: number
  size?: number
}

function getColor(score: number) {
  if (score >= 61) return '#10B981' // emerald
  if (score >= 21) return '#F59E0B' // amber
  return '#9CA3AF' // gray
}

export function LeadScoreGauge({ score, size = 120 }: LeadScoreGaugeProps) {
  const color = getColor(score)
  const data = [
    { value: score },
    { value: 100 - score },
  ]

  return (
    <div className="relative inline-flex items-center justify-center">
      <PieChart width={size} height={size / 2 + 10}>
        <Pie
          data={data}
          cx={size / 2}
          cy={size / 2}
          startAngle={180}
          endAngle={0}
          innerRadius={size / 2 - 14}
          outerRadius={size / 2 - 4}
          dataKey="value"
          stroke="none"
        >
          <Cell fill={color} />
          <Cell fill="#E8E8E0" />
        </Pie>
      </PieChart>
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center">
        <span className="text-lg font-heading font-bold" style={{ color }}>
          {score}
        </span>
      </div>
    </div>
  )
}
