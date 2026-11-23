"use client"

import React, { createContext, useContext, useState, useCallback } from "react"
import type { OptimizationResult, Settings } from "@/lib/types"
import { DEFAULT_SETTINGS } from "@/lib/types"

interface ItineraryContextType {
  itinerary: OptimizationResult | null
  setItinerary: (itinerary: OptimizationResult | null) => void
  settings: Settings
  updateSettings: (settings: Partial<Settings>) => void
}

const ItineraryContext = createContext<ItineraryContextType | undefined>(
  undefined
)

export function ItineraryProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [itinerary, setItinerary] = useState<OptimizationResult | null>(null)
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)

  const updateSettings = useCallback((next: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...next }))
  }, [])

  return (
    <ItineraryContext.Provider
      value={{ itinerary, setItinerary, settings, updateSettings }}
    >
      {children}
    </ItineraryContext.Provider>
  )
}

export function useItinerary() {
  const ctx = useContext(ItineraryContext)
  if (!ctx) throw new Error("useItinerary must be used within ItineraryProvider")
  return ctx
}
