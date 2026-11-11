
import joblib
import pandas as pd
from pathlib import Path


# 1. Locate saved model files
PROJECT_ROOT = Path(__file__).resolve().parents[3]

MODEL_PATH = PROJECT_ROOT / "ml_model.pkl"
PREPROCESSOR_PATH = PROJECT_ROOT / "preprocessor.pkl"


# 2. Load trained model and preprocessor
model = joblib.load(MODEL_PATH)
preprocessor = joblib.load(PREPROCESSOR_PATH)


# 3. Features used during model training
FEATURE_COLS = [
    "Cloud_Provider",
    "Region",
    "Instance_Family",
    "vCPU",
    "RAM_GB",
    "GPU_Count",
    "Operating_System"
]


# 4. Predict cloud cost
def predict_cost(data):

    # Extract model input features
    input_data = {
        col: data[col]
        for col in FEATURE_COLS
    }

    df = pd.DataFrame([input_data])

    # Predict hourly cost
    transformed_data = preprocessor.transform(df)

    predicted_hourly_cost = float(
        model.predict(transformed_data)[0]
    )

    # Calculate monthly cost using requested usage hours
    usage_hours = float(data["Usage_Hours_Per_Month"])

    predicted_monthly_cost = (
        predicted_hourly_cost * usage_hours
    )

    return round(predicted_monthly_cost, 2)
