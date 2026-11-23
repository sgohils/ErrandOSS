"use client"

import { useCallback, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/dialog"
import { useItinerary } from "@/components/itinerary-context"

export default function SettingsPage() {
  const router = useRouter()
  const { settings, updateSettings } = useItinerary()
  const [saved, setSaved] = useState(false)

  const [form, setForm] = useState({
    mpg: String(settings.mpg),
    fuel_price: String(settings.fuel_price),
    transport_mode: settings.transport_mode,
    default_start_location: settings.default_start_location,
    units: settings.units,
    time_format: settings.time_format,
  })

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    updateSettings({
      mpg: Number(form.mpg) || settings.mpg,
      fuel_price: Number(form.fuel_price) || settings.fuel_price,
      transport_mode: form.transport_mode,
      default_start_location: form.default_start_location,
      units: form.units,
      time_format: form.time_format,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="min-h-screen bg-offwhite text-navy">
      <nav className="border-b border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={() => router.push("/")}>
            <ArrowLeft className="w-3 h-3 mr-1" /> Back to home
          </Button>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-navy mb-2">Settings</h1>
        <p className="text-gray-500 text-sm mb-8">
          Vehicle and preference defaults used across ErrandOS.
        </p>

        {saved && (
          <div className="mb-4 rounded-lg bg-teal/5 border border-teal-100 p-3 text-sm text-teal-700">
            Settings saved.
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Preferences</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-6">
              <div className="space-y-2">
                <Label>Default MPG</Label>
                <Input
                  type="number"
                  value={form.mpg}
                  onChange={(e) => setForm({ ...form, mpg: e.target.value })}
                  placeholder="25"
                />
                <p className="text-xs text-gray-400">Miles per gallon (fuel estimates)</p>
              </div>
              <div className="space-y-2">
                <Label>Fuel price ($/gallon)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.fuel_price}
                  onChange={(e) => setForm({ ...form, fuel_price: e.target.value })}
                  placeholder="3.50"
                />
              </div>
              <div className="space-y-2">
                <Label>Transport mode</Label>
                <select
                  value={form.transport_mode}
                  onChange={(e) =>
                    setForm({ ...form, transport_mode: e.target.value as any })
                  }
                  className="border border-gray-200 rounded-md bg-white px-3 py-2 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-teal"
                >
                  <option value="driving">Driving</option>
                  <option value="walking">Walking</option>
                  <option value="transit">Transit</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Default starting location</Label>
                <Input
                  value={form.default_start_location}
                  onChange={(e) =>
                    setForm({ ...form, default_start_location: e.target.value })
                  }
                  placeholder="e.g. Home, Johns Creek, GA"
                />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Units</Label>
                  <select
                    value={form.units}
                    onChange={(e) => setForm({ ...form, units: e.target.value as any })}
                    className="border border-gray-200 rounded-md bg-white px-3 py-2 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-teal"
                  >
                    <option value="us">US (miles)</option>
                    <option value="metric">Metric (km)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Time format</Label>
                  <select
                    value={form.time_format}
                    onChange={(e) => setForm({ ...form, time_format: e.target.value as any })}
                    className="border border-gray-200 rounded-md bg-white px-3 py-2 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-teal"
                  >
                    <option value="12">12-hour</option>
                    <option value="24">24-hour</option>
                  </select>
                </div>
              </div>
              <Button type="submit" className="w-auto">
                Save settings
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
