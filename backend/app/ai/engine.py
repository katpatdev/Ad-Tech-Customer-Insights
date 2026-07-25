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

    def simulate_budget(
        self, baseline: list[dict[str, Any]], multipliers: dict[str, float]
    ) -> dict[str, Any]:
        """Project outcomes when spend is scaled per campaign.

        Efficiency follows diminishing returns above the current spend level and
        recovers slightly when spend is cut, so scaling a winner never stays linear.
        """
        rows: list[dict[str, Any]] = []
        base_spend = base_revenue = base_conv = 0.0
        new_spend = new_revenue = new_conv = 0.0

        for item in baseline:
            name = item["name"]
            spend = float(item.get("spend", 0) or 0)
            revenue = float(item.get("revenue", 0) or 0)
            conversions = float(item.get("conversions", 0) or 0)
            mult = max(0.0, float(multipliers.get(name, 1.0)))

            # Saturation: each extra unit of spend converts less efficiently.
            if mult > 1:
                efficiency = 1.0 / (1.0 + 0.35 * (mult - 1.0))
            elif mult < 1:
                efficiency = 1.0 + 0.12 * (1.0 - mult)
            else:
                efficiency = 1.0

            projected_spend = spend * mult
            projected_revenue = revenue * mult * efficiency
            projected_conv = conversions * mult * efficiency

            base_spend += spend
            base_revenue += revenue
            base_conv += conversions
            new_spend += projected_spend
            new_revenue += projected_revenue
            new_conv += projected_conv

            rows.append(
                {
                    "name": name,
                    "multiplier": round(mult, 2),
                    "baseline_spend": round(spend, 2),
                    "baseline_revenue": round(revenue, 2),
                    "baseline_roas": round(revenue / spend, 4) if spend else 0.0,
                    "projected_spend": round(projected_spend, 2),
                    "projected_revenue": round(projected_revenue, 2),
                    "projected_roas": round(projected_revenue / projected_spend, 4)
                    if projected_spend
                    else 0.0,
                    "projected_conversions": int(projected_conv),
                    "efficiency": round(efficiency, 3),
                }
            )

        base_roas = base_revenue / base_spend if base_spend else 0.0
        new_roas = new_revenue / new_spend if new_spend else 0.0
        revenue_delta = new_revenue - base_revenue
        roas_delta = new_roas - base_roas

        movers = sorted(
            (r for r in rows if abs(r["multiplier"] - 1.0) > 0.01),
            key=lambda r: r["projected_revenue"] - r["baseline_revenue"],
            reverse=True,
        )
        gainer = movers[0] if movers else None
        loser = movers[-1] if len(movers) > 1 else None

        if not movers:
            verdict = "No changes yet — move a slider to simulate a budget shift."
        elif roas_delta > 0.05:
            verdict = f"Efficient reallocation: portfolio ROAS improves to {new_roas:.2f}."
        elif roas_delta < -0.05:
            verdict = f"Careful: portfolio ROAS drops to {new_roas:.2f} due to saturation."
        else:
            verdict = f"Roughly neutral: ROAS holds near {new_roas:.2f}."

        narrative = [verdict]
        if gainer and gainer["projected_revenue"] > gainer["baseline_revenue"]:
            narrative.append(
                f"{gainer['name']} adds ${gainer['projected_revenue'] - gainer['baseline_revenue']:,.0f} revenue "
                f"at {gainer['multiplier']:.2f}x spend."
            )
        if loser and loser["projected_revenue"] < loser["baseline_revenue"]:
            narrative.append(
                f"{loser['name']} gives up ${loser['baseline_revenue'] - loser['projected_revenue']:,.0f} revenue "
                f"at {loser['multiplier']:.2f}x spend."
            )
        if new_spend > base_spend * 1.001:
            narrative.append(f"Total spend rises ${new_spend - base_spend:,.0f}.")
        elif new_spend < base_spend * 0.999:
            narrative.append(f"Total spend falls ${base_spend - new_spend:,.0f}.")

        score = 50.0 + roas_delta * 40 + (revenue_delta / base_revenue * 60 if base_revenue else 0)
        return {
            "baseline": {
                "spend": round(base_spend, 2),
                "revenue": round(base_revenue, 2),
                "roas": round(base_roas, 4),
                "conversions": int(base_conv),
            },
            "projected": {
                "spend": round(new_spend, 2),
                "revenue": round(new_revenue, 2),
                "roas": round(new_roas, 4),
                "conversions": int(new_conv),
            },
            "revenue_delta": round(revenue_delta, 2),
            "roas_delta": round(roas_delta, 4),
            "score": round(max(0.0, min(100.0, score)), 1),
            "verdict": " ".join(narrative),
            "rows": rows,
        }

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
        q = question.lower().strip()
        sources: list[str] = []
        anomalies = context.get("anomalies", [])
        recommendations = context.get("recommendations", [])
        countries = context.get("countries", [])
        platforms = context.get("platforms", [])
        campaigns = context.get("campaigns", [])
        kpis = context.get("kpis", {})

        def country_by_code(code: str) -> dict | None:
            return next((c for c in countries if c.get("code") == code), None)

        def platform_by_code(code: str) -> dict | None:
            return next((p for p in platforms if p.get("code") == code), None)

        def country_answer(code: str, name: str) -> tuple[str, list[str]] | None:
            row = country_by_code(code)
            if not row:
                return None
            src = [f"countries:{code}"]
            anom = [
                a
                for a in anomalies
                if code in a.get("entity_key", "") or name.lower() in a.get("message", "").lower()
            ]
            msg = (
                f"{name} spent ${row['spend']:,.0f} with ROAS {row['roas']:.2f}, "
                f"{row['conversions']:,} conversions, and CTR {row['ctr'] * 100:.2f}%."
            )
            if anom:
                msg += f" Watch-out: {anom[0]['message']}"
                src.append("anomalies")
            return msg, src

        # Help / capabilities
        if any(k in q for k in ("what can you", "help", "capabilities", "what do you know")):
            return (
                "I answer from your tenant metrics using rules. Try: portfolio overview, best/worst "
                "campaign, health scores, pause/increase budget, anomalies, forecasts, CTR/ROAS/CPA, "
                "country deep-dives (Japan, India, Singapore, Korea, Indonesia…), and platform compares "
                "(Meta vs TikTok, Google vs LinkedIn).",
                ["help"],
            )

        # Country deep-dives
        country_aliases = [
            (("japan", " jp", "jp ", "tokyo"), "JP", "Japan"),
            (("india", " delhi", " mumbai"), "IN", "India"),
            (("singapore", " sg", "sg "), "SG", "Singapore"),
            (("malaysia", " my ", "kuala"), "MY", "Malaysia"),
            (("indonesia", " jakarta", " id "), "ID", "Indonesia"),
            (("vietnam", " vietnam", " vn "), "VN", "Vietnam"),
            (("thailand", " bangkok", " th "), "TH", "Thailand"),
            (("philippines", " manila", " ph "), "PH", "Philippines"),
            (("korea", " south korea", " seoul", " kr "), "KR", "South Korea"),
            (("taiwan", " taipei", " tw "), "TW", "Taiwan"),
            (("hong kong", " hk "), "HK", "Hong Kong"),
        ]
        for aliases, code, name in country_aliases:
            if any(a.strip() in q for a in aliases) or f" {code.lower()} " in f" {q} ":
                ans = country_answer(code, name)
                if ans:
                    return ans

        # Best / worst country
        if countries and ("best country" in q or "top country" in q or "which country is best" in q):
            best = max(countries, key=lambda c: c.get("roas", 0))
            sources.append(f"countries:{best['code']}")
            return (
                f"Best country by ROAS is {best['name']} at {best['roas']:.2f} "
                f"(${best['spend']:,.0f} spend, {best['conversions']:,} conversions).",
                sources,
            )
        if countries and (
            "worst country" in q or "weakest country" in q or "which country is worst" in q
        ):
            worst = min(countries, key=lambda c: c.get("roas", 0))
            sources.append(f"countries:{worst['code']}")
            return (
                f"Weakest country by ROAS is {worst['name']} at {worst['roas']:.2f}. "
                f"Review CPC and creative fit before scaling.",
                sources,
            )
        if "which country" in q and ("budget" in q or "more" in q or "invest" in q or "scale" in q):
            if countries:
                ranked = sorted(countries, key=lambda c: c.get("roas", 0), reverse=True)
                top = ranked[0]
                sources.append(f"countries:{top['code']}")
                return (
                    f"Prioritize {top['name']} — highest ROAS at {top['roas']:.2f}. "
                    f"Consider shifting budget from lower-ROAS markets.",
                    sources,
                )

        # Platform compares & singles
        if ("meta" in q and "tiktok" in q) or ("facebook" in q and "tiktok" in q):
            meta = platform_by_code("meta")
            tt = platform_by_code("tiktok")
            sources.extend(["platforms:meta", "platforms:tiktok"])
            if meta and tt:
                winner = "Meta" if meta["roas"] >= tt["roas"] else "TikTok"
                return (
                    f"Meta ROAS {meta['roas']:.2f} (spend ${meta['spend']:,.0f}) vs "
                    f"TikTok ROAS {tt['roas']:.2f} (spend ${tt['spend']:,.0f}). "
                    f"{winner} is currently more efficient.",
                    sources,
                )
        if "google" in q and ("linkedin" in q or "meta" in q or "tiktok" in q):
            g = platform_by_code("google_ads")
            other_code = (
                "linkedin" if "linkedin" in q else "meta" if "meta" in q else "tiktok"
            )
            other = platform_by_code(other_code)
            if g and other:
                sources.extend(["platforms:google_ads", f"platforms:{other_code}"])
                winner = g["name"] if g["roas"] >= other["roas"] else other["name"]
                return (
                    f"{g['name']} ROAS {g['roas']:.2f} vs {other['name']} ROAS {other['roas']:.2f}. "
                    f"{winner} wins on efficiency today.",
                    sources,
                )
        if "best platform" in q or "top platform" in q or "which platform" in q:
            if platforms:
                best = max(platforms, key=lambda p: p.get("roas", 0))
                sources.append(f"platforms:{best['code']}")
                return (
                    f"Best platform by ROAS is {best['name']} at {best['roas']:.2f} "
                    f"with ${best['spend']:,.0f} spend.",
                    sources,
                )
        for code, name in (
            ("meta", "Meta"),
            ("tiktok", "TikTok"),
            ("google_ads", "Google Ads"),
            ("linkedin", "LinkedIn"),
            ("shopify", "Shopify"),
        ):
            aliases = {
                "meta": ("meta", "facebook", "instagram"),
                "tiktok": ("tiktok", "tik tok"),
                "google_ads": ("google ads", "google"),
                "linkedin": ("linkedin",),
                "shopify": ("shopify",),
            }[code]
            if any(a in q for a in aliases) and (
                "how is" in q or "performance" in q or "doing" in q or q.strip() == name.lower()
            ):
                p = platform_by_code(code)
                if p:
                    sources.append(f"platforms:{code}")
                    return (
                        f"{p['name']}: spend ${p['spend']:,.0f}, revenue ${p['revenue']:,.0f}, "
                        f"ROAS {p['roas']:.2f}, CTR {p['ctr'] * 100:.2f}%, "
                        f"{p['conversions']:,} conversions.",
                        sources,
                    )

        # Campaign health / best / worst
        if campaigns and (
            "best campaign" in q or "top campaign" in q or "winning campaign" in q
        ):
            best = max(campaigns, key=lambda c: c.get("roas", 0))
            sources.append(f"campaigns:{best['name']}")
            return (
                f"Best campaign is {best['name']} on {best.get('platform', 'n/a')} "
                f"with ROAS {best['roas']:.2f} and health {best.get('health_score', 0):.0f}.",
                sources,
            )
        if campaigns and (
            "worst campaign" in q
            or ("losing" in q and "money" in q)
            or ("why" in q and "underperform" in q)
            or "weakest campaign" in q
        ):
            worst = sorted(campaigns, key=lambda c: c.get("roas", 0))[0]
            sources.append(f"campaigns:{worst['name']}")
            return (
                f"{worst['name']} is underperforming with ROAS {worst['roas']:.2f} "
                f"and health score {worst.get('health_score', 0)}. "
                f"Likely drivers: weak conversion efficiency and elevated CPA.",
                sources,
            )
        if "health" in q and campaigns:
            ranked = sorted(campaigns, key=lambda c: c.get("health_score", 0))
            weak = ranked[0]
            strong = ranked[-1]
            sources.extend([f"campaigns:{weak['name']}", f"campaigns:{strong['name']}"])
            return (
                f"Lowest health: {weak['name']} ({weak.get('health_score', 0):.0f}). "
                f"Strongest health: {strong['name']} ({strong.get('health_score', 0):.0f}).",
                sources,
            )
        if ("pause" in q or "stop" in q) and (recommendations or campaigns):
            pauses = [r for r in recommendations if r.get("action") == "pause"]
            if pauses:
                sources.append("recommendations")
                return (
                    f"Pause candidate: {pauses[0]['target']} — {pauses[0]['rationale']}",
                    sources,
                )
            if campaigns:
                worst = sorted(campaigns, key=lambda c: c.get("roas", 0))[0]
                sources.append(f"campaigns:{worst['name']}")
                return (
                    f"If ROAS stays below 1.0, pause {worst['name']} "
                    f"(current ROAS {worst['roas']:.2f}) and reallocate.",
                    sources,
                )

        # Budget / recommendations
        if any(
            k in q
            for k in (
                "budget",
                "recommend",
                "increase spend",
                "decrease spend",
                "reallocate",
                "where should",
                "scale",
            )
        ):
            if recommendations:
                sources.append("recommendations")
                increases = [r for r in recommendations if r.get("action") == "increase"]
                decreases = [
                    r for r in recommendations if r.get("action") in ("decrease", "pause")
                ]
                lines = []
                if increases:
                    lines.append(
                        f"Increase: {increases[0]['target']} — {increases[0]['rationale']}"
                    )
                if decreases:
                    lines.append(
                        f"Reduce/pause: {decreases[0]['target']} — {decreases[0]['rationale']}"
                    )
                if not lines:
                    pick = recommendations[0]
                    lines.append(
                        f"{pick['action'].title()} on {pick['target']} — {pick['rationale']}"
                    )
                return " ".join(lines), sources

        # Anomalies / risks
        if any(k in q for k in ("anomal", "risk", "alert", "what went wrong", "issue", "problem")):
            if anomalies:
                sources.append("anomalies")
                top = anomalies[:3]
                body = " | ".join(a["message"] for a in top)
                return f"Top anomalies: {body}", sources
            return ("No high-severity anomalies in the latest rule scan.", sources)

        # Opportunities / trends
        if any(k in q for k in ("opportunit", "trend", "momentum", "what's working", "working well")):
            if campaigns:
                best = max(campaigns, key=lambda c: c.get("roas", 0))
                sources.append(f"campaigns:{best['name']}")
                msg = (
                    f"Strongest momentum: {best['name']} (ROAS {best['roas']:.2f}). "
                    f"Scale creatives and audiences that are already converting."
                )
                if countries:
                    top_c = max(countries, key=lambda c: c.get("ctr", 0))
                    msg += f" Highest CTR market: {top_c['name']} ({top_c['ctr'] * 100:.2f}%)."
                    sources.append(f"countries:{top_c['code']}")
                return msg, sources

        # Metric definitions / KPI asks
        if "what is roas" in q or "define roas" in q:
            return (
                "ROAS = revenue ÷ spend. Above ~3.0 is strong in this demo; below 1.0 means losing money.",
                ["glossary:roas"],
            )
        if "what is cpa" in q or "define cpa" in q:
            return (
                "CPA = spend ÷ conversions. Lower is better. Pair with ROAS before cutting budgets.",
                ["glossary:cpa"],
            )
        if "what is ctr" in q or "define ctr" in q:
            return (
                "CTR = clicks ÷ impressions. Rising CTR with flat conversions often means creative is strong but landing/offer is weak.",
                ["glossary:ctr"],
            )
        if "roas" in q and kpis:
            sources.append("kpis")
            return (
                f"Portfolio ROAS is {kpis.get('roas', 0):.2f} "
                f"(${kpis.get('revenue', 0):,.0f} revenue on ${kpis.get('spend', 0):,.0f} spend).",
                sources,
            )
        if "cpa" in q and kpis:
            sources.append("kpis")
            return (f"Portfolio CPA is ${kpis.get('cpa', 0):,.2f}.", sources)
        if "ctr" in q and kpis:
            sources.append("kpis")
            return (f"Portfolio CTR is {kpis.get('ctr', 0) * 100:.2f}%.", sources)
        if ("conversion" in q or "convert" in q) and kpis:
            sources.append("kpis")
            return (
                f"Total conversions: {kpis.get('conversions', 0):,}. "
                f"Revenue ${kpis.get('revenue', 0):,.0f}.",
                sources,
            )
        if "spend" in q and ("how much" in q or "total" in q or "portfolio" in q) and kpis:
            sources.append("kpis")
            return (f"Total spend is ${kpis.get('spend', 0):,.0f}.", sources)

        # Forecast-ish
        if any(k in q for k in ("forecast", "predict", "next week", "tomorrow", "next month")):
            if campaigns and kpis:
                sources.append("kpis")
                daily = kpis.get("revenue", 0) / 30
                return (
                    f"Rule forecast (SMA-style): ~${daily:,.0f}/day revenue if trends hold. "
                    f"Expect ~${daily * 7:,.0f} next week and ~${daily * 30:,.0f} next month. "
                    f"Check campaign detail pages for per-campaign horizons.",
                    sources,
                )

        # Compare two named campaigns loosely
        if "compare" in q and campaigns and len(campaigns) >= 2:
            top2 = sorted(campaigns, key=lambda c: c.get("spend", 0), reverse=True)[:2]
            sources.extend([f"campaigns:{top2[0]['name']}", f"campaigns:{top2[1]['name']}"])
            return (
                f"{top2[0]['name']} ROAS {top2[0]['roas']:.2f} vs "
                f"{top2[1]['name']} ROAS {top2[1]['roas']:.2f}. "
                f"{'Favor ' + top2[0]['name'] if top2[0]['roas'] >= top2[1]['roas'] else 'Favor ' + top2[1]['name']} for efficiency.",
                sources,
            )

        # Portfolio overview
        if any(
            k in q
            for k in (
                "summary",
                "overview",
                "how are we",
                "portfolio",
                "status",
                "dashboard",
                "morning",
                "briefing",
            )
        ):
            sources.append("kpis")
            best = max(campaigns, key=lambda c: c.get("roas", 0)) if campaigns else None
            worst = min(campaigns, key=lambda c: c.get("roas", 0)) if campaigns else None
            msg = (
                f"Spend ${kpis.get('spend', 0):,.0f}, revenue ${kpis.get('revenue', 0):,.0f}, "
                f"ROAS {kpis.get('roas', 0):.2f}, conversions {kpis.get('conversions', 0):,}."
            )
            if best:
                msg += f" Best: {best['name']} ({best['roas']:.2f}x)."
            if worst:
                msg += f" Needs attention: {worst['name']} ({worst['roas']:.2f}x)."
            return msg, sources

        if anomalies:
            sources.append("anomalies")
            return f"Latest anomaly: {anomalies[0]['message']}", sources

        return (
            "I can help with: portfolio overview, best/worst campaigns & countries, platform compares "
            "(Meta vs TikTok, Google vs LinkedIn), budget increase/pause, anomalies, health scores, "
            "CTR/ROAS/CPA, forecasts, and country deep-dives across Asia. Ask one of the suggested prompts.",
            sources,
        )


def group_rows(rows: list[MetricRow]) -> dict[str, list[MetricRow]]:
    grouped: dict[str, list[MetricRow]] = defaultdict(list)
    for r in rows:
        grouped[r.key].append(r)
    return grouped
