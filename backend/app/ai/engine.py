"""Rule-based intelligence engine — no external API keys."""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from datetime import date
from statistics import mean
from typing import Any


@dataclass
class MetricRow:
    key: str
    metric_date: date
    spend: float
    revenue: float
    conversions: float
    clicks: float
    impressions: float
    ctr: float
    roas: float
    cpa: float
    label: str = ""


class IntelligenceEngine:
    """Deterministic rule/template engine with pluggable LLM swap later."""

    def detect_anomalies(self, series_by_key: dict[str, list[MetricRow]]) -> list[dict[str, Any]]:
        anomalies: list[dict[str, Any]] = []
        for key, rows in series_by_key.items():
            rows = sorted(rows, key=lambda r: r.metric_date)
            if len(rows) < 4:
                continue
            recent = rows[-3:]
            prior = rows[-6:-3] if len(rows) >= 6 else rows[:-3]
            if not prior:
                continue
            for metric, getter in (
                ("spend", lambda r: r.spend),
                ("conversions", lambda r: r.conversions),
                ("ctr", lambda r: r.ctr),
                ("roas", lambda r: r.roas),
                ("cpa", lambda r: r.cpa),
            ):
                prior_avg = mean(getter(r) for r in prior) or 0.0001
                recent_avg = mean(getter(r) for r in recent)
                change = ((recent_avg - prior_avg) / abs(prior_avg)) * 100
                if abs(change) < 20:
                    continue
                severity = "high" if abs(change) >= 40 else "medium" if abs(change) >= 25 else "low"
                direction = "increased" if change > 0 else "dropped"
                label = rows[-1].label or key
                anomalies.append(
                    {
                        "entity_type": "entity",
                        "entity_key": key,
                        "metric_name": metric,
                        "change_pct": round(change, 1),
                        "severity": severity,
                        "message": f"{label}: {metric} {direction} {abs(round(change, 1))}% vs prior period.",
                    }
                )
        return anomalies

    def detect_trends(self, series_by_key: dict[str, list[MetricRow]]) -> list[dict[str, Any]]:
        trends: list[dict[str, Any]] = []
        for key, rows in series_by_key.items():
            rows = sorted(rows, key=lambda r: r.metric_date)
            if len(rows) < 5:
                continue
            last5 = rows[-5:]
            ctrs = [r.ctr for r in last5]
            if all(ctrs[i] <= ctrs[i + 1] for i in range(4)):
                trends.append(
                    {
                        "category": "trend",
                        "title": f"CTR rising — {rows[-1].label or key}",
                        "body": f"CTR increased steadily over the past five days for {rows[-1].label or key}.",
                        "severity": "info",
                    }
                )
            roas = [r.roas for r in last5]
            if all(roas[i] >= roas[i + 1] for i in range(4)):
                trends.append(
                    {
                        "category": "trend",
                        "title": f"ROAS declining — {rows[-1].label or key}",
                        "body": f"ROAS has declined for five consecutive days on {rows[-1].label or key}.",
                        "severity": "warning",
                    }
                )
        return trends

    def forecast(self, rows: list[MetricRow], horizons: list[str] | None = None) -> list[dict[str, Any]]:
        horizons = horizons or ["1d", "7d", "30d"]
        rows = sorted(rows, key=lambda r: r.metric_date)
        if len(rows) < 3:
            return []
        values = [r.revenue for r in rows[-14:]]
        sma = mean(values)
        # simple linear slope
        n = len(values)
        xs = list(range(n))
        x_mean = mean(xs)
        y_mean = mean(values)
        denom = sum((x - x_mean) ** 2 for x in xs) or 1
        slope = sum((x - x_mean) * (y - y_mean) for x, y in zip(xs, values)) / denom
        mapping = {"1d": 1, "7d": 7, "30d": 30}
        out = []
        key = rows[-1].key
        for h in horizons:
            days = mapping[h]
            predicted = max(0.0, sma + slope * days)
            out.append(
                {
                    "entity_type": "campaign_or_entity",
                    "entity_key": key,
                    "metric_name": "revenue",
                    "horizon": h,
                    "predicted_value": round(predicted, 2),
                }
            )
        return out

    def recommend_budget(self, aggregates: list[dict[str, Any]]) -> list[dict[str, Any]]:
        recs: list[dict[str, Any]] = []
        for a in aggregates:
            name = a["name"]
            roas = a.get("roas", 0)
            cpa = a.get("cpa", 0)
            spend = a.get("spend", 0)
            if roas >= 3.5 and spend > 0:
                recs.append(
                    {
                        "action": "increase",
                        "target": name,
                        "rationale": f"ROAS is strong at {roas:.2f}. Increase budget by ~15%.",
                        "priority": "high",
                    }
                )
            elif roas < 1.0 and spend > 100:
                recs.append(
                    {
                        "action": "pause" if roas < 0.6 else "decrease",
                        "target": name,
                        "rationale": f"ROAS is weak at {roas:.2f} (CPA {cpa:.2f}). Reduce or pause spend.",
                        "priority": "high" if roas < 0.6 else "medium",
                    }
                )
            elif 1.5 <= roas < 2.5:
                recs.append(
                    {
                        "action": "hold",
                        "target": name,
                        "rationale": f"ROAS {roas:.2f} is acceptable. Hold budget and optimize creatives.",
                        "priority": "low",
                    }
                )
        return recs[:20]

    def score_health(self, roas: float, ctr: float, cpa: float, anomaly_count: int) -> float:
        score = 50.0
        score += min(30.0, max(-20.0, (roas - 2.0) * 10))
        score += min(15.0, max(-10.0, (ctr - 0.02) * 500))
        score -= min(15.0, max(0.0, (cpa - 20) / 5))
        score -= anomaly_count * 3
        return round(max(0.0, min(100.0, score)), 1)

    def executive_summary(
        self,
        kpis: dict[str, Any],
        best: dict[str, Any] | None,
        worst: dict[str, Any] | None,
        anomalies: list[dict[str, Any]],
        recs: list[dict[str, Any]],
    ) -> str:
        best_line = f"Best campaign: {best['name']} (ROAS {best['roas']:.2f})." if best else ""
        worst_line = f"Needs attention: {worst['name']} (ROAS {worst['roas']:.2f})." if worst else ""
        top_anom = anomalies[0]["message"] if anomalies else "No critical anomalies detected."
        top_rec = recs[0] if recs else None
        rec_line = (
            f"Top recommendation: {top_rec['action']} budget on {top_rec['target']}."
            if top_rec
            else "No urgent budget moves."
        )
        return (
            f"Portfolio spend ${kpis.get('spend', 0):,.0f} generated "
            f"${kpis.get('revenue', 0):,.0f} revenue (ROAS {kpis.get('roas', 0):.2f}) "
            f"with {kpis.get('conversions', 0):,} conversions. "
            f"{best_line} {worst_line} Anomaly watch: {top_anom} {rec_line}"
        ).strip()

    def chat(self, question: str, context: dict[str, Any]) -> tuple[str, list[str]]:
        q = question.lower()
        sources: list[str] = []
        anomalies = context.get("anomalies", [])
        recommendations = context.get("recommendations", [])
        countries = context.get("countries", [])
        platforms = context.get("platforms", [])
        campaigns = context.get("campaigns", [])
        kpis = context.get("kpis", {})

        if "japan" in q or "jp" in q:
            jp = next((c for c in countries if c.get("code") == "JP"), None)
            jp_anom = [a for a in anomalies if "JP" in a.get("entity_key", "") or "Japan" in a.get("message", "")]
            sources.append("countries:JP")
            if jp:
                msg = (
                    f"Japan spent ${jp['spend']:,.0f} with ROAS {jp['roas']:.2f} "
                    f"and {jp['conversions']} conversions."
                )
                if jp_anom:
                    msg += " " + jp_anom[0]["message"]
                    sources.append("anomalies")
                else:
                    msg += " Underperformance is often driven by elevated CPC and softer conversion rates."
                return msg, sources

        if "india" in q or "in " in q or q.strip().endswith(" in"):
            india = next((c for c in countries if c.get("code") == "IN"), None)
            sources.append("countries:IN")
            if india:
                return (
                    f"India delivered ROAS {india['roas']:.2f} on ${india['spend']:,.0f} spend "
                    f"with CTR {india['ctr']*100:.2f}%.",
                    sources,
                )

        if "singapore" in q or "sg" in q:
            sg = next((c for c in countries if c.get("code") == "SG"), None)
            sg_anom = [a for a in anomalies if "SG" in a.get("entity_key", "") or "Singapore" in a.get("message", "")]
            sources.append("countries:SG")
            if sg:
                msg = f"Singapore: spend ${sg['spend']:,.0f}, conversions {sg['conversions']}, ROAS {sg['roas']:.2f}."
                if sg_anom:
                    msg += " " + sg_anom[0]["message"]
                return msg, sources

        if "meta" in q and "tiktok" in q:
            meta = next((p for p in platforms if p.get("code") == "meta"), None)
            tt = next((p for p in platforms if p.get("code") == "tiktok"), None)
            sources.extend(["platforms:meta", "platforms:tiktok"])
            if meta and tt:
                winner = "Meta" if meta["roas"] >= tt["roas"] else "TikTok"
                return (
                    f"Meta ROAS {meta['roas']:.2f} vs TikTok ROAS {tt['roas']:.2f}. "
                    f"{winner} is currently more efficient.",
                    sources,
                )

        if "budget" in q or "where" in q and "more" in q:
            if recommendations:
                sources.append("recommendations")
                increases = [r for r in recommendations if r.get("action") == "increase"]
                pick = increases[0] if increases else recommendations[0]
                return f"Recommend: {pick['action']} on {pick['target']} — {pick['rationale']}", sources

        if "why" in q and ("losing" in q or "money" in q or "underperform" in q):
            if campaigns:
                worst = sorted(campaigns, key=lambda c: c.get("roas", 0))[0]
                sources.append(f"campaigns:{worst['name']}")
                return (
                    f"{worst['name']} is underperforming with ROAS {worst['roas']:.2f} "
                    f"and health score {worst.get('health_score', 0)}. "
                    f"Likely drivers: weak conversion efficiency and elevated CPA.",
                    sources,
                )

        if "summary" in q or "overview" in q or "how are we" in q:
            sources.append("kpis")
            return (
                f"Spend ${kpis.get('spend', 0):,.0f}, revenue ${kpis.get('revenue', 0):,.0f}, "
                f"ROAS {kpis.get('roas', 0):.2f}, conversions {kpis.get('conversions', 0):,}.",
                sources,
            )

        if anomalies:
            sources.append("anomalies")
            return f"Latest anomaly: {anomalies[0]['message']}", sources

        return (
            "I can help with country performance (e.g. Japan, India, Singapore), "
            "Meta vs TikTok, budget moves, campaign root causes, and portfolio overview.",
            sources,
        )


def group_rows(rows: list[MetricRow]) -> dict[str, list[MetricRow]]:
    grouped: dict[str, list[MetricRow]] = defaultdict(list)
    for r in rows:
        grouped[r.key].append(r)
    return grouped
