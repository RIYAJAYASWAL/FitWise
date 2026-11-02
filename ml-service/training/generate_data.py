"""Synthetic training data generator for FitWise ML Service.

Generates 15,000 realistic rows for each product category (tshirt, jeans, kurta, blouse)
with category-specific measurements, history features (kept_ratio, most_kept_size_idx),
and ground-truth size labels with realistic noise injection.
"""

import os
import random
import numpy as np
import pandas as pd

# Global reproducibility seed
SEED = 42
N_SAMPLES_PER_CATEGORY = 15000

SIZES = ["XS", "S", "M", "L", "XL", "XXL"]
SIZE_TO_IDX = {size: idx for idx, size in enumerate(SIZES)}


def add_label_noise(base_indices: np.ndarray, noise_rate: float = 0.10) -> list[str]:
    """Flip noise_rate (10%) of labels to an adjacent size (XS..XXL)."""
    noisy_indices = []
    for idx in base_indices:
        if random.random() < noise_rate:
            if idx == 0:
                new_idx = 1
            elif idx == len(SIZES) - 1:
                new_idx = len(SIZES) - 2
            else:
                new_idx = idx + random.choice([-1, 1])
            noisy_indices.append(new_idx)
        else:
            noisy_indices.append(idx)
    return [SIZES[i] for i in noisy_indices]


def generate_history_features(true_size_indices: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Generate realistic kept_ratio (0.0 to 1.0) and most_kept_size_idx (-1 or 0-5).

    - ~25% of users are first-time shoppers with no history: most_kept_size_idx = -1, kept_ratio = 0.0.
    - ~75% have history: most_kept_size_idx strongly correlates with true size, and kept_ratio is drawn
      from a realistic distribution centered around 0.7 - 0.9.
    """
    n = len(true_size_indices)
    has_history = np.random.rand(n) >= 0.25

    most_kept_size_idx = np.full(n, -1, dtype=int)
    kept_ratio = np.zeros(n, dtype=float)

    for i in range(n):
        if has_history[i]:
            true_idx = true_size_indices[i]
            # 75% match true size, 20% adjacent size, 5% random size
            r = random.random()
            if r < 0.75:
                past_size = true_idx
            elif r < 0.95:
                if true_idx == 0:
                    past_size = 1
                elif true_idx == 5:
                    past_size = 4
                else:
                    past_size = true_idx + random.choice([-1, 1])
            else:
                past_size = random.randint(0, 5)

            most_kept_size_idx[i] = past_size
            # Realistic kept ratio between 0.2 and 1.0
            ratio = np.random.beta(a=6.0, b=2.0)
            kept_ratio[i] = round(float(np.clip(ratio, 0.0, 1.0)), 2)

    return kept_ratio, most_kept_size_idx


def generate_tshirt_data(n: int) -> pd.DataFrame:
    """Generate tshirt dataset with height_cm, weight_kg, chest_cm, waist_cm."""
    # Correlated height and weight
    height = np.random.normal(loc=173.0, scale=8.5, size=n)
    height = np.clip(height, 130.0, 210.0)

    # Heavier with height, plus body variance
    weight = 72.0 + 0.65 * (height - 173.0) + np.random.normal(0.0, 11.0, size=n)
    weight = np.clip(weight, 40.0, 180.0)

    # Chest and waist strongly correlate with weight and height
    chest = 97.0 + 0.68 * (weight - 72.0) + 0.15 * (height - 173.0) + np.random.normal(0.0, 2.5, size=n)
    chest = np.clip(chest, 50.0, 180.0)

    waist = 83.0 + 0.72 * (weight - 72.0) + 0.05 * (height - 173.0) + np.random.normal(0.0, 2.5, size=n)
    waist = np.clip(waist, 45.0, 180.0)

    # Sizing cutoffs based on chest and waist per API contract size chart
    metric = 0.75 * chest + 0.25 * (waist + 14.0)
    base_indices = np.zeros(n, dtype=int)
    base_indices[metric >= 89.0] = 1   # S
    base_indices[metric >= 94.0] = 2   # M
    base_indices[metric >= 99.0] = 3   # L
    base_indices[metric >= 105.0] = 4  # XL
    base_indices[metric >= 111.0] = 5  # XXL

    labels = add_label_noise(base_indices, noise_rate=0.10)
    kept_ratio, most_kept_size_idx = generate_history_features(base_indices)

    return pd.DataFrame({
        "height_cm": np.round(height, 1),
        "weight_kg": np.round(weight, 1),
        "chest_cm": np.round(chest, 1),
        "waist_cm": np.round(waist, 1),
        "kept_ratio": kept_ratio,
        "most_kept_size_idx": most_kept_size_idx,
        "label": labels,
    })


def generate_jeans_data(n: int) -> pd.DataFrame:
    """Generate jeans dataset with height_cm, weight_kg, waist_cm, hip_cm."""
    height = np.random.normal(loc=170.0, scale=8.5, size=n)
    height = np.clip(height, 130.0, 210.0)

    weight = 70.0 + 0.65 * (height - 170.0) + np.random.normal(0.0, 11.0, size=n)
    weight = np.clip(weight, 40.0, 180.0)

    # Waist and hip measurements
    waist = 80.0 + 0.74 * (weight - 70.0) + np.random.normal(0.0, 2.6, size=n)
    waist = np.clip(waist, 45.0, 180.0)

    hip = 98.0 + 0.65 * (weight - 70.0) + 0.12 * (height - 170.0) + np.random.normal(0.0, 2.5, size=n)
    hip = np.clip(hip, 50.0, 190.0)

    # Cutoffs based on waist and hip per size chart
    metric = 0.55 * waist + 0.45 * (hip - 18.0)
    base_indices = np.zeros(n, dtype=int)
    base_indices[metric >= 72.0] = 1   # S
    base_indices[metric >= 77.0] = 2   # M
    base_indices[metric >= 83.0] = 3   # L
    base_indices[metric >= 89.0] = 4   # XL
    base_indices[metric >= 96.0] = 5   # XXL

    labels = add_label_noise(base_indices, noise_rate=0.10)
    kept_ratio, most_kept_size_idx = generate_history_features(base_indices)

    return pd.DataFrame({
        "height_cm": np.round(height, 1),
        "weight_kg": np.round(weight, 1),
        "waist_cm": np.round(waist, 1),
        "hip_cm": np.round(hip, 1),
        "kept_ratio": kept_ratio,
        "most_kept_size_idx": most_kept_size_idx,
        "label": labels,
    })


def generate_kurta_data(n: int) -> pd.DataFrame:
    """Generate kurta dataset with height_cm, shoulder_cm, bust_cm, length_cm."""
    height = np.random.normal(loc=166.0, scale=8.0, size=n)
    height = np.clip(height, 130.0, 210.0)

    # Latent weight driving bust and shoulder size
    latent_weight = 65.0 + 0.60 * (height - 166.0) + np.random.normal(0.0, 10.0, size=n)
    latent_weight = np.clip(latent_weight, 35.0, 170.0)

    bust = 93.0 + 0.70 * (latent_weight - 65.0) + np.random.normal(0.0, 2.6, size=n)
    bust = np.clip(bust, 50.0, 180.0)

    shoulder = 40.5 + 0.14 * (height - 166.0) + 0.16 * (latent_weight - 65.0) + np.random.normal(0.0, 1.2, size=n)
    shoulder = np.clip(shoulder, 25.0, 70.0)

    length = 104.0 + 0.50 * (height - 166.0) + np.random.normal(0.0, 2.0, size=n)
    length = np.clip(length, 70.0, 150.0)

    # Cutoffs based on bust and shoulder
    metric = 0.75 * bust + 0.25 * (shoulder * 2.3)
    base_indices = np.zeros(n, dtype=int)
    base_indices[metric >= 85.0] = 1   # S
    base_indices[metric >= 90.0] = 2   # M
    base_indices[metric >= 96.0] = 3   # L
    base_indices[metric >= 102.0] = 4  # XL
    base_indices[metric >= 109.0] = 5  # XXL

    labels = add_label_noise(base_indices, noise_rate=0.10)
    kept_ratio, most_kept_size_idx = generate_history_features(base_indices)

    return pd.DataFrame({
        "height_cm": np.round(height, 1),
        "shoulder_cm": np.round(shoulder, 1),
        "bust_cm": np.round(bust, 1),
        "length_cm": np.round(length, 1),
        "kept_ratio": kept_ratio,
        "most_kept_size_idx": most_kept_size_idx,
        "label": labels,
    })


def generate_blouse_data(n: int) -> pd.DataFrame:
    """Generate blouse dataset with bust_cm, waist_cm, shoulder_cm."""
    # Latent body factors
    latent_height = np.random.normal(loc=162.0, scale=7.0, size=n)
    latent_weight = 58.0 + 0.55 * (latent_height - 162.0) + np.random.normal(0.0, 9.5, size=n)
    latent_weight = np.clip(latent_weight, 35.0, 160.0)

    bust = 88.0 + 0.72 * (latent_weight - 58.0) + np.random.normal(0.0, 2.5, size=n)
    bust = np.clip(bust, 45.0, 180.0)

    waist = 73.0 + 0.70 * (latent_weight - 58.0) + np.random.normal(0.0, 2.5, size=n)
    waist = np.clip(waist, 40.0, 170.0)

    shoulder = 38.0 + 0.10 * (latent_height - 162.0) + 0.15 * (latent_weight - 58.0) + np.random.normal(0.0, 1.2, size=n)
    shoulder = np.clip(shoulder, 25.0, 65.0)

    # Cutoffs based on bust and waist
    metric = 0.65 * bust + 0.35 * (waist + 15.0)
    base_indices = np.zeros(n, dtype=int)
    base_indices[metric >= 81.0] = 1   # S
    base_indices[metric >= 87.0] = 2   # M
    base_indices[metric >= 93.0] = 3   # L
    base_indices[metric >= 99.0] = 4   # XL
    base_indices[metric >= 106.0] = 5  # XXL

    labels = add_label_noise(base_indices, noise_rate=0.10)
    kept_ratio, most_kept_size_idx = generate_history_features(base_indices)

    return pd.DataFrame({
        "bust_cm": np.round(bust, 1),
        "waist_cm": np.round(waist, 1),
        "shoulder_cm": np.round(shoulder, 1),
        "kept_ratio": kept_ratio,
        "most_kept_size_idx": most_kept_size_idx,
        "label": labels,
    })


CATEGORY_GENERATORS = {
    "tshirt": generate_tshirt_data,
    "jeans": generate_jeans_data,
    "kurta": generate_kurta_data,
    "blouse": generate_blouse_data,
}


def main():
    # Set seeds for deterministic generation
    random.seed(SEED)
    np.random.seed(SEED)

    # Target directory: training/data/
    script_dir = os.path.dirname(os.path.abspath(__file__))
    output_dir = os.path.join(script_dir, "data")
    os.makedirs(output_dir, exist_ok=True)

    print("==================================================")
    print("FitWise ML Service - Synthetic Data Generator")
    print(f"Random Seed: {SEED}")
    print(f"Samples Per Category: {N_SAMPLES_PER_CATEGORY:,}")
    print(f"Output Directory: {output_dir}")
    print("==================================================\n")

    for category, generator in CATEGORY_GENERATORS.items():
        print(f"Generating data for '{category}'...")
        df = generator(N_SAMPLES_PER_CATEGORY)

        # Output CSV path
        output_file = os.path.join(output_dir, f"{category}.csv")
        df.to_csv(output_file, index=False)

        # Print class distribution
        print(f"Saved {len(df):,} rows to {output_file}")
        print(f"Columns: {list(df.columns)}")
        print(f"Class Distribution for '{category}':")

        counts = df["label"].value_counts().reindex(SIZES, fill_value=0)
        percentages = (counts / len(df)) * 100

        for size in SIZES:
            count = counts[size]
            pct = percentages[size]
            bar = "#" * int(pct / 2)
            print(f"  {size:3s}: {count:5,d} ({pct:5.2f}%)  {bar}")

        print("-" * 50 + "\n")

    print("All datasets generated successfully!")


if __name__ == "__main__":
    main()
