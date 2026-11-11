
from fastapi import APIRouter

from backend.app.models.request_model import CloudCostRequest
from backend.app.services.predict_service import predict_cost

router = APIRouter()


@router.post("/predict")
def predict(request: CloudCostRequest):

    prediction = predict_cost(request.model_dump())

    return {
        "predicted_monthly_cost_usd": prediction
    }
