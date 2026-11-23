"use client"

import { MapPin, Clock, DollarSign, TrendingDown } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatMoney, formatDuration } from "@/lib/calculations"

interface MetricCardProps {
  title: string
  value: string
  icon: React.ReactNode
}

export function MetricCard({ title, value, icon }: MetricCardProps) {
  return (
    <Card className="p-4">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-500">{title}</CardTitle>
        <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center text-gray-500">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-navy">{value}</div>
      </CardContent>
    </Card>
  )
}

interface MetricCardsProps {
  efficiencyScore: number
  fuelCost: number
  distanceMiles: number
  travelTimeMinutes: number
  timeSavedMinutes: number
}

export function MetricCards({
  efficiencyScore,
  fuelCost,
  distanceMiles,
  travelTimeMinutes,
  timeSavedMinutes,
}: MetricCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard
        title="Efficiency Score"
        value={`${efficiencyScore}/100`}
        icon={<TrendingDown className="w-5 h-5" />}
      />
      <MetricCard
        title="Fuel Cost"
        value={formatMoney(fuelCost)}
        icon={<DollarSign className="w-5 h-5" />}
      />
      <MetricCard
        title="Distance"
        value={`${distanceMiles} mi`}
        icon={<MapPin className="w-5 h-5" />}
      />
      <MetricCard
        title="Travel Time"
        value={formatDuration(travelTimeMinutes)}
        icon={<Clock className="w-5 h-5" />}
      />
    </div>
  )
}
