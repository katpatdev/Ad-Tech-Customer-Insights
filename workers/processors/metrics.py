"""Metric feature engineering — mirrors Spark FeatureEngineering contract."""


def safe_div(n: float, d: float) -> float:
    return float(n) / float(d) if d else 0.0


CURRENCY_TO_USD = {
    "USD": 1.0,
    "SGD": 0.74,
    "INR": 0.012,
    "JPY": 0.0067,
    "MYR": 0.21,
    "IDR": 0.000063,
    "VND": 0.00004,
    "THB": 0.028,
    "PHP": 0.018,
    "KRW": 0.00074,
    "TWD": 0.031,
    "HKD": 0.13,
}


def to_usd(amount: float, currency: str = "USD") -> float:
    return float(amount) * CURRENCY_TO_USD.get(currency.upper(), 1.0)


def derive_metrics(event: dict) -> dict:
    impressions = float(event.get("impressions") or 0)
    clicks = float(event.get("clicks") or 0)
    spend = to_usd(float(event.get("spend") or 0), event.get("currency", "USD"))
    conversions = float(event.get("conversions") or 0)
    revenue = to_usd(float(event.get("revenue") or 0), event.get("currency", "USD"))
    return {
        "spend_usd": round(spend, 4),
        "revenue_usd": round(revenue, 4),
        "ctr": round(safe_div(clicks, impressions), 6),
        "cpc": round(safe_div(spend, clicks), 4),
        "cpa": round(safe_div(spend, conversions), 4),
        "roas": round(safe_div(revenue, spend), 4),
        "cvr": round(safe_div(conversions, clicks), 6),
        "cac": round(safe_div(spend, conversions), 4),
    }
