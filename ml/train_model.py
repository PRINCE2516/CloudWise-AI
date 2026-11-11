
import os
import pandas as pd
import joblib

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.base import clone


# 1. Paths
PROJECT_ROOT = os.path.dirname(
    os.path.dirname(os.path.abspath(__file__))
)

DATASET_PATH = os.path.join(
    PROJECT_ROOT,
    "dataset",
    "cloud_pricing_training_clean.csv"
)

MODEL_PATH = os.path.join(PROJECT_ROOT, "ml_model.pkl")
PREPROCESSOR_PATH = os.path.join(PROJECT_ROOT, "preprocessor.pkl")


# 2. Load dataset
df = pd.read_csv(DATASET_PATH)

print("Dataset loaded successfully.")
print("Original dataset rows:", len(df))


# 3. Define features and target
feature_cols = [
    "Cloud_Provider",
    "Region",
    "Instance_Family",
    "vCPU",
    "RAM_GB",
    "GPU_Count",
    "Operating_System"
]

target_col = "Hourly_Cost_USD"


# 4. Validate dataset columns
required_cols = feature_cols + [target_col]

missing_cols = [
    col for col in required_cols
    if col not in df.columns
]

if missing_cols:
    raise ValueError(
        f"Missing required columns: {missing_cols}"
    )


# 5. Clean dataset
df = df.dropna(subset=required_cols).copy()

numeric_cols = [
    "vCPU",
    "RAM_GB",
    "GPU_Count",
    "Hourly_Cost_USD"
]

for col in numeric_cols:
    df[col] = pd.to_numeric(
        df[col],
        errors="coerce"
    )

df = df.dropna(subset=numeric_cols)

df = df[df["Hourly_Cost_USD"] > 0]

if len(df) == 0:
    raise ValueError("No valid records available for training.")


# 6. Separate features and target
X = df[feature_cols]
y = df[target_col]

print("\nClean dataset rows:", len(df))
print("Input features:", feature_cols)
print("Prediction target:", target_col)


# 7. Train-test split
X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.2,
    random_state=42
)

print("\nTraining rows:", len(X_train))
print("Testing rows:", len(X_test))


# 8. Preprocessing
categorical_cols = [
    "Cloud_Provider",
    "Region",
    "Instance_Family",
    "Operating_System"
]

numeric_feature_cols = [
    "vCPU",
    "RAM_GB",
    "GPU_Count"
]

preprocessor = ColumnTransformer(
    transformers=[
        (
            "categorical",
            OneHotEncoder(handle_unknown="ignore"),
            categorical_cols
        ),
        (
            "numeric",
            "passthrough",
            numeric_feature_cols
        )
    ]
)


# 9. Define models
models = {
    "Linear Regression": LinearRegression(),

    "Random Forest": RandomForestRegressor(
        n_estimators=50,
        max_depth=12,
        min_samples_leaf=2,
        max_features=0.8,
        random_state=42,
        n_jobs=-1
    )
}


# 10. Train and evaluate models
results = {}
trained_pipelines = {}

for name, model in models.items():

    pipeline = Pipeline(
        steps=[
            ("preprocessor", clone(preprocessor)),
            ("model", model)
        ]
    )

    pipeline.fit(X_train, y_train)

    predictions = pipeline.predict(X_test)

    mae = mean_absolute_error(
        y_test,
        predictions
    )

    r2 = r2_score(
        y_test,
        predictions
    )

    results[name] = {
        "MAE": mae,
        "R2": r2
    }

    trained_pipelines[name] = pipeline

    print(f"\n{name}")
    print("MAE (Hourly USD):", round(mae, 6))
    print("R2 Score:", round(r2, 4))

    print(
        "Approx. monthly MAE at 730 hours:",
        round(mae * 730, 2),
        "USD"
    )


# 11. Save Random Forest model
best_pipeline = trained_pipelines["Random Forest"]

joblib.dump(
    best_pipeline.named_steps["model"],
    MODEL_PATH,
    compress=3
)

joblib.dump(
    best_pipeline.named_steps["preprocessor"],
    PREPROCESSOR_PATH,
    compress=3
)


# 12. Display saved model sizes
model_size = os.path.getsize(MODEL_PATH) / (1024 * 1024)
preprocessor_size = os.path.getsize(PREPROCESSOR_PATH) / (1024 * 1024)

print("\n--------------------------------")
print("MODEL TRAINING COMPLETED")
print("--------------------------------")

print("Model saved to:", MODEL_PATH)
print("Preprocessor saved to:", PREPROCESSOR_PATH)

print(f"Model size: {model_size:.2f} MB")
print(f"Preprocessor size: {preprocessor_size:.2f} MB")

print("\nFinal model: Random Forest")
print("Target: Hourly_Cost_USD")
print("Features:", feature_cols)
