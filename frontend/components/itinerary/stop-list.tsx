"use client"

import { cn } from "@/lib/utils"
import { Clock, MapPin, AlertCircle, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatTimeHHMM, formatDuration } from "@/lib/calculations"
import type { ItineraryStop } from "@/lib/types"

interface StopRowProps {
  stop: ItineraryStop
  selected: boolean
  onSelect: () => void
}

export function StopRow({ stop, selected, onSelect }: StopRowProps) {
  return (
    <button
      onClick={onSelect}
      role="listitem"
      aria-label={`Stop ${stop.order}: ${stop.name}, arrives ${formatTimeHHMM(stop.arrival_time)}, departs ${formatTimeHHMM(stop.departure_time)}`}
      aria-selected={selected}
      className={cn(
        "flex items-center justify-between gap-3 p-3 rounded-lg border transition-colors",
        selected
          ? "border-teal bg-teal/5"
          : "border-gray-100 bg-white hover:bg-gray-50"
      )}
    >
      <div className="flex items-center gap-3">
        <span className={`flex w-6 h-6 items-center justify-center rounded-full text-xs font-bold ${selected ? "bg-teal text-white" : "bg-gray-100 text-navy"}`}>
          {stop.order}
        </span>
        <div className="min-w-0">
          <div className="text-sm font-medium text-navy truncate">{stop.name}</div>
          <div className="text-xs text-gray-500 truncate">
            {stop.address || "No address"}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <Clock className="w-3.5 h-3.5" />
        <span>{formatTimeHHMM(stop.arrival_time)}</span>
        <span className="text-navy/60">→</span>
        <span>{formatTimeHHMM(stop.departure_time)}</span>
      </div>
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <MapPin className="w-3.5 h-3.5" />
        <span>{formatDuration(stop.travel_duration_minutes)} travel</span>
      </div>
      {stop.constraint_warning && (
        <AlertCircle className="w-4 h-4 text-amber-600" />
      )}
    </button>
  )
}

interface StopListProps {
  stops: ItineraryStop[]
  selectedStopId: string | null
  onStopSelect: (id: string) => void
}

export function StopList({
  stops,
  selectedStopId,
  onStopSelect,
}: StopListProps) {
  if (stops.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-400" role="status" aria-label="No stops">
        <p>No stops yet. Optimize your day to see your itinerary.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2" role="list" aria-label="Optimized stops">
      {stops.map((stop) => (
        <StopRow
          key={stop.id}
          stop={stop}
          selected={stop.id === selectedStopId}
          onSelect={() => onStopSelect(stop.id)}
        />
      ))}
    </div>
  )
}
