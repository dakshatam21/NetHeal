from pathlib import Path

import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns


# Project paths
BASE_DIR = Path(__file__).resolve().parent.parent

DATA_FILE = BASE_DIR / "data" / "route_training_data.csv"
RESULTS_DIR = BASE_DIR / "results"

RESULTS_DIR.mkdir(parents=True, exist_ok=True)


def perform_eda():
    # Load the dataset
    df = pd.read_csv(DATA_FILE)

    print("=" * 60)
    print("NETHEAL - EXPLORATORY DATA ANALYSIS")
    print("=" * 60)

    # 1. Basic information
    print("\n1. Dataset shape:")
    print(df.shape)

    print("\n2. First five records:")
    print(df.head())

    print("\n3. Dataset information:")
    df.info()

    # 2. Missing values
    print("\n4. Missing values:")
    print(df.isnull().sum())

    # 3. Duplicate records
    print("\n5. Exact duplicate rows:")
    print(df.duplicated().sum())

    # 4. Descriptive statistics
    numerical_columns = [
        "hops",
        "total_latency_ms",
        "bottleneck_bandwidth_mbps",
        "estimated_packet_loss_percent",
        "route_quality_score",
    ]

    print("\n6. Numerical feature statistics:")
    print(df[numerical_columns].describe().round(2))

    # 5. Route-quality score distribution
    plt.figure(figsize=(9, 5))

    sns.histplot(
        data=df,
        x="route_quality_score",
        bins=25,
        kde=True,
    )

    plt.title("Distribution of Route Quality Scores")
    plt.xlabel("Route Quality Score")
    plt.ylabel("Number of Candidate Routes")
    plt.tight_layout()

    plt.savefig(
        RESULTS_DIR / "quality_score_distribution.png",
        dpi=300,
    )

    plt.show()

    # 6. Latency distribution
    plt.figure(figsize=(9, 5))

    sns.histplot(
        data=df,
        x="total_latency_ms",
        bins=25,
        kde=True,
    )

    plt.title("Distribution of Route Latency")
    plt.xlabel("Total Latency (ms)")
    plt.ylabel("Number of Candidate Routes")
    plt.tight_layout()

    plt.savefig(
        RESULTS_DIR / "latency_distribution.png",
        dpi=300,
    )

    plt.show()

    # 7. Bandwidth distribution
    plt.figure(figsize=(9, 5))

    sns.histplot(
        data=df,
        x="bottleneck_bandwidth_mbps",
        bins=25,
        kde=True,
    )

    plt.title("Distribution of Bottleneck Bandwidth")
    plt.xlabel("Bottleneck Bandwidth (Mbps)")
    plt.ylabel("Number of Candidate Routes")
    plt.tight_layout()

    plt.savefig(
        RESULTS_DIR / "bandwidth_distribution.png",
        dpi=300,
    )

    plt.show()

    # 8. Packet-loss distribution
    plt.figure(figsize=(9, 5))

    sns.histplot(
        data=df,
        x="estimated_packet_loss_percent",
        bins=25,
        kde=True,
    )

    plt.title("Distribution of Estimated Packet Loss")
    plt.xlabel("Estimated Packet Loss (%)")
    plt.ylabel("Number of Candidate Routes")
    plt.tight_layout()

    plt.savefig(
        RESULTS_DIR / "packet_loss_distribution.png",
        dpi=300,
    )

    plt.show()

    # 9. Feature relationships
    plt.figure(figsize=(9, 6))

    sns.heatmap(
        df[numerical_columns].corr(),
        annot=True,
        cmap="coolwarm",
        fmt=".2f",
        vmin=-1,
        vmax=1,
    )

    plt.title("Correlation Between Numerical Features")
    plt.tight_layout()

    plt.savefig(
        RESULTS_DIR / "feature_correlation.png",
        dpi=300,
    )

    plt.show()

    # 10. Relationships with route quality
    plt.figure(figsize=(9, 5))

    sns.scatterplot(
        data=df,
        x="total_latency_ms",
        y="route_quality_score",
        alpha=0.5,
    )

    plt.title("Route Quality vs Total Latency")
    plt.xlabel("Total Latency (ms)")
    plt.ylabel("Route Quality Score")
    plt.tight_layout()

    plt.savefig(
        RESULTS_DIR / "quality_vs_latency.png",
        dpi=300,
    )

    plt.show()

    print("\nEDA completed successfully.")
    print(f"Charts saved to: {RESULTS_DIR}")


if __name__ == "__main__":
    perform_eda()