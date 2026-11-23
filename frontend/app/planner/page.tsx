"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Target } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ErrandForm } from "@/components/planner/errand-form"
import { ErrandList } from "@/components/planner/errand-list"
import { planItinerary, extractErrands } from "@/lib/api"
import { simulateOptimization } from "@/lib/demo"
import type { Errand, ErrandCreate, ItineraryRequest, OptimizationResult } from "@/lib/types"
import { useItinerary } from "@/components/itinerary-context"

function newErrandId() {
  return typeof crypto !== "undefined" ? crypto.randomUUID() : `errand-${Date.now()}`
}

function toErrand(create: ErrandCreate): Errand {
  return {
    id: newErrandId(),
    ...create,
    verified: false,
    completion_status: "pending",
  }
}

export default function PlannerPage() {
  const router = useRouter()
  const { settings, setItinerary } = useItinerary()
  const [errands, setErrands] = useState<Errand[]>([])
  const [startLocation, setStartLocation] = useState("")
  const [departureTime, setDepartureTime] = useState("12:30")
  const [finalDestination, setFinalDestination] = useState("")
  const [deadline, setDeadline] = useState("")
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [isExtracting, setIsExtracting] = useState(false)
  const [nlInput, setNlInput] = useState("")
  const [error, setError] = useState("")

  const addErrand = useCallback((create: ErrandCreate) => {
    setErrands((prev) => [...prev, toErrand(create)])
  }, [])

  const updateErrand = useCallback((id: string, updates: Partial<ErrandCreate>) => {
    setErrands((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...updates } : e))
    )
  }, [])

  const removeErrand = useCallback((id: string) => {
    setErrands((prev) => prev.filter((e) => e.id !== id))
  }, [])

  const reorderErrands = useCallback((next: Errand[]) => {
    setErrands(next)
  }, [])

  const loadDemoDay = useCallback(() => {
    setStartLocation("Home, Johns Creek, GA")
    setDepartureTime("12:30")
    setFinalDestination("Home, Johns Creek, GA")
    setDeadline("17:00")
    const demoErrands: ErrandCreate[] = [
        { name: "Kroger Groceries", location_query: "Kroger, Johns Creek, GA", estimated_duration_minutes: 30, priority: "normal" },
        { name: "UPS Store", location_query: "UPS Store, Johns Creek, GA", estimated_duration_minutes: 15, priority: "normal" },
        { name: "Gas Station", location_query: "Gas station, Johns Creek, GA", estimated_duration_minutes: 10, priority: "low" },
        { name: "Pharmacy", location_query: "CVS Pharmacy, Johns Creek, GA", estimated_duration_minutes: 20, priority: "high", closing_time: "16:00" },
        { name: "Dry Cleaner", location_query: "Dry cleaner, Johns Creek, GA", estimated_duration_minutes: 10, priority: "low" },
        { name: "Coffee Shop", location_query: "Coffee shop, Johns Creek, GA", estimated_duration_minutes: 15, priority: "low" },
      ]
      setErrands(demoErrands.map(toErrand))
    setError("")
  }, [])

  const handleExtract = async () => {
    if (!nlInput.trim()) {
      setError("Please enter errands in natural language.")
      return
    }
    setIsExtracting(true)
    setError("")
    try {
      const { errands: extracted, source } = await extractErrands(nlInput)
      const newErrands = extracted.map((e) => toErrand(e as ErrandCreate))
      setErrands((prev) => [...prev, ...newErrands])
      setNlInput("")
      setError(
        source === "ai"
          ? "Errands extracted using AI."
          : "Errands extracted using fallback parser. Review and edit as needed."
      )
    } catch {
      setError("Failed to extract errands. You can add them manually instead.")
    } finally {
      setIsExtracting(false)
    }
  }

  const handleOptimize = async () => {
    if (errands.length === 0) {
      setError("Add at least one errand before optimizing.")
      return
    }
    if (!startLocation || !departureTime || !finalDestination) {
      setError("Please fill in starting location, departure time, and final destination.")
      return
    }
    setIsOptimizing(true)
    setError("")
    try {
      const payload: ItineraryRequest = {
        errands: errands.map(({ id, verified, completion_status, ...rest }) => rest),
        starting_location: startLocation,
        departure_time: departureTime,
        final_destination: finalDestination,
        final_arrival_deadline: deadline || undefined,
        vehicle_mpg: settings.mpg,
        fuel_price: settings.fuel_price,
        transport_mode: settings.transport_mode,
        units: settings.units,
      }
      const result = await planItinerary(payload)
      const backendResult = result.result
      const totalStopDuration = backendResult.stops.reduce(
        (acc, s) => acc + s.estimated_duration_minutes,
        0
      )
      setItinerary({
        status: backendResult.status,
        stops: backendResult.stops.map((s, i) => ({
          ...s,
          id: s.id || `stop-${i + 1}`,
          order: s.order ?? i + 1,
        })),
        total_travel_duration_minutes: backendResult.total_travel_duration_minutes,
        total_stop_duration_minutes: totalStopDuration,
        total_distance_miles: backendResult.total_distance_miles,
        constraint_warnings: backendResult.constraint_warnings,
        solver_used: backendResult.solver_used,
        total_travel_time_minutes: backendResult.total_travel_duration_minutes,
        total_estimated_duration_minutes: totalStopDuration,
        fuel_cost: result.savings.fuel_cost_saved_usd,
        efficiency_score: 85,
        simulated: result.simulated ?? false,
      })
      router.push("/itinerary")
    } catch {
      const sim = simulateOptimization(
        errands,
        departureTime,
        settings.mpg,
        settings.fuel_price
      )
      setItinerary({
        status: "optimal",
        stops: sim.stops.map((s, i) => ({
          ...s,
          id: s.id || `stop-${i + 1}`,
          order: s.order ?? i + 1,
        })),
        total_travel_duration_minutes: sim.total_travel_time_minutes,
        total_stop_duration_minutes: sim.total_estimated_duration_minutes,
        total_distance_miles: sim.total_distance_miles,
        constraint_warnings: sim.constraint_warnings,
        solver_used: "simulated",
        total_travel_time_minutes: sim.total_travel_time_minutes,
        total_estimated_duration_minutes: sim.total_estimated_duration_minutes,
        fuel_cost: sim.fuel_cost,
        efficiency_score: sim.efficiency_score,
        simulated: true,
      })
      router.push("/itinerary")
    } finally {
      setIsOptimizing(false)
    }
  }

  return (
    <div className="min-h-screen bg-offwhite text-navy">
      <nav className="border-b border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-navy">ErrandOS</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => router.push("/")}>
              Home
            </Button>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-navy">Plan Your Day</h1>
            <p className="text-gray-500 text-sm">Enter your errands, then optimize your route.</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-100 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <Card className="mb-6">
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="text-base">Natural Language Input</CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="space-y-3">
              <label className="text-xs font-medium text-gray-500 uppercase block" htmlFor="nl-input">
                Describe your errands
              </label>
              <textarea
                id="nl-input"
                value={nlInput}
                onChange={(e) => setNlInput(e.target.value)}
                placeholder="e.g. I need to pick up groceries at Kroger, return a package at UPS, get gas, and pick up my prescription. I need to be home by 5 PM."
                className="flex h-24 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-navy placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal"
              />
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleExtract}
                  disabled={isExtracting || !nlInput.trim()}
                  size="sm"
                  aria-label="Extract errands from natural language input"
                >
                  {isExtracting ? (
                    <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                  ) : null}
                  Extract Errands
                </Button>
                <span className="text-xs text-gray-400">
                  Or add errands manually below
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Trip details</CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-500 uppercase block" htmlFor="start-location">
                  Starting location
                </label>
                <Input
                  id="start-location"
                  value={startLocation}
                  onChange={(e) => setStartLocation(e.target.value)}
                  placeholder="e.g. Home, Johns Creek, GA"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-500 uppercase block" htmlFor="departure-time">
                  Departure time
                </label>
                <Input
                  id="departure-time"
                  type="time"
                  value={departureTime}
                  onChange={(e) => setDepartureTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-500 uppercase block" htmlFor="final-destination">
                  Final destination
                </label>
                <Input
                  id="final-destination"
                  value={finalDestination}
                  onChange={(e) => setFinalDestination(e.target.value)}
                  placeholder="e.g. Home"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-500 uppercase block" htmlFor="deadline">
                  Deadline
                </label>
                <Input
                  id="deadline"
                  type="time"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="text-base">Errands</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadDemoDay}
                disabled={isOptimizing}
              >
                <Loader2 className="w-3 h-3 mr-1" /> Load Demo Day
              </Button>
              <Button size="sm" disabled={isOptimizing} onClick={handleOptimize}>
                {isOptimizing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Optimizing…
                  </>
                ) : (
                  <>Optimize Route <Target className="w-4 h-4 ml-2" /></>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <ErrandForm onAdd={(create) => addErrand(create as ErrandCreate)} />
            <div className="mt-4 border-t border-gray-100"></div>
            <ErrandList
              errands={errands}
              onUpdate={(updated) => {
                setErrands((prev) =>
                  prev.map((e) => (e.id === updated.id ? { ...e, ...updated } : e))
                )
              }}
              onRemove={removeErrand}
              onEdit={(updated) => {
                setErrands((prev) =>
                  prev.map((e) => (e.id === updated.id ? { ...e, ...updated } : e))
                )
              }}
              onReorder={reorderErrands}
            />
          </CardContent>
        </Card>

        <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
          Tip: Fill in closing times (e.g. pharmacy 4 PM) so the optimizer can warn you about conflicts.
        </div>
      </div>
    </div>
  )
}
