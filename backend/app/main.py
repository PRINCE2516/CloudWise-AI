
import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
from functools import lru_cache
import pandas as pd

from backend.app.routes import auth
from backend.app.routes.predict import router as predict_router
from backend.app.routes.recommend import router as recommend_router


app = FastAPI(
    title="CloudWise AI API"
)


# CORS Configuration
allowed_origins = [
    "http://localhost:3000",
    "http://localhost:3001"
]

frontend_url = os.getenv("FRONTEND_URL")

if frontend_url:
    allowed_origins.append(frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Register API routes
app.include_router(auth.router)
app.include_router(predict_router)
app.include_router(recommend_router)


# Dataset path
PROJECT_ROOT = Path(__file__).resolve().parents[2]

DATASET_PATH = (
    PROJECT_ROOT
    / "dataset"
    / "cloud_pricing_training_clean.csv"
)


# Load dataset metadata once
@lru_cache(maxsize=1)
def load_cloud_metadata():

    if not DATASET_PATH.exists():
        raise FileNotFoundError(
            f"Dataset not found: {DATASET_PATH}"
        )

    df = pd.read_csv(
        DATASET_PATH,
        usecols=[
            "Cloud_Provider",
            "Region",
            "Instance_Family"
        ]
    )

    metadata = {}

    for provider in sorted(df["Cloud_Provider"].unique()):

        provider_df = df[
            df["Cloud_Provider"] == provider
        ]

        metadata[provider] = {
            "regions": sorted(
                provider_df["Region"].dropna().unique().tolist()
            ),
            "instance_families": sorted(
                provider_df["Instance_Family"].dropna().unique().tolist()
            )
        }

    return metadata


# Metadata endpoint
@app.get("/metadata")
def get_metadata():

    try:
        return load_cloud_metadata()

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=str(error)
        )


# Home endpoint
@app.get("/")
def home():
    return {
        "message": "CloudWise AI Backend Running"
    }
