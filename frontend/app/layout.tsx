import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { ItineraryProvider } from "@/components/itinerary-context"
import "./globals.css"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

export const metadata: Metadata = {
  title: "ErrandOS — Your day. Optimized.",
  description: "Transform unorganized errand lists into optimized itineraries.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full">
      <body className={inter.className}>
        <ItineraryProvider>{children}</ItineraryProvider>
      </body>
    </html>
  )
}
