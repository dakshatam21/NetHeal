import pandas as pd
import joblib
from sklearn.model_selection import GroupShuffleSplit
from pathlib import Path

from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from sklearn.tree import DecisionTreeRegressor
from sklearn.ensemble import (
    RandomForestRegressor,
    GradientBoostingRegressor,
)
from sklearn.metrics import (
    mean_absolute_error,
    mean_squared_error,
    r2_score,
)


# --------------------------------------------------
# 1. Project paths
# --------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_PATH = BASE_DIR / "data" / "route_training_data.csv"
MODEL_DIR = BASE_DIR / "models"

MODEL_DIR.mkdir(parents=True, exist_ok=True)


# --------------------------------------------------
# 2. Load dataset
# --------------------------------------------------

df = pd.read_csv(DATA_PATH)

print("=" * 55)
print("NETHEAL - ROUTE QUALITY MODEL TRAINING")
print("=" * 55)

print(f"\nDataset shape: {df.shape}")


# --------------------------------------------------
# 3. Select features and target
# --------------------------------------------------

features = [
    "hops",
    "total_latency_ms",
    "bottleneck_bandwidth_mbps",
    "estimated_packet_loss_percent",
]

target = "route_quality_score"
# Split by scenario to prevent data leakage
X = df[features]
y = df[target]
groups = df["scenario_id"]

splitter = GroupShuffleSplit(
    n_splits=1,
    test_size=0.2,
    random_state=42
)

train_idx, test_idx = next(
    splitter.split(X, y, groups=groups)
)

X_train = X.iloc[train_idx]
X_test = X.iloc[test_idx]

y_train = y.iloc[train_idx]
y_test = y.iloc[test_idx]

print("\nScenario-based split completed!")
print("Training scenarios:", groups.iloc[train_idx].nunique())
print("Testing scenarios:", groups.iloc[test_idx].nunique())

print(f"\nTraining records: {len(X_train)}")
print(f"Testing records:  {len(X_test)}")


# --------------------------------------------------
# 4. Define four regression models
# --------------------------------------------------

models = {
    "Linear Regression": LinearRegression(),

    "Decision Tree": DecisionTreeRegressor(
        random_state=42,
    ),

    "Random Forest": RandomForestRegressor(
        n_estimators=100,
        random_state=42,
        n_jobs=-1,
    ),

    "Gradient Boosting": GradientBoostingRegressor(
        n_estimators=100,
        random_state=42,
    ),
}


# --------------------------------------------------
# 6. Train and evaluate models
# --------------------------------------------------

results = {}

print("\nMODEL EVALUATION")
print("-" * 55)

for name, model in models.items():

    model.fit(X_train, y_train)

    predictions = model.predict(X_test)

    mae = mean_absolute_error(y_test, predictions)

    rmse = mean_squared_error(
        y_test,
        predictions,
    ) ** 0.5

    r2 = r2_score(y_test, predictions)

    results[name] = {
        "model": model,
        "MAE": mae,
        "RMSE": rmse,
        "R2": r2,
    }

    print(f"\nModel: {name}")
    print(f"MAE:   {mae:.4f}")
    print(f"RMSE:  {rmse:.4f}")
    print(f"R²:    {r2:.4f}")


# --------------------------------------------------
# 7. Compare model performance
# --------------------------------------------------

comparison = pd.DataFrame(
    [
        {
            "Model": name,
            "MAE": values["MAE"],
            "RMSE": values["RMSE"],
            "R2": values["R2"],
        }
        for name, values in results.items()
    ]
)

comparison = comparison.sort_values(
    by="RMSE",
    ascending=True,
)

print("\n\nMODEL COMPARISON")
print("=" * 65)
print(comparison.to_string(index=False))


# --------------------------------------------------
# 8. Select and save the best model
# --------------------------------------------------

best_name = comparison.iloc[0]["Model"]
best_model = results[best_name]["model"]

model_path = MODEL_DIR / "route_quality_model.pkl"

joblib.dump(
    {
        "model": best_model,
        "features": features,
        "model_name": best_name,
    },
    model_path,
)

# Save comparison results for documentation
comparison.to_csv(
    MODEL_DIR / "model_comparison.csv",
    index=False,
)

print("\n" + "=" * 55)
print(f"Best model by RMSE: {best_name}")
print(f"Saved model: {model_path}")
print(f"Saved comparison: {MODEL_DIR / 'model_comparison.csv'}")
print("Training and evaluation completed!")
print("=" * 55)