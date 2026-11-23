"use client"

import { ArrowRight, Sparkles, Clock, MapPin } from "lucide-react"
import { Link } from "@/components/ui/link"
import { Button } from "@/components/ui/button"

interface ValueProp {
  icon: React.ReactNode
  title: string
  description: string
}

const VALUE_PROPS: ValueProp[] = [
  {
    icon: (
      <>
        <span className="sr-only">AI-powered extraction</span>
        <Sparkles className="w-6 h-6 text-teal" aria-hidden="true" />
      </>
    ),
    title: "AI-powered extraction",
    description: "Turn plain-language errand lists into structured tasks with locations and durations.",
  },
  {
    icon: (
      <>
        <span className="sr-only">Constraint-aware routing</span>
        <MapPin className="w-6 h-6 text-teal" aria-hidden="true" />
      </>
    ),
    title: "Constraint-aware routing",
    description: "Optimizes stops around closing times, deadlines, and your departure window.",
  },
  {
    icon: (
      <>
        <span className="sr-only">Fuel and time savings</span>
        <Clock className="w-6 h-6 text-teal" aria-hidden="true" />
      </>
    ),
    title: "Fuel & time savings",
    description: "See the most efficient route with estimated fuel cost and time saved versus a naive order.",
  },
]

export function ValueProps() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto" role="region" aria-label="Value propositions">
      {VALUE_PROPS.map((prop, i) => (
        <div
          key={i}
          className="group relative rounded-2xl border border-gray-100 bg-white p-8 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1 hover:border-teal/30"
        >
          <div className="w-12 h-12 rounded-xl bg-teal/10 flex items-center justify-center mb-6 group-hover:bg-teal group-hover:text-white transition-colors">
            <span className="text-teal group-hover:text-white">{prop.icon}</span>
          </div>
          <h3 className="text-lg font-semibold text-navy mb-3">{prop.title}</h3>
          <p className="text-sm text-gray-500 leading-relaxed">
            {prop.description}
          </p>
        </div>
      ))}
    </div>
  )
}

interface WelcomeProps {
  onPlanMyDay: () => void
}

export function Welcome({ onPlanMyDay }: WelcomeProps) {
  return (
    <div className="text-center" role="region" aria-label="Hero section">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal/5 text-teal text-sm font-medium mb-8">
        AI-powered errand optimization
      </div>
      <h1 className="text-5xl md:text-7xl font-bold text-navy tracking-tight mb-8 text-balance">
        Your day.<br />
        <span className="relative inline-block bg-gradient-to-r from-teal to-[#1aa89a] bg-clip-text text-transparent">
          Optimized.
        </span>
      </h1>
      <div className="inline-flex items-center justify-center gap-2 mt-6">
        <div className="w-10 h-10 rounded-full bg-offwhite border border-gray-200 shadow-sm flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#142637" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="block">
            <path d="M2 12s3-8 10-8 10 8 10 8" />
            <path d="M2 12c0 1.5 1 3 3 3s3 1.5 3 3" />
            <circle cx="6" cy="16" r="2" fill="#142637" />
            <circle cx="16" cy="16" r="2" fill="#142637" />
            <path d="M6 10q0-.5 1-.5t1 .5" stroke="none" fill="#142637" />
            <path d="M11 10q0-.5 1-.5t1 .5" stroke="none" fill="#142637" />
          </svg>
        </div>
        <span className="text-xs text-navy/60 font-medium mt-0.5">capybara approved</span>
      </div>
      <div className="w-full max-w-3xl mx-auto">
        <div className="h-px bg-gray-200 mx-auto mb-10" />
      </div>
      <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-12 leading-relaxed">
        Transform an unorganized errand list into an optimized, constraint-aware itinerary — with an interactive map,
        schedule, and fuel savings.
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4" role="group" aria-label="Primary actions">
        <Button size="lg" className="bg-gradient-to-r from-navy to-[#0e1d2c] hover:from-[#0e1d2c] hover:to-[#1a2b3c] shadow-lg shadow-[0_0_20px_rgba(20,38,55,0.15)]" onClick={onPlanMyDay} aria-label="Plan my day">
          Plan my day <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
        <Link href="/planner" size="lg" variant="outline" aria-label="See how it works">
          See how it works
        </Link>
      </div>
      <div className="mt-16">
        <ValueProps />
      </div>
    </div>
  )
}
