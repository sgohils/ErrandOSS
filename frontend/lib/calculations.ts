import { format, parseISO, differenceInMinutes, isValid } from "date-fns"

export interface FuelCalculation {
  distanceMiles: number
  mpg: number
  fuelPrice: number
  gallonsUsed: number
  cost: number
}

export function calculateFuel(
  distanceMiles: number,
  mpg: number,
  fuelPrice: number
): FuelCalculation {
  const gallonsUsed = distanceMiles / mpg
  const cost = gallonsUsed * fuelPrice
  return { distanceMiles, mpg, fuelPrice, gallonsUsed, cost }
}

export function formatTimeHHMM(timeStr: string, format24 = false): string {
  if (!timeStr) return ""
  try {
    const d = new Date(timeStr)
    if (!isValid(d)) return timeStr
    return format(d, format24 ? "HH:mm" : "h:mm a")
  } catch {
    return timeStr
  }
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)} min`
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`
}

export function formatMoney(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount)
}

export function isTimePast(timeStr: string): boolean {
  if (!timeStr) return false
  try {
    const d = new Date(timeStr)
    return isValid(d) && d < new Date()
  } catch {
    return false
  }
}

export function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(":").map(Number)
  return (h || 0) * 60 + (m || 0)
}

export function minutesToHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`
}

export function addMinutesToTime(timeStr: string, minutes: number): string {
  const [h, m] = timeStr.split(":").map(Number)
  const total = (h || 0) * 60 + (m || 0) + minutes
  const hh = Math.floor((total / 60) % 24)
  const mm = Math.round(total % 60)
  return `${hh.toString().padStart(2, "0")}:${mm.toString().padStart(2, "0")}`
}

export function haversineDistanceMiles(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
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
