"use client"

import dynamic from "next/dynamic"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
const MapView = dynamic(
  () => import("@/components/map/map").then((mod) => mod.MapView),
  { ssr: false, loading: () => <div className="h-[500px] bg-gray-100 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400">Loading map...</div> }
)
import { StopList } from "@/components/itinerary/stop-list"
import { MetricCards } from "@/components/itinerary/metric-cards"
import { formatMoney, formatDuration, formatTimeHHMM } from "@/lib/calculations"
import { useItinerary } from "@/components/itinerary-context"
import type { ItineraryStop } from "@/lib/types"

export default function ItineraryPage() {
  const router = useRouter()
  const { itinerary, setItinerary } = useItinerary()
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null)

  useEffect(() => {
    if (!itinerary) router.push("/planner")
  }, [itinerary, router])

  if (!itinerary) return null

  const selectedStop: ItineraryStop | null =
    itinerary.stops.find((s) => s.id === selectedStopId) ||
    itinerary.stops[0] ||
    null

  return (
    <div className="min-h-screen bg-offwhite text-navy" role="region" aria-label="Optimized itinerary">
      <nav className="border-b border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/planner")}
            aria-label="Back to planner"
          >
            <ArrowRight className="w-3 h-3 mr-1" rotate={180} /> Back to planner
          </Button>
          <div className="flex items-center gap-3">
            <Badge variant={itinerary.simulated ? "warning" : "success"}>
              {itinerary.simulated ? "Simulated" : "Live"}
            </Badge>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-navy">Your Itinerary</h1>
            <p className="text-gray-500 text-sm">
              Optimized route • {itinerary.stops.length} stops
            </p>
          </div>
          <Button onClick={() => router.push("/execution")} className="hidden sm:block" aria-label="Start execution mode">
            Start Execution <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>

        <MetricCards
          efficiencyScore={itinerary.efficiency_score ?? 0}
          fuelCost={itinerary.fuel_cost ?? 0}
          distanceMiles={itinerary.total_distance_miles}
          travelTimeMinutes={itinerary.total_travel_time_minutes ?? 0}
          timeSavedMinutes={itinerary.savings?.time_saved_minutes ?? 0}
        />

        <div className="mt-8 grid lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7">
            <Card>
              <CardHeader className="flex items-center justify-between pb-3">
                <CardTitle className="text-base">Route Map</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <MapView
                  stops={itinerary.stops}
                  selectedStopId={selectedStopId}
                  onStopSelect={setSelectedStopId}
                  className="h-[500px]"
                />
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-5">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Stops</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <StopList
                  stops={itinerary.stops}
                  selectedStopId={selectedStopId}
                  onStopSelect={setSelectedStopId}
                />
              </CardContent>
            </Card>

            {itinerary.constraint_warnings.length > 0 && (
              <Card className="mt-6 border-amber-100 bg-amber-50" role="region" aria-label="Constraint warnings">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-amber-800">Constraint warnings</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <ul className="text-sm text-amber-700 space-y-2 list-disc pl-4">
                    {itinerary.constraint_warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {selectedStop && (
          <Card className="mt-8 border-teal-100 bg-teal/5" role="region" aria-label="Selected stop details">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-navy">{selectedStop.name}</p>
                  <p className="text-xs text-gray-500">
                    {selectedStop.address || "No address"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-navy">
                    {formatTimeHHMM(selectedStop.arrival_time)} →{" "}
                    {formatTimeHHMM(selectedStop.departure_time)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatDuration(selectedStop.travel_duration_minutes)} travel •{" "}
                    {formatDuration(selectedStop.estimated_duration_minutes)} task
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
