"""Model training and evaluation script for FitWise ML Service.

Trains LogisticRegression and LightGBM models for each product category (tshirt, jeans, kurta, blouse),
evaluates using Accuracy and Macro F1, selects and saves the superior model, and generates a BMI fairness report.
"""

import gc
import json
import os
import sys
import warnings
import numpy as np
import pandas as pd
import joblib

warnings.filterwarnings("ignore")

from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, f1_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from lightgbm import LGBMClassifier

from app.features import FEATURE_SETS, SIZES

# Suppress loky warning on Windows if cpu count detection is limited
os.environ.setdefault("LOKY_MAX_CPU_COUNT", str(os.cpu_count() or 2))

CATEGORIES = ["tshirt", "jeans", "kurta", "blouse"]
BMI_CATEGORIES = [cat for cat in CATEGORIES if "bmi" in FEATURE_SETS[cat]]
RANDOM_STATE = 42


def get_paths():
    """Resolve project directory paths relative to script location."""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    base_dir = os.path.dirname(script_dir)
    data_dir = os.path.join(script_dir, "data")
    models_dir = os.path.join(base_dir, "models")
    os.makedirs(models_dir, exist_ok=True)
    return data_dir, models_dir


def prepare_category_data(csv_path: str, category: str) -> tuple[pd.DataFrame, pd.Series]:
    """Load and prepare features X and labels y for the given category."""
    if not os.path.isfile(csv_path):
        raise FileNotFoundError(f"Training dataset not found: {csv_path}")

    df = pd.read_csv(csv_path)

    # Compute BMI if required by FEATURE_SETS and not present in CSV
    if "bmi" in FEATURE_SETS[category] and "bmi" not in df.columns:
        height_m = df["height_cm"] / 100.0
        df["bmi"] = df["weight_kg"] / (height_m**2)

    features = FEATURE_SETS[category]
    X = df[features].copy()
    y = df["label"].copy()

    return X, y


def train_and_evaluate(category: str, X: pd.DataFrame, y: pd.Series):
    """Train LogisticRegression and LightGBM, select the better one, and return evaluation details."""
    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.20,
        random_state=RANDOM_STATE,
        stratify=y,
    )

    print(f"\n==================================================")
    print(f"Training Category: {category.upper()}")
    print(f"Train size: {len(X_train):,}, Test size: {len(X_test):,}")
    print(f"Features ({len(X.columns)}): {list(X.columns)}")
    print(f"==================================================")

    # 1. Baseline: Logistic Regression (with StandardScaler in Pipeline)
    lr_pipeline = Pipeline([
        ("scaler", StandardScaler()),
        ("clf", LogisticRegression(max_iter=1000, random_state=RANDOM_STATE, n_jobs=1)),
    ])
    lr_pipeline.fit(X_train, y_train)
    y_pred_lr = lr_pipeline.predict(X_test)

    lr_acc = accuracy_score(y_test, y_pred_lr)
    lr_f1 = f1_score(y_test, y_pred_lr, average="macro")
    print(f"[LogisticRegression] Accuracy: {lr_acc:.4f} | Macro F1: {lr_f1:.4f}")

    # 2. LightGBM Classifier (low memory settings: depth 6, 31 leaves, 100 estimators)
    lgb_model = LGBMClassifier(
        n_estimators=100,
        max_depth=6,
        num_leaves=31,
        learning_rate=0.08,
        random_state=RANDOM_STATE,
        n_jobs=2,
        verbose=-1,
    )
    lgb_model.fit(X_train, y_train)
    y_pred_lgb = lgb_model.predict(X_test)

    lgb_acc = accuracy_score(y_test, y_pred_lgb)
    lgb_f1 = f1_score(y_test, y_pred_lgb, average="macro")
    print(f"[LightGBM]          Accuracy: {lgb_acc:.4f} | Macro F1: {lgb_f1:.4f}")

    # Select the model with higher macro F1 score (or accuracy if tied)
    if (lgb_f1, lgb_acc) >= (lr_f1, lr_acc):
        best_model = lgb_model
        best_name = "LightGBM"
        best_acc, best_f1 = lgb_acc, lgb_f1
        best_preds = y_pred_lgb
    else:
        best_model = lr_pipeline
        best_name = "LogisticRegression"
        best_acc, best_f1 = lr_acc, lr_f1
        best_preds = y_pred_lr

    print(f"--> Selected Superior Model: {best_name} (Acc: {best_acc:.4f}, F1: {best_f1:.4f})")

    # Evaluate BMI fairness if applicable
    bmi_fairness = None
    if "bmi" in X_test.columns:
        bmi_test = X_test["bmi"]
        buckets = {
            "<18.5": bmi_test < 18.5,
            "18.5-25": (bmi_test >= 18.5) & (bmi_test < 25.0),
            "25-30": (bmi_test >= 25.0) & (bmi_test < 30.0),
            ">30": bmi_test >= 30.0,
        }
        bmi_fairness = {}
        print("\n  BMI Fairness Accuracy Breakdown:")
        for bucket_name, mask in buckets.items():
            count = int(mask.sum())
            if count > 0:
                acc = float(accuracy_score(y_test[mask], best_preds[mask]))
                bmi_fairness[bucket_name] = round(acc, 4)
                print(f"    {bucket_name:7s} (n={count:4d}): {acc * 100:.2f}%")
            else:
                bmi_fairness[bucket_name] = 0.0
                print(f"    {bucket_name:7s} (n=   0): N/A")

    # Determine class order of model output
    if hasattr(best_model, "classes_"):
        class_order = [str(c) for c in best_model.classes_]
    elif hasattr(best_model, "named_steps"):
        class_order = [str(c) for c in best_model.named_steps["clf"].classes_]
    else:
        class_order = SIZES

    result = {
        "best_model": best_model,
        "best_name": best_name,
        "best_acc": best_acc,
        "best_f1": best_f1,
        "lr_acc": lr_acc,
        "lr_f1": lr_f1,
        "lgb_acc": lgb_acc,
        "lgb_f1": lgb_f1,
        "features": list(X.columns),
        "class_order": class_order,
        "bmi_fairness": bmi_fairness,
    }

    # Free memory
    del X_train, X_test, y_train, y_test, y_pred_lr, y_pred_lgb, best_preds
    gc.collect()

    return result


def main():
    data_dir, models_dir = get_paths()
    print("==================================================")
    print("FitWise ML Service - Model Training Pipeline")
    print(f"Data Directory  : {data_dir}")
    print(f"Models Directory: {models_dir}")
    print("==================================================")

    fairness_report = {}
    summary_results = []

    for category in CATEGORIES:
        csv_file = os.path.join(data_dir, f"{category}.csv")
        X, y = prepare_category_data(csv_file, category)

        res = train_and_evaluate(category, X, y)

        # Save model artifact
        model_path = os.path.join(models_dir, f"{category}.joblib")
        joblib.dump(res["best_model"], model_path)
        print(f"Saved model to: {model_path}")

        # Save metadata artifact
        meta_path = os.path.join(models_dir, f"{category}_meta.json")
        meta_data = {
            "category": category,
            "model_type": res["best_name"],
            "features": res["features"],
            "feature_list": res["features"],
            "class_order": res["class_order"],
            "classes": res["class_order"],
            "metrics": {
                "accuracy": round(float(res["best_acc"]), 4),
                "macro_f1": round(float(res["best_f1"]), 4),
            },
        }
        with open(meta_path, "w", encoding="utf-8") as f:
            json.dump(meta_data, f, indent=2)
        print(f"Saved metadata to: {meta_path}")

        # Collect fairness metrics if available
        if res["bmi_fairness"] is not None:
            fairness_report[category] = res["bmi_fairness"]

        summary_results.append({
            "category": category,
            "selected_model": res["best_name"],
            "accuracy": res["best_acc"],
            "macro_f1": res["best_f1"],
            "lr_acc": res["lr_acc"],
            "lr_f1": res["lr_f1"],
            "lgb_acc": res["lgb_acc"],
            "lgb_f1": res["lgb_f1"],
        })

        # Memory cleanup between categories
        del X, y, res
        gc.collect()

    # Save fairness report
    if fairness_report:
        fairness_path = os.path.join(models_dir, "fairness_report.json")
        with open(fairness_path, "w", encoding="utf-8") as f:
            json.dump(fairness_report, f, indent=2)
        print(f"\nSaved fairness report to: {fairness_path}")

    # Print Final Summary Table
    print("\n" + "=" * 70)
    print("FINAL TRAINING RESULTS SUMMARY")
    print("=" * 70)
    print(f"{'Category':<10} | {'Selected':<18} | {'Accuracy':<10} | {'Macro F1':<10}")
    print("-" * 70)
    for row in summary_results:
        print(f"{row['category']:<10} | {row['selected_model']:<18} | {row['accuracy']:<10.4f} | {row['macro_f1']:<10.4f}")
    print("=" * 70)

    if fairness_report:
        print("\nFAIRNESS REPORT (BMI Buckets Accuracy):")
        print(json.dumps(fairness_report, indent=2))
        print("=" * 70)


if __name__ == "__main__":
    main()
