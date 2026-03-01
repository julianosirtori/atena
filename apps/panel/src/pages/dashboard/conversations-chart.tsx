import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Card } from '@/components/ui/card'
import { STATUS_CONFIG } from '@/lib/constants'
import type { ConversationStatus } from '@/types'

interface ConversationsChartProps {
  data: Record<string, number>
}

const statusColors: Record<string, string> = {
  ai: '#3B82F6',
  waiting_human: '#F59E0B',
  human: '#8B5CF6',
  closed: '#9CA3AF',
}

export function ConversationsChart({ data }: ConversationsChartProps) {
  const chartData = Object.entries(data).map(([status, count]) => ({
    status: STATUS_CONFIG[status as ConversationStatus]?.label ?? status,
    count,
    key: status,
  }))

  return (
    <Card>
      <h3 className="mb-4 font-heading text-sm font-semibold text-warm-800">Conversas por status</h3>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} barCategoryGap="25%">
            <XAxis dataKey="status" tick={{ fontSize: 12, fill: '#737366' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: '#737366' }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={{
                borderRadius: '8px',
                border: '1px solid #E8E8E0',
                fontSize: '12px',
              }}
            />
            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
              {chartData.map((entry) => (
                <Cell key={entry.key} fill={statusColors[entry.key] ?? '#D97706'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
