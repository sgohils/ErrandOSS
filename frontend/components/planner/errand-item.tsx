"use client"

import { Trash2, Edit2, GripVertical, Clock, MapPin } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { formatTimeHHMM, minutesToHHMM } from "@/lib/calculations"
import type { Errand } from "@/lib/types"

const PRIORITY_LABEL: Record<string, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
}

interface ErrandItemProps {
  errand: Errand
  index: number
  onUpdate: (errand: Errand) => void
  onRemove: (id: string) => void
  onEdit: (errand: Errand) => void
}

export function ErrandItem({
  errand,
  index,
  onUpdate,
  onRemove,
  onEdit,
}: ErrandItemProps) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(errand.name)
  const [location, setLocation] = useState(errand.location_query || "")
  const [duration, setDuration] = useState(
    String(errand.estimated_duration_minutes)
  )

  const handleSave = () => {
    onUpdate({
      ...errand,
      name,
      location_query: location || undefined,
      estimated_duration_minutes: Number(duration) || errand.estimated_duration_minutes,
    })
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg border border-teal/20 bg-teal/5">
        <GripVertical className="w-5 h-5 text-gray-400" />
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 text-sm"
          placeholder="Errand name"
        />
        <Input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Location"
          className="w-48 text-sm"
        />
        <Input
          type="number"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          className="w-16 text-sm"
          placeholder="min"
        />
        <Button
          size="sm"
          variant="outline"
          onClick={handleSave}
          className="h-8 px-2"
        >
          Save
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setEditing(false)}
          className="h-8 p-1"
        >
          <Edit2 className="w-4 h-4" />
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 bg-white hover:shadow-sm transition-shadow">
      <GripVertical className="w-5 h-5 text-gray-300 cursor-grab" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-navy truncate">{errand.name}</span>
          <Badge variant="secondary">{PRIORITY_LABEL[errand.priority]}</Badge>
          {errand.closing_time && (
            <Badge variant="warning" className="text-xs">
              Closes {formatTimeHHMM(errand.closing_time)}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
          <MapPin className="w-3 h-3" />
          <span className="truncate">{errand.location_query || "No location"}</span>
          <Clock className="w-3 h-3" />
          <span>{minutesToHHMM(errand.estimated_duration_minutes)}</span>
          <span>{errand.completion_status === "completed" ? "Done" : "Pending"}</span>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setEditing(true)
            setName(errand.name)
            setLocation(errand.location_query || "")
            setDuration(String(errand.estimated_duration_minutes))
          }}
          className="h-7 p-1"
        >
          <Edit2 className="w-3 h-3" />
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={() => onRemove(errand.id)}
          className="h-7 p-1"
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
    </div>
  )
}
