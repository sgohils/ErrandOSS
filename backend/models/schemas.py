import re
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field, field_validator

_TIME_WINDOW_RE = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")


class ErrandCreate(BaseModel):
    name: str
    location_query: Optional[str] = None
    address: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    estimated_duration_minutes: int = Field(gt=0)
    priority: str = "normal"
    earliest_arrival: Optional[str] = None
    latest_arrival: Optional[str] = None
    opening_time: Optional[str] = None
    closing_time: Optional[str] = None
    deadline: Optional[str] = None

    @field_validator("priority")
    @classmethod
    def _validate_priority(cls, value: str) -> str:
        if value not in ("low", "normal", "high"):
            raise ValueError("priority must be one of: low, normal, high")
        return value

    @field_validator("opening_time", "closing_time")
    @classmethod
    def _validate_time_window(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        if not _TIME_WINDOW_RE.match(value):
            raise ValueError("time fields must be HH:MM")
        return value

    @field_validator("earliest_arrival", "latest_arrival", "deadline")
    @classmethod
    def _validate_iso_datetime(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        datetime.fromisoformat(value)
        return value


class Errand(ErrandCreate):
    id: str
    verified: bool = False
    completion_status: str = "pending"


class ItineraryStop(BaseModel):
    stop_index: int
    errand_id: str
    name: str
    address: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    estimated_arrival: str
    estimated_departure: str
    travel_time_minutes: Optional[float] = None
    travel_distance_miles: Optional[float] = None
    stop_duration_minutes: int
    constraint_warning: Optional[str] = None


class OptimizationResult(BaseModel):
    status: str
    total_travel_duration_minutes: float
    total_stop_duration_minutes: int
    total_distance_miles: float
    stops: List[ItineraryStop]
    constraint_warnings: List[str]
    solver_used: str


class SavingsResult(BaseModel):
    baseline_travel_minutes: float = Field(ge=0)
    optimized_travel_minutes: float = Field(ge=0)
    time_saved_minutes: float = Field(ge=0)
    baseline_distance_miles: float = Field(ge=0)
    optimized_distance_miles: float = Field(ge=0)
    distance_saved_miles: float = Field(ge=0)
    fuel_saved_gallons: float = Field(ge=0)
    fuel_cost_saved_usd: float = Field(ge=0)
    assumptions: dict


class ErrandExtractRequest(BaseModel):
    text: str


class ErrandExtractResponse(BaseModel):
    errands: List[ErrandCreate]
    source: str


class ItineraryRequest(BaseModel):
    errands: List[ErrandCreate]
    starting_location: Optional[str] = None
    starting_lat: Optional[float] = None
    starting_lng: Optional[float] = None
    final_destination: Optional[str] = None
    final_lat: Optional[float] = None
    final_lng: Optional[float] = None
    departure_time: str
    final_arrival_deadline: Optional[str] = None
    vehicle_mpg: Optional[float] = None
    fuel_price: Optional[float] = None

    @field_validator("departure_time")
    @classmethod
    def _validate_departure_time(cls, value: str) -> str:
        datetime.fromisoformat(value)
        return value

    @field_validator("final_arrival_deadline")
    @classmethod
    def _validate_final_arrival_deadline(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        datetime.fromisoformat(value)
        return value


class GeocodeResult(BaseModel):
    address: str
    lat: float
    lng: float
    verified: bool


class GeocodeResponse(BaseModel):
    results: List[GeocodeResult]


class HealthResponse(BaseModel):
    status: str
