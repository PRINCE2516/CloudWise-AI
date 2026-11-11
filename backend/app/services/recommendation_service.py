
from pathlib import Path
from functools import lru_cache

import pandas as pd
from fastapi import HTTPException


# -------------------------------------------------
# 1. Project paths and supported providers
# -------------------------------------------------

PROJECT_ROOT = Path(__file__).resolve().parents[3]

DATASET_PATH = (
    PROJECT_ROOT
    / "dataset"
    / "cloud_pricing_training_clean.csv"
)

PROVIDERS = ["AWS", "Azure", "GCP"]


# -------------------------------------------------
# 2. Map provider regions to geographical markets
# -------------------------------------------------

def get_region_market(provider, region):

    region = str(region).strip().lower()

    if provider == "AWS":

        if region.startswith("us-"):
            return "US"

        if region.startswith("ca-"):
            return "CANADA"

        if region.startswith("eu-"):
            return "EUROPE"

        if region.startswith("ap-south-"):
            return "INDIA"

        if region == "ap-southeast-2":
            return "AUSTRALIA"

        if region.startswith("ap-southeast-"):
            return "SOUTHEAST_ASIA"

        if region.startswith(("ap-northeast-", "ap-east-")):
            return "EAST_ASIA"

        if region.startswith("sa-"):
            return "LATIN_AMERICA"

        if region.startswith("af-"):
            return "AFRICA"

        if region.startswith("me-"):
            return "MIDDLE_EAST"


    elif provider == "Azure":

        if region.startswith((
            "centralindia",
            "southindia",
            "indiasouthcentral"
        )):
            return "INDIA"

        if region.startswith((
            "southeastasia",
            "malaysiawest",
            "indonesiacentral"
        )):
            return "SOUTHEAST_ASIA"

        if region.startswith((
            "eastasia",
            "japaneast",
            "japanwest",
            "koreasouth"
        )):
            return "EAST_ASIA"

        if region.startswith("australia"):
            return "AUSTRALIA"

        if region.startswith("newzealand"):
            return "OCEANIA"

        if region.startswith("canada"):
            return "CANADA"

        if region.startswith((
            "eastus",
            "westus",
            "centralus",
            "northcentralus",
            "southcentralus",
            "westcentralus",
            "usgov"
        )):
            return "US"

        if region.startswith((
            "brazilsouth",
            "chilecentral",
            "mexicocentral"
        )):
            return "LATIN_AMERICA"

        if region.startswith((
            "israel",
            "qatar",
            "uaenorth"
        )):
            return "MIDDLE_EAST"

        if region.startswith("southafrica"):
            return "AFRICA"

        if region.startswith((
            "austriaeast",
            "belgiumcentral",
            "denmarkeast",
            "france",
            "germany",
            "italynorth",
            "northeurope",
            "norway",
            "polandcentral",
            "spaincentral",
            "sweden",
            "switzerland",
            "uksouth",
            "ukwest",
            "westeurope"
        )):
            return "EUROPE"


    elif provider == "GCP":

        if region.startswith("asia-south"):
            return "INDIA"

        if region.startswith("asia-southeast"):
            return "SOUTHEAST_ASIA"

        if region.startswith((
            "asia-east",
            "asia-northeast"
        )):
            return "EAST_ASIA"

        if region.startswith("australia-southeast"):
            return "AUSTRALIA"

        if region.startswith("europe"):
            return "EUROPE"

        if region.startswith("us-"):
            return "US"

        if region.startswith("northamerica-northeast"):
            return "CANADA"

        if region.startswith("northamerica-south"):
            return "MEXICO"

        if region.startswith("southamerica"):
            return "LATIN_AMERICA"

        if region.startswith("africa"):
            return "AFRICA"

        if region.startswith("me-"):
            return "MIDDLE_EAST"

    return "UNKNOWN"


# -------------------------------------------------
# 3. Load the official pricing dataset
# -------------------------------------------------

@lru_cache(maxsize=1)
def load_catalogue():

    if not DATASET_PATH.exists():
        raise FileNotFoundError(
            f"Dataset not found: {DATASET_PATH}"
        )

    df = pd.read_csv(DATASET_PATH)

    required_cols = [
        "Cloud_Provider",
        "Region",
        "Instance_Type",
        "Instance_Family",
        "vCPU",
        "RAM_GB",
        "GPU_Count",
        "Operating_System",
        "Hourly_Cost_USD"
    ]

    missing_cols = [
        col for col in required_cols
        if col not in df.columns
    ]

    if missing_cols:
        raise ValueError(
            f"Missing dataset columns: {missing_cols}"
        )

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

    df = df.dropna(
        subset=required_cols
    ).copy()

    df = df[
        df["Hourly_Cost_USD"] > 0
    ].copy()

    # Add geographical market to every catalogue row

    df["Region_Market"] = df.apply(
        lambda row: get_region_market(
            row["Cloud_Provider"],
            row["Region"]
        ),
        axis=1
    )

    return df


# -------------------------------------------------
# 4. Find the cheapest instance meeting requirements
# -------------------------------------------------

def find_best_instance(
    provider_df,
    vcpu,
    ram,
    gpu,
    usage_hours
):

    if provider_df.empty:
        return None

    eligible = provider_df[
        (provider_df["vCPU"] >= vcpu) &
        (provider_df["RAM_GB"] >= ram) &
        (provider_df["GPU_Count"] >= gpu)
    ].copy()

    if eligible.empty:
        return None

    eligible["Estimated_Monthly_Cost"] = (
        eligible["Hourly_Cost_USD"] * usage_hours
    )

    eligible = eligible.sort_values(
        by=[
            "Estimated_Monthly_Cost",
            "vCPU",
            "RAM_GB"
        ]
    )

    return eligible.iloc[0]


# -------------------------------------------------
# 5. Main recommendation function
# -------------------------------------------------

def recommend_provider(data):

    df = load_catalogue()

    selected_provider = data["Cloud_Provider"]
    selected_region = data["Region"]
    selected_family = data["Instance_Family"]

    vcpu = data["vCPU"]
    ram = data["RAM_GB"]
    gpu = data["GPU_Count"]

    operating_system = data["Operating_System"]
    usage_hours = data["Usage_Hours_Per_Month"]


    # -------------------------------------------------
    # Validate user inputs
    # -------------------------------------------------

    if selected_provider not in PROVIDERS:
        raise HTTPException(
            status_code=400,
            detail="Invalid cloud provider."
        )

    if operating_system != "Linux":
        raise HTTPException(
            status_code=400,
            detail="The current dataset supports Linux only."
        )

    if vcpu <= 0 or ram <= 0 or gpu < 0:
        raise HTTPException(
            status_code=400,
            detail="Invalid CPU, RAM or GPU requirements."
        )

    if usage_hours <= 0 or usage_hours > 730:
        raise HTTPException(
            status_code=400,
            detail="Usage hours must be between 1 and 730."
        )


    # -------------------------------------------------
    # 6. Determine geographical market
    # -------------------------------------------------

    market = get_region_market(
        selected_provider,
        selected_region
    )

    if market == "UNKNOWN":
        raise HTTPException(
            status_code=400,
            detail="Unable to identify the selected region market."
        )


    # -------------------------------------------------
    # 7. Filter by operating system and market
    # -------------------------------------------------

    market_df = df[
        (df["Region_Market"] == market) &
        (df["Operating_System"] == operating_system)
    ].copy()

    if market_df.empty:
        raise HTTPException(
            status_code=404,
            detail="No pricing records found for this market."
        )


    # -------------------------------------------------
    # 8. Find the exact selected configuration
    # -------------------------------------------------

    selected_df = market_df[
        (market_df["Cloud_Provider"] == selected_provider) &
        (market_df["Region"] == selected_region) &
        (market_df["Instance_Family"] == selected_family)
    ].copy()

    selected_instance = find_best_instance(
        selected_df,
        vcpu,
        ram,
        gpu,
        usage_hours
    )

    if selected_instance is None:
        raise HTTPException(
            status_code=404,
            detail=(
                "No matching instance found for the selected "
                "provider, region, family and hardware requirements."
            )
        )

    selected_cost = round(
        float(
            selected_instance["Estimated_Monthly_Cost"]
        ),
        2
    )


    # -------------------------------------------------
    # 9. Apply the SAME hardware requirements to all
    #    providers in the SAME geographical market
    # -------------------------------------------------

    eligible_market_df = market_df[
        (market_df["vCPU"] >= vcpu) &
        (market_df["RAM_GB"] >= ram) &
        (market_df["GPU_Count"] >= gpu)
    ].copy()

    if eligible_market_df.empty:
        raise HTTPException(
            status_code=404,
            detail="No instances meet the requested hardware requirements."
        )


    # -------------------------------------------------
    # 10. Find cheapest eligible instance per provider
    # -------------------------------------------------

    provider_costs = {}
    provider_instances = {}

    for provider in PROVIDERS:

        provider_df = eligible_market_df[
            eligible_market_df["Cloud_Provider"] == provider
        ].copy()

        best_instance = find_best_instance(
            provider_df,
            vcpu,
            ram,
            gpu,
            usage_hours
        )

        if best_instance is None:

            provider_costs[provider] = None
            provider_instances[provider] = None

        else:

            provider_costs[provider] = round(
                float(best_instance["Estimated_Monthly_Cost"]),
                2
            )

            provider_instances[provider] = best_instance


    # -------------------------------------------------
    # 11. Select the cheapest available provider
    # -------------------------------------------------

    available_costs = {
        provider: cost
        for provider, cost in provider_costs.items()
        if cost is not None
    }

    if not available_costs:
        raise HTTPException(
            status_code=404,
            detail="No comparable provider instances were found."
        )

    recommended_provider = min(
        available_costs,
        key=available_costs.get
    )

    recommended_cost = available_costs[
        recommended_provider
    ]

    recommended_instance = provider_instances[
        recommended_provider
    ]


    # -------------------------------------------------
    # 12. Calculate provider savings
    # -------------------------------------------------

    potential_savings = max(
        0,
        round(selected_cost - recommended_cost, 2)
    )

    savings_percentage = (
        round(
            (potential_savings / selected_cost) * 100,
            2
        )
        if selected_cost > 0
        else 0.0
    )


    # -------------------------------------------------
    # 13. Resource optimization options
    # -------------------------------------------------

    eligible_market_df = eligible_market_df.copy()

    eligible_market_df["Estimated_Monthly_Cost"] = (
        eligible_market_df["Hourly_Cost_USD"] * usage_hours
    )

    resource_df = (
        eligible_market_df
        .sort_values(
            by=[
                "Estimated_Monthly_Cost",
                "vCPU",
                "RAM_GB"
            ]
        )
        .drop_duplicates(
            subset=[
                "Cloud_Provider",
                "Instance_Family"
            ]
        )
    )

    resource_options = []

    for _, row in resource_df.head(10).iterrows():

        resource_options.append({

            "Instance_Family": str(
                row["Instance_Family"]
            ),

            "Provider": str(
                row["Cloud_Provider"]
            ),

            "Monthly_Cost_USD": round(
                float(row["Estimated_Monthly_Cost"]),
                2
            ),

            "Instance_Type": str(
                row["Instance_Type"]
            ),

            "Region": str(
                row["Region"]
            ),

            "vCPU": int(row["vCPU"]),

            "RAM_GB": float(row["RAM_GB"]),

            "GPU_Count": int(row["GPU_Count"])

        })


    if not resource_options:
        raise HTTPException(
            status_code=404,
            detail="No resource optimization options found."
        )

    optimized_option = resource_options[0]

    optimized_cost = optimized_option[
        "Monthly_Cost_USD"
    ]


    # -------------------------------------------------
    # 14. Calculate additional resource savings
    # -------------------------------------------------

    # Provider comparison already searches all eligible
    # instance families in the same market.
    # Therefore, additional savings cannot be counted
    # again against the original selected configuration.

    resource_savings = max(
        0,
        round(recommended_cost - optimized_cost, 2)
    )

    resource_savings_percentage = (
        round(
            (resource_savings / recommended_cost) * 100,
            2
        )
        if recommended_cost > 0
        else 0.0
    )


    # -------------------------------------------------
    # 15. Final API response
    # -------------------------------------------------

    return {

        "AWS": provider_costs["AWS"],

        "Azure": provider_costs["Azure"],

        "GCP": provider_costs["GCP"],


        "Selected_Configuration": {

            "Provider": selected_provider,

            "Region": selected_region,

            "Instance_Family": selected_family,

            "Instance_Type": str(
                selected_instance["Instance_Type"]
            ),

            "Monthly_Cost_USD": selected_cost

        },


        "Comparison_Region_Market": market,


        "Recommended_Provider": recommended_provider,


        "Recommended_Monthly_Cost_USD": round(
            recommended_cost,
            2
        ),


        "Recommended_Instance": {

            "Provider": recommended_provider,

            "Region": str(
                recommended_instance["Region"]
            ),

            "Instance_Family": str(
                recommended_instance["Instance_Family"]
            ),

            "Instance_Type": str(
                recommended_instance["Instance_Type"]
            ),

            "vCPU": int(
                recommended_instance["vCPU"]
            ),

            "RAM_GB": float(
                recommended_instance["RAM_GB"]
            ),

            "GPU_Count": int(
                recommended_instance["GPU_Count"]
            )

        },


        "Potential_Savings_USD": potential_savings,


        "Savings_Percentage": savings_percentage,


        "Resource_Optimization": {

            "Recommended_Instance_Family":
                optimized_option["Instance_Family"],

            "Recommended_Provider":
                optimized_option["Provider"],

            "Optimized_Monthly_Cost_USD":
                optimized_cost,

            "Savings_vs_Current_Recommendation_USD":
                resource_savings,

            "Savings_Percentage":
                resource_savings_percentage,

            "Options":
                resource_options

        }

    }
