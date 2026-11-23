import axios from "axios"
import type {
  ItineraryRequest,
  OptimizationResult,
  ErrandCreate,
} from "@/lib/types"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export const api = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("API error:", error.response?.data || error.message)
    return Promise.reject(error)
  }
)

export interface PlanResponse {
  result: {
    status: string
    stops: OptimizationResult["stops"]
    total_travel_duration_minutes: number
    total_stop_duration_minutes: number
    total_distance_miles: number
    constraint_warnings: string[]
    solver_used: string
  }
  baseline: {
    status: string
    stops: OptimizationResult["stops"]
    total_travel_duration_minutes: number
    total_stop_duration_minutes: number
    total_distance_miles: number
    constraint_warnings: string[]
    solver_used: string
  }
  savings: {
    baseline_travel_minutes: number
    optimized_travel_minutes: number
    time_saved_minutes: number
    baseline_distance_miles: number
    optimized_distance_miles: number
    distance_saved_miles: number
    fuel_saved_gallons: number
    fuel_cost_saved_usd: number
    assumptions: Record<string, unknown>
  }
  simulated?: boolean
}

export async function planItinerary(
  payload: ItineraryRequest
): Promise<PlanResponse> {
  const { data } = await api.post<PlanResponse>("/api/optimize", payload)
  return data
}

export async function extractErrands(text: string): Promise<{
  errands: ErrandCreate[]
  source: string
}> {
  const { data } = await api.post<{ errands: ErrandCreate[]; source: string }>(
    "/api/errands/extract",
    { text }
  )
  return data
}

export async function getErrandSuggestions(query: string): Promise<string[]> {
  const { data } = await api.get("/api/geocode", {
    params: { q: query },
  })
  return (data.results || []).map((r: { address: string }) => r.address)
}

export async function healthCheck(): Promise<{ status: string }> {
  const { data } = await api.get<{ status: string }>("/api/health")
  return data
}

export default api
