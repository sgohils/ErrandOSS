"use client"

import { useCallback, useState } from "react"
import { useRouter } from "next/navigation"
import { MapPin, Clock, CheckCircle2, ArrowRight, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatTimeHHMM, formatDuration } from "@/lib/calculations"
import { useItinerary } from "@/components/itinerary-context"

export default function ExecutionPage() {
  const router = useRouter()
  const { itinerary, setItinerary } = useItinerary()

  if (!itinerary || itinerary.stops.length === 0) {
    router.push("/planner")
    return null
  }

  const [completedIds, setCompletedIds] = useState<string[]>([])

  const incompleteStops = itinerary.stops.filter((s) => !completedIds.includes(s.id))
  const currentStop = incompleteStops[0]
  const nextStop = incompleteStops[1]
  const progress = itinerary.stops.length
    ? Math.round((completedIds.length / itinerary.stops.length) * 100)
    : 0

  const markCompleted = useCallback((id: string) => {
    setCompletedIds((prev) => (prev.includes(id) ? prev : [...prev, id]))
  }, [])

  const reoptimizeRemaining = () => {
    const remaining = incompleteStops.slice(1)
    if (remaining.length === 0) {
      router.push("/itinerary")
      return
    }
    const stops = remaining.map((s, i) => ({
      ...s,
      order: i + 1,
    }))
    setItinerary({
      ...itinerary,
      stops,
      total_travel_time_minutes: stops.reduce((a, b) => a + b.travel_duration_minutes, 0),
      total_estimated_duration_minutes: stops.reduce((a, b) => a + b.estimated_duration_minutes, 0),
    })
    setCompletedIds([])
    router.push("/itinerary")
  }

  return (
    <div className="min-h-screen bg-offwhite text-navy">
      <nav className="border-b border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={() => router.push("/itinerary")}>
            <ArrowRight className="w-3 h-3 mr-1" rotate={180} /> Back to itinerary
          </Button>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-8" role="region" aria-label="Execution mode">
        <h1 className="text-2xl font-bold text-navy mb-2">Execution Mode</h1>
        <p className="text-gray-500 text-sm mb-8">
          Work through your stops in order. Mark each complete as you go.
        </p>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-navy">Progress</span>
            <span className="text-sm font-medium text-teal">{progress}%</span>
          </div>
          <div className="h-3 w-full rounded-full bg-gray-200 overflow-hidden" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Itinerary progress">
            <div
              className="h-full bg-teal transition-all duration-500"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {completedIds.length} of {itinerary.stops.length} stops completed
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {currentStop ? "Current stop" : "All done!"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!currentStop ? (
              <div className="text-center py-8 text-gray-500">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-3 text-teal" />
                <p className="font-medium text-navy">All errands complete.</p>
                <Button onClick={() => router.push("/itinerary")}>View itinerary</Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-500 uppercase">Stop {currentStop.order}</p>
                  <p className="text-lg font-bold text-navy">{currentStop.name}</p>
                  <p className="text-sm text-gray-600">{currentStop.address || "No address"}</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Clock className="w-3 h-3" />
                    <span>{formatTimeHHMM(currentStop.arrival_time)}</span>
                    <span className="text-navy/60">→</span>
                    <span>{formatTimeHHMM(currentStop.departure_time)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <MapPin className="w-3 h-3" />
                    <span>{formatDuration(currentStop.travel_duration_minutes)} travel</span>
                  </div>
                  <Button
                    onClick={() => markCompleted(currentStop.id)}
                    className="w-full mt-4"
                    aria-label={`Mark ${currentStop.name} as completed`}
                  >
                    Mark completed
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {nextStop && (
          <Card className="mt-6 border-gray-100 bg-gray-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-500 uppercase">Next stop</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-navy">{nextStop.name}</p>
                  <p className="text-xs text-gray-500">{nextStop.address || "No address"}</p>
                </div>
                <p className="text-sm text-navy">{formatTimeHHMM(nextStop.arrival_time)}</p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="mt-8 flex items-center gap-3">
          <Button
            onClick={reoptimizeRemaining}
            variant="outline"
            disabled={incompleteStops.length <= 1}
          >
            <RefreshCw className="w-4 h-4 mr-2" /> Reoptimize remaining
          </Button>
        </div>
      </div>
    </div>
  )
}
