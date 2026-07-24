import { useEffect, useState } from "react";
import { Alert, Box, Grid, Paper, Skeleton, Typography } from "@mui/material";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../api/client";

type KPI = {
  revenue: number;
  spend: number;
  ctr: number;
  conversions: number;
  roas: number;
  clicks: number;
  impressions: number;
  cpa: number;
  executive_summary?: string;
};

function fmt(n: number, kind: "money" | "pct" | "num" | "x" = "num") {
  if (kind === "money") return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  if (kind === "pct") return `${(n * 100).toFixed(2)}%`;
  if (kind === "x") return `${n.toFixed(2)}x`;
  return n.toLocaleString();
}

export default function ExecutivePage() {
  const [kpi, setKpi] = useState<KPI | null>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api.get("/api/kpis/executive"), api.get("/api/campaigns")])
      .then(([k, c]) => {
        setKpi(k.data);
        setCampaigns(c.data.slice(0, 8));
      })
      .catch(() => setError("Failed to load executive KPIs"));
  }, []);

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!kpi) return <Skeleton variant="rounded" height={320} />;

  const cards = [
    { label: "Revenue", value: fmt(kpi.revenue, "money") },
    { label: "Spend", value: fmt(kpi.spend, "money") },
    { label: "ROAS", value: fmt(kpi.roas, "x") },
    { label: "CTR", value: fmt(kpi.ctr, "pct") },
    { label: "Conversions", value: fmt(kpi.conversions) },
    { label: "CPA", value: fmt(kpi.cpa, "money") },
  ];

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Executive Dashboard
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Portfolio pulse with rule-generated morning summary.
      </Typography>

      <Paper sx={{ p: 3, mb: 3, borderLeft: "5px solid #C45C26" }}>
        <Typography variant="overline" color="secondary">
          AI Executive Summary
        </Typography>
        <Typography sx={{ mt: 1, lineHeight: 1.7 }}>
          {kpi.executive_summary || "Summary generating…"}
        </Typography>
      </Paper>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {cards.map((c) => (
          <Grid key={c.label} item xs={12} sm={6} md={4} lg={2}>
            <Paper sx={{ p: 2.2, height: "100%" }}>
              <Typography variant="caption" color="text.secondary">
                {c.label}
              </Typography>
              <Typography variant="h5" sx={{ mt: 0.5 }}>
                {c.value}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Paper sx={{ p: 2.5, height: 360 }}>
        <Typography variant="h6" gutterBottom>
          Top campaigns by spend
        </Typography>
        <ResponsiveContainer width="100%" height="90%">
          <BarChart data={campaigns}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ddd6c8" />
            <XAxis dataKey="name" hide />
            <YAxis />
            <Tooltip />
            <Bar dataKey="spend" fill="#0B3D2E" name="Spend" radius={[6, 6, 0, 0]} />
            <Bar dataKey="revenue" fill="#C45C26" name="Revenue" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Paper>
    </Box>
  );
}
