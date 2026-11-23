import type { ErrandCreate, ItineraryStop } from "@/lib/types"
import { calculateFuel, formatMoney, minutesToHHMM } from "@/lib/calculations"

export const DEMO_START_LOCATION = "Home, Johns Creek, GA"
export const DEMO_DEPARTURE_TIME = "12:30"
export const DEMO_FINAL_DESTINATION = "Home, Johns Creek, GA"
export const DEMO_DEADLINE = "17:00"

export const DEMO_ERRANDS: ErrandCreate[] = [
  {
    name: "Kroger Groceries",
    location_query: "Kroger, Johns Creek, GA",
    estimated_duration_minutes: 30,
    priority: "normal",
  },
  {
    name: "UPS Store",
    location_query: "UPS Store, Johns Creek, GA",
    estimated_duration_minutes: 15,
    priority: "normal",
  },
  {
    name: "Gas Station",
    location_query: "Gas station, Johns Creek, GA",
    estimated_duration_minutes: 10,
    priority: "low",
  },
  {
    name: "Pharmacy",
    location_query: "CVS Pharmacy, Johns Creek, GA",
    estimated_duration_minutes: 20,
    priority: "high",
    closing_time: "16:00",
  },
  {
    name: "Dry Cleaner",
    location_query: "Dry cleaner, Johns Creek, GA",
    estimated_duration_minutes: 10,
    priority: "low",
  },
  {
    name: "Coffee Shop",
    location_query: "Coffee shop, Johns Creek, GA",
    estimated_duration_minutes: 15,
    priority: "low",
  },
]

const DEMO_COORDS: Record<string, { lat: number; lng: number }> = {
  "Home, Johns Creek, GA": { lat: 34.0331, lng: -84.1862 },
  "Kroger, Johns Creek, GA": { lat: 34.0287, lng: -84.1831 },
  "UPS Store, Johns Creek, GA": { lat: 34.0301, lng: -84.1799 },
  "Gas station, Johns Creek, GA": { lat: 34.0321, lng: -84.1810 },
  "CVS Pharmacy, Johns Creek, GA": { lat: 34.0291, lng: -84.1771 },
  "Dry cleaner, Johns Creek, GA": { lat: 34.0311, lng: -84.1760 },
  "Coffee shop, Johns Creek, GA": { lat: 34.0305, lng: -84.1785 },
}

function coordFor(query: string) {
  return DEMO_COORDS[query] || { lat: 34.03, lng: -84.18 }
}

export function simulateOptimization(
  errands: ErrandCreate[],
  departureTime: string,
  mpg = 25,
  fuelPrice = 3.5
): {
  stops: ItineraryStop[]
  total_distance_miles: number
  total_travel_time_minutes: number
  total_estimated_duration_minutes: number
  fuel_cost: number
  efficiency_score: number
  constraint_warnings: string[]
  simulated: boolean
} {
  const ordered = [...errands].sort((a, b) => {
    const pa = { low: 0, normal: 1, high: 2 }[a.priority] ?? 1
    const pb = { low: 0, normal: 1, high: 2 }[b.priority] ?? 1
    return pb - pa
  })

  let currentTime = departureTime
  const stops: ItineraryStop[] = []
  let totalDistance = 0
  let totalTravel = 0
  let totalDuration = 0
  const warnings: string[] = []
  let prev = coordFor("Home, Johns Creek, GA")

  ordered.forEach((e, i) => {
    const c = coordFor(e.location_query || e.name)
    const dist = Math.round(
      haversine(prev.lat, prev.lng, c.lat, c.lng) * 10
    ) / 10
    const travel = Math.max(5, Math.round(dist * 4))
    const arrival = currentTime
    const departure = addMinutesToTime(arrival, e.estimated_duration_minutes)
    totalDistance += dist
    totalTravel += travel
    totalDuration += e.estimated_duration_minutes

    if (e.closing_time) {
      const closeMins = timeToMinutes(e.closing_time)
      const depMins = timeToMinutes(departure)
      if (depMins > closeMins) {
        warnings.push(`${e.name} closes at ${e.closing_time} — you may arrive late`)
      }
    }

    stops.push({
      id: `stop-${i + 1}`,
      name: e.name,
      address: e.location_query,
      lat: c.lat,
      lng: c.lng,
      arrival_time: arrival,
      departure_time: departure,
      travel_duration_minutes: travel,
      estimated_duration_minutes: e.estimated_duration_minutes,
      order: i + 1,
      constraint_warning: warnings[warnings.length - 1],
    })

    currentTime = departure
    prev = c
  })

  const fuel = calculateFuel(totalDistance, mpg, fuelPrice)
  const baselineTime = totalTravel + totalDuration
  const optimizedTime = baselineTime
  const savings = {
    baseline_cost: fuel.cost * 1.4,
    optimized_cost: fuel.cost,
    savings_amount: fuel.cost * 0.4,
    savings_percent: 40,
    baseline_time_minutes: baselineTime + 20,
    optimized_time_minutes: optimizedTime,
    time_saved_minutes: 20,
  }

  return {
    stops,
    total_distance_miles: Math.round(totalDistance * 10) / 10,
    total_travel_time_minutes: totalTravel,
    total_estimated_duration_minutes: totalDuration,
    fuel_cost: Math.round(fuel.cost * 100) / 100,
    efficiency_score: 88,
    constraint_warnings: warnings,
    simulated: true,
  }
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 3958.8
  const toRad = (x: number) => (x * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function timeToMinutes(timeStr: string) {
  const [h, m] = timeStr.split(":").map(Number)
  return (h || 0) * 60 + (m || 0)
}

function addMinutesToTime(timeStr: string, minutes: number): string {
  const [h, m] = timeStr.split(":").map(Number)
  const total = (h || 0) * 60 + (m || 0) + minutes
  const hh = Math.floor((total / 60) % 24)
  const mm = Math.round(total % 60)
  return `${hh.toString().padStart(2, "0")}:${mm.toString().padStart(2, "0")}`
}

export function formatFuelCost(cost: number): string {
  return formatMoney(cost)
}

export default DEMO_ERRANDS
