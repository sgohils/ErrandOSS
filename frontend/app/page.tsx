"use client"

import { useRouter } from "next/navigation"
import { Welcome } from "@/components/dashboard/welcome"

export default function LandingPage() {
  const router = useRouter()
  return (
    <div className="min-h-screen bg-offwhite text-navy">
      <Welcome onPlanMyDay={() => router.push("/planner")} />
    </div>
  )
}
