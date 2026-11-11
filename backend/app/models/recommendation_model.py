
from pydantic import BaseModel, Field


class RecommendationRequest(BaseModel):
    Cloud_Provider: str
    Region: str
    Instance_Family: str

    vCPU: int
    RAM_GB: float
    GPU_Count: int = 0

    Operating_System: str = "Linux"

    Usage_Hours_Per_Month: float = Field(
        gt=0,
        le=730
    )
