"use client"

import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { z } from "zod"
import { cn } from "@/lib/utils"
import type { ErrandCreate } from "@/lib/types"

const ErrandsSchema = z.object({
  name: z.string().min(1, "Name required"),
  location_query: z.string().optional(),
  estimated_duration_minutes: z.coerce.number().min(1).max(480),
  priority: z.enum(["low", "normal", "high"]),
  closing_time: z.string().optional(),
})

interface ErrandFormProps {
  onAdd: (errand: ErrandCreate) => void
}

export function ErrandForm({ onAdd }: ErrandFormProps) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    name: "",
    location_query: "",
    estimated_duration_minutes: "30",
    priority: "normal" as const,
    closing_time: "",
  })
  const [error, setError] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    const parsed = ErrandsSchema.safeParse({
      ...form,
      estimated_duration_minutes: Number(form.estimated_duration_minutes),
    })
    if (!parsed.success) {
      setError(parsed.error.errors[0]?.message || "Invalid input")
      return
    }
    const data: ErrandCreate = {
      name: parsed.data.name,
      location_query: parsed.data.location_query || undefined,
      estimated_duration_minutes: parsed.data.estimated_duration_minutes,
      priority: parsed.data.priority as "low" | "normal" | "high",
      closing_time: parsed.data.closing_time || undefined,
    }
    onAdd(data)
    setForm({
      name: "",
      location_query: "",
      estimated_duration_minutes: "30",
      priority: "normal",
      closing_time: "",
    })
    setOpen(false)
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)} className="w-full">
        <Plus className="w-4 h-4 mr-2" /> Add Errand
      </Button>
      <div
        className={cn(
          "fixed inset-0 z-50",
          open ? "flex items-center justify-center" : "hidden"
        )}
      >
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
        <Card className="w-full max-w-md mx-4 transform transition-all duration-300">
          <CardHeader>
            <CardTitle>Add Errand</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Kroger Groceries"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input
                  value={form.location_query}
                  onChange={(e) =>
                    setForm({ ...form, location_query: e.target.value })
                  }
                  placeholder="e.g. Kroger, Johns Creek, GA"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Duration (min)</Label>
                  <Input
                    type="number"
                    value={form.estimated_duration_minutes}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        estimated_duration_minutes: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <select
                    value={form.priority}
                    onChange={(e) =>
                      setForm({ ...form, priority: e.target.value as any })
                    }
                    className="border border-gray-200 rounded-md bg-white px-3 py-2 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-teal"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Closes at</Label>
                  <Input
                    type="time"
                    value={form.closing_time}
                    onChange={(e) => setForm({ ...form, closing_time: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Add</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  )
}

import { useState } from "react"
