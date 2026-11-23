import re
from typing import List, Optional
from datetime import datetime
import httpx

from services.config import settings
from models.schemas import ErrandCreate

DEFAULT_DURATION_MINUTES = 30
MAX_EXTRACTED_ERRANDS = 12

_TIME_RE = re.compile(r"(\d{1,2}):(\d{2})\s*(am|pm)?", re.IGNORECASE)
_DURATION_RE = re.compile(r"(\d+)\s*(min|minute|minutes|hr|hour|hours)", re.IGNORECASE)

_PRIORITY_HIGH_KEYWORDS = ["urgent", "asap", "immediately", "critical", "high priority"]
_PRIORITY_LOW_KEYWORDS = ["whenever", "eventually", "someday", "low priority"]


def _to_iso(date_ref: datetime, hhmm: str) -> str:
    hour, minute = (int(part) for part in hhmm.split(":"))
    return date_ref.replace(hour=hour, minute=minute, second=0, microsecond=0).isoformat()


def _extract_time(text: str) -> Optional[str]:
    match = _TIME_RE.search(text)
    if not match:
        return None
    hour = int(match.group(1))
    minute = int(match.group(2))
    meridian = match.group(3)
    if meridian:
        meridian = meridian.lower()
        if meridian == "pm" and hour != 12:
            hour += 12
        if meridian == "am" and hour == 12:
            hour = 0
    return f"{hour:02d}:{minute:02d}"


def _extract_duration(text: str) -> int:
    match = _DURATION_RE.search(text)
    if match:
        value = int(match.group(1))
        unit = match.group(2).lower()
        if unit.startswith("hr"):
            return value * 60
        return value
    return DEFAULT_DURATION_MINUTES


def _extract_priority(text: str) -> str:
    lowered = text.lower()
    for keyword in _PRIORITY_HIGH_KEYWORDS:
        if keyword in lowered:
            return "high"
    for keyword in _PRIORITY_LOW_KEYWORDS:
        if keyword in lowered:
            return "low"
    return "normal"


def _clean_name(text: str) -> str:
    cleaned = _TIME_RE.sub("", text)
    cleaned = _DURATION_RE.sub("", cleaned)
    cleaned = re.sub(r"\b(by|at|around|approximately|for)\b", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s+", " ", cleaned).strip(" -.,")
    return cleaned or text.split(",")[0].strip()


def _split_segments(text: str) -> List[str]:
    segments: List[str] = []
    for part in re.split(r"[\n\r]+", text):
        for sentence in re.split(r"(?<=[.!?])\s+", part):
            sentence = sentence.strip()
            if sentence:
                segments.append(sentence)
    return segments


class AIParserProvider:
    async def extract(self, text: str) -> Optional[List[ErrandCreate]]:
        raise NotImplementedError


class AnakinAIProvider(AIParserProvider):
    async def extract(self, text: str) -> Optional[List[ErrandCreate]]:
        if not settings.AI_API_KEY or not settings.AI_BASE_URL:
            return None
        payload = {"text": text, "model": settings.AI_MODEL}
        headers = {
            "Authorization": f"Bearer {settings.AI_API_KEY}",
            "Content-Type": "application/json",
        }
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(settings.AI_BASE_URL, json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()
        raw_errands = data.get("errands") or data.get("items") or []
        errands: List[ErrandCreate] = []
        for item in raw_errands[:MAX_EXTRACTED_ERRANDS]:
            errands.append(ErrandCreate(**item))
        return errands


class FallbackParser(AIParserProvider):
    def extract(self, text: str) -> List[ErrandCreate]:
        segments = _split_segments(text)[:MAX_EXTRACTED_ERRANDS]
        errands: List[ErrandCreate] = []
        now = datetime.now()
        for segment in segments:
            name = _clean_name(segment)
            if len(name) < 2:
                continue
            time_of_day = _extract_time(segment)
            duration = _extract_duration(segment)
            priority = _extract_priority(segment)
            fields: dict = {
                "name": name,
                "location_query": name,
                "estimated_duration_minutes": duration,
                "priority": priority,
            }
            if time_of_day:
                fields["latest_arrival"] = _to_iso(now, time_of_day)
            errands.append(ErrandCreate(**fields))
        if not errands and text.strip():
            errands.append(
                ErrandCreate(
                    name=text.strip()[:100],
                    location_query=text.strip(),
                    estimated_duration_minutes=DEFAULT_DURATION_MINUTES,
                    priority="normal",
                )
            )
        return errands


class AIParser:
    def __init__(self) -> None:
        self.provider: AIParserProvider = AnakinAIProvider()
        self.fallback: AIParserProvider = FallbackParser()

    async def parse(self, text: str):
        if not text or not text.strip():
            return [], "manual"
        errands = await self.provider.extract(text)
        if errands is not None:
            return errands, "ai"
        errands = self.fallback.extract(text)
        return errands, "fallback"


ai_parser = AIParser()
