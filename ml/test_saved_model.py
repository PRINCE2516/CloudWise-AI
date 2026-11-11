
import joblib
import pandas as pd
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]

MODEL_PATH = PROJECT_ROOT / "ml_model.pkl"
PREPROCESSOR_PATH = PROJECT_ROOT / "preprocessor.pkl"

model = joblib.load(MODEL_PATH)
preprocessor = joblib.load(PREPROCESSOR_PATH)

test_data = pd.DataFrame([{
    "Cloud_Provider": "AWS",
    "Region": "us-east-1",
    "Instance_Family": "a1",
    "vCPU": 2,
    "RAM_GB": 8,
    "GPU_Count": 0,
    "Operating_System": "Linux"
}])

transformed_data = preprocessor.transform(test_data)
hourly_prediction = float(model.predict(transformed_data)[0])

print("Saved model loaded successfully.")
print("Predicted hourly cost:", round(hourly_prediction, 6), "USD")
print("Predicted monthly cost at 730 hours:",
      round(hourly_prediction * 730, 2), "USD")
