
import os
import pandas as pd

from sklearn.model_selection import GroupShuffleSplit
from sklearn.preprocessing import OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score


# 1. Dataset path
PROJECT_ROOT = os.path.dirname(
    os.path.dirname(os.path.abspath(__file__))
)

DATASET_PATH = os.path.join(
    PROJECT_ROOT,
    "dataset",
    "cloud_pricing_training_clean.csv"
)


# 2. Load dataset
df = pd.read_csv(DATASET_PATH)

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

df = df.dropna(subset=feature_cols + [target_col]).copy()

# 3. Create numeric values
numeric_cols = [
    "vCPU", "RAM_GB", "GPU_Count", target_col
]

for col in numeric_cols:
    df[col] = pd.to_numeric(df[col], errors="coerce")

df = df.dropna(subset=numeric_cols)
df = df[df[target_col] > 0]

X = df[feature_cols]
y = df[target_col]

# 4. Group by provider and instance type
groups = (
    df["Cloud_Provider"].astype(str)
    + "__"
    + df["Instance_Type"].astype(str)
)

# 5. Grouped train-test split
splitter = GroupShuffleSplit(
    n_splits=1,
    test_size=0.2,
    random_state=42
)

train_idx, test_idx = next(
    splitter.split(X, y, groups)
)

X_train = X.iloc[train_idx]
X_test = X.iloc[test_idx]

y_train = y.iloc[train_idx]
y_test = y.iloc[test_idx]

print("Training rows:", len(X_train))
print("Testing rows:", len(X_test))

print(
    "Training instance groups:",
    groups.iloc[train_idx].nunique()
)

print(
    "Testing instance groups:",
    groups.iloc[test_idx].nunique()
)

# 6. Preprocessing
categorical_cols = [
    "Cloud_Provider",
    "Region",
    "Instance_Family",
    "Operating_System"
]

numeric_feature_cols = [
    "vCPU", "RAM_GB", "GPU_Count"
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

# 7. Random Forest model
pipeline = Pipeline(
    steps=[
        ("preprocessor", preprocessor),
        (
            "model",
            RandomForestRegressor(
                n_estimators=200,
                random_state=42,
                n_jobs=-1
            )
        )
    ]
)

# 8. Train and evaluate
pipeline.fit(X_train, y_train)

predictions = pipeline.predict(X_test)

mae = mean_absolute_error(y_test, predictions)
r2 = r2_score(y_test, predictions)

print("\nGROUPED RANDOM FOREST EVALUATION")
print("--------------------------------")
print("Hourly MAE:", round(mae, 6))
print("R2 Score:", round(r2, 4))
print(
    "Approx. monthly MAE at 730 hours:",
    round(mae * 730, 2),
    "USD"
)
