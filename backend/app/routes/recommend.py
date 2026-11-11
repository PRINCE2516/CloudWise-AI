from fastapi import APIRouter

from backend.app.models.recommendation_model import RecommendationRequest
from backend.app.services.recommendation_service import recommend_provider

router = APIRouter()


@router.post("/recommend")
def recommend(request: RecommendationRequest):
    result = recommend_provider(request.model_dump())

    return result