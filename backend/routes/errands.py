from fastapi import APIRouter, HTTPException
from models.schemas import ErrandExtractRequest as ExtractRequest, ErrandExtractResponse as ExtractResponse
from services.ai_parser import ai_parser
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/errands/extract", response_model=ExtractResponse)
async def extract_errands(request: ExtractRequest):
    """Extract structured errands from natural language text.

    Falls back to rule-based parsing when AI credentials are unavailable.
    """
    try:
        errands, source = await ai_parser.parse(request.text)
        return ExtractResponse(errands=errands, source=source)
    except Exception as e:
        logger.error(f"Extract error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
