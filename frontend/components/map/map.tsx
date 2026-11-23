"use client"

import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import L from "leaflet"
import { useEffect, useMemo } from "react"
import { cn } from "@/lib/utils"
import type { ItineraryStop } from "@/lib/types"

const markerIcon = (number: number, active = false) =>
  L.divIcon({
    className: "errand-marker",
    html: `
      <div style="
        width:28px;height:28px;border-radius:50%;
        background:${active ? "#28C6B7" : "#142637"};
        color:#fff;display:flex;align-items:center;justify-content:center;
        font-weight:700;font-size:12px;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.25);
      ">
        ${number}
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  })

interface NumberedMarkerProps {
  stop: ItineraryStop
  active: boolean
  onSelect: (id: string) => void
}

function NumberedMarker({ stop, active, onSelect }: NumberedMarkerProps) {
  return (
    <Marker
      position={[stop.lat!, stop.lng!]}
      icon={markerIcon(stop.order, active)}
      eventHandlers={{
        click: () => onSelect(stop.id),
      }}
    >
      <Popup>
        <div className="text-sm font-medium text-navy">{stop.name}</div>
        <div className="text-xs text-gray-500">
          {stop.arrival_time} → {stop.departure_time}
        </div>
      </Popup>
    </Marker>
  )
}

interface MapProps {
  stops: ItineraryStop[]
  selectedStopId: string | null
  onStopSelect: (id: string) => void
  center?: [number, number]
  zoom?: number
  className?: string
}

function FitBounds({ bounds }: { bounds: [number, number][] | null }) {
  const map = useMap()

  useEffect(() => {
    if (map && bounds) {
      map.fitBounds(bounds, { padding: [40, 40] })
    }
  }, [map, bounds])

  return null
}

export function MapView({
  stops,
  selectedStopId,
  onStopSelect,
  center = [34.0331, -84.1862],
  zoom = 13,
  className,
}: MapProps) {
  const bounds = useMemo(() => {
    if (!stops.length) return null
    const lats = stops.map((s) => s.lat!).filter(Boolean)
    const lngs = stops.map((s) => s.lng!).filter(Boolean)
    if (!lats.length) return null
    return [
      [Math.min(...lats), Math.min(...lngs)],
      [Math.max(...lats), Math.max(...lngs)],
    ]
  }, [stops])

  return (
    <div className={cn("w-full h-[500px] rounded-xl border border-gray-200 overflow-hidden", className)}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />
        <FitBounds bounds={bounds as [number, number][] | null} />
        {stops.map((stop) => (
          <NumberedMarker
            key={stop.id}
            stop={stop}
            active={stop.id === selectedStopId}
            onSelect={onStopSelect}
          />
        ))}
      </MapContainer>
    </div>
  )
}
