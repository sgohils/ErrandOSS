# ErrandOS Interface Specification (SPEC.md)

## Version
1.0.0

## Base URL
Backend: `http://localhost:8000`
Frontend: `http://localhost:3000`

## API Routes

### POST /api/errands/extract
Extract structured errands from natural language text.

**Request:**
```json
{
  "text": "string (required)"
}
```

**Response:**
```json
{
  "errands": [
    {
      "name": "string",
      "location_query": "string | null",
      "address": "string | null",
      "lat": "number | null",
      "lng": "number | null",
      "estimated_duration_minutes": "number (1-480)",
      "priority": "low | normal | high",
      "opening_time": "HH:MM | null",
      "closing_time": "HH:MM | null",
      "deadline": "string | null",
      "earliest_arrival": "string | null",
      "latest_arrival": "string | null"
    }
  ],
  "source": "ai | fallback | manual"
}
```

### POST /api/optimize
Generate optimized itinerary with baseline comparison and savings.

**Request:**
```json
{
  "errands": [
    {
      "name": "string",
      "location_query": "string | null",
      "address": "string | null",
      "lat": "number | null",
      "lng": "number | null",
      "estimated_duration_minutes": "number",
      "priority": "low | normal | high",
      "opening_time": "HH:MM | null",
      "closing_time": "HH:MM | null",
      "deadline": "string | null"
    }
  ],
  "departure_time": "ISO datetime string (required)",
  "starting_lat": "number | null",
  "starting_lng": "number | null",
  "final_lat": "number | null",
  "final_lng": "number | null",
  "final_destination": "string | null",
  "final_arrival_deadline": "ISO datetime string | null",
  "vehicle_mpg": "number | null",
  "fuel_price": "number | null"
}
```

**Response:**
```json
{
  "result": {
    "status": "optimal | feasible | infeasible",
    "total_travel_duration_minutes": "number",
    "total_stop_duration_minutes": "number",
    "total_distance_miles": "number",
    "stops": [
      {
        "stop_index": "number",
        "errand_id": "string",
        "name": "string",
        "address": "string | null",
        "lat": "number | null",
        "lng": "number | null",
        "estimated_arrival": "ISO datetime string",
        "estimated_departure": "ISO datetime string",
        "travel_time_minutes": "number | null",
        "travel_distance_miles": "number | null",
        "stop_duration_minutes": "number",
        "constraint_warning": "string | null"
      }
    ],
    "constraint_warnings": ["string"],
    "solver_used": "exhaustive | heuristic | ortools | baseline"
  },
  "baseline": { "same shape as result" },
  "savings": {
    "baseline_travel_minutes": "number",
    "optimized_travel_minutes": "number",
    "time_saved_minutes": "number",
    "baseline_distance_miles": "number",
    "optimized_distance_miles": "number",
    "distance_saved_miles": "number",
    "fuel_saved_gallons": "number",
    "fuel_cost_saved_usd": "number",
    "assumptions": {
      "vehicle_mpg": "number",
      "fuel_price_per_gallon": "number",
      "fuel_formula": "string",
      "cost_formula": "string",
      "note": "string"
    }
  },
  "simulated": "boolean"
}
```

### GET /api/geocode
Geocode a location query to coordinates.

**Query:** `q` (string, required)

**Response:**
```json
{
  "results": [
    {
      "address": "string",
      "lat": "number",
      "lng": "number",
      "verified": "boolean"
    }
  ]
}
```

### GET /api/health
Health check.

**Response:**
```json
{
  "status": "ok"
}
```

## Frontend Types

See `frontend/lib/types.ts` for TypeScript interfaces. These must remain compatible with the API contracts above.

## Data Models

- **User**: id, preferences, settings
- **Errand**: id, name, location_query, address, lat, lng, estimated_duration_minutes, priority, opening_time, closing_time, deadline, verified, completion_status
- **Location**: id, name, address, lat, lng, verified
- **Itinerary**: id, errands[], starting_location, departure_time, final_destination, deadline, stops[], total_travel_duration_minutes, total_distance_miles, created_at
- **ItineraryStop**: id, itinerary_id, errand_id, name, address, lat, lng, stop_index, estimated_arrival, estimated_departure, travel_duration_minutes, stop_duration_minutes, constraint_warning
- **OptimizationResult**: status, stops, total_travel_duration_minutes, total_stop_duration_minutes, total_distance_miles, constraint_warnings, solver_used
- **VehicleSettings**: mpg, fuel_price, transport_mode, units, time_format

## Environment Variables

- `AI_API_KEY` — optional AI provider key
- `AI_BASE_URL` — optional AI provider base URL
- `AI_MODEL` — optional AI model name
- `GEOCODING_API_KEY` — optional geocoding provider key
- `OSRM_BASE_URL` — OSRM routing service URL (default: http://router.project-osrm.org)
- `MAPBOX_ACCESS_TOKEN` — optional Mapbox token
- `DEFAULT_MPG` — default vehicle MPG (default: 25)
- `DEFAULT_FUEL_PRICE` — default fuel price per gallon (default: 3.50)
