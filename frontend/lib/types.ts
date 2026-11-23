import { z } from "zod"

export const ErrandCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  location_query: z.string().optional(),
  address: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  estimated_duration_minutes: z
    .number()
    .min(1, "Duration must be at least 1 minute")
    .max(480, "Duration cannot exceed 8 hours"),
  priority: z.enum(["low", "normal", "high"]).default("normal"),
  earliest_arrival: z.string().optional(),
  latest_arrival: z.string().optional(),
  opening_time: z.string().optional(),
  closing_time: z.string().optional(),
  deadline: z.string().optional(),
})

export type ErrandCreate = z.infer<typeof ErrandCreateSchema>

export const ErrandSchema = ErrandCreateSchema.extend({
  id: z.string(),
  verified: z.boolean().default(false),
  completion_status: z.enum(["pending", "completed"]).default("pending"),
})

export type Errand = z.infer<typeof ErrandSchema>

export interface ItineraryRequest {
  errands: ErrandCreate[]
  starting_location?: string
  starting_lat?: number
  starting_lng?: number
  final_destination?: string
  final_lat?: number
  final_lng?: number
  departure_time: string
  final_arrival_deadline?: string
  vehicle_mpg?: number
  fuel_price?: number
  transport_mode?: "driving" | "walking" | "transit"
  units?: "us" | "metric"
}

export interface ItineraryStop {
  id: string
  name: string
  address?: string
  lat?: number
  lng?: number
  arrival_time: string
  departure_time: string
  travel_duration_minutes: number
  estimated_duration_minutes: number
  order: number
  constraint_warning?: string
}

export interface OptimizationResult {
  status: string
  stops: ItineraryStop[]
  total_travel_duration_minutes: number
  total_stop_duration_minutes: number
  total_distance_miles: number
  constraint_warnings: string[]
  solver_used: string
  // Frontend-computed / display fields
  total_travel_time_minutes?: number
  total_estimated_duration_minutes?: number
  fuel_cost?: number
  efficiency_score?: number
  savings?: SavingsResult
  simulated?: boolean
}

export interface PlanResponse {
  result: OptimizationResult
  baseline: OptimizationResult
  savings: SavingsResult
  simulated?: boolean
}

export interface SavingsResult {
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

export interface Settings {
  mpg: number
  fuel_price: number
  transport_mode: "driving" | "walking" | "transit"
  default_start_location: string
  units: "us" | "metric"
  time_format: "12" | "24"
}

export const DEFAULT_SETTINGS: Settings = {
  mpg: 25,
  fuel_price: 3.5,
  transport_mode: "driving",
  default_start_location: "",
  units: "us",
  time_format: "12",
}
