import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Grid,
  Paper,
  Skeleton,
  Stack,
  Typography,
  Chip,
} from "@mui/material";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";

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

const KPI_STYLES = [
  { label: "Revenue", kind: "money" as const, from: "#1F9D6C", to: "#3DD68C", key: "revenue" },
  { label: "Spend", kind: "money" as const, from: "#E85D4C", to: "#FF8A7A", key: "spend" },
  { label: "ROAS", kind: "x" as const, from: "#2D7FF9", to: "#6AA8FF", key: "roas" },
  { label: "CTR", kind: "pct" as const, from: "#0891B2", to: "#22D3EE", key: "ctr" },
  { label: "Conversions", kind: "num" as const, from: "#E0A100", to: "#F5C84C", key: "conversions" },
  { label: "CPA", kind: "money" as const, from: "#0A3D4A", to: "#1A6B7C", key: "cpa" },
];

const PIE_COLORS = ["#1F9D6C", "#2D7FF9", "#E85D4C", "#E0A100", "#0891B2", "#0A3D4A", "#FF8A7A", "#3DD68C"];

function fmt(n: number, kind: "money" | "pct" | "num" | "x" = "num") {
  if (kind === "money") return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  if (kind === "pct") return `${(n * 100).toFixed(2)}%`;
  if (kind === "x") return `${n.toFixed(2)}x`;
  return n.toLocaleString();
}

export default function ExecutivePage() {
  const { user } = useAuth();
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

  const pieData = campaigns.slice(0, 6).map((c) => ({
    name: c.name,
    value: Math.round(c.revenue),
  }));

  return (
    <Box>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        sx={{ mb: 3 }}
        spacing={1}
      >
        <Box>
          <Typography variant="h4" sx={{ letterSpacing: "-0.02em" }}>
            Executive Dashboard
          </Typography>
          <Typography color="text.secondary">
            Live portfolio pulse for <strong>{user?.tenant_name}</strong>
          </Typography>
        </Box>
        <Chip
          label="Morning briefing ready"
          sx={{ bgcolor: "#1F9D6C", color: "#fff", fontWeight: 700 }}
        />
      </Stack>

      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 3,
          color: "#fff",
          background:
            "linear-gradient(120deg, #0A3D4A 0%, #1A6B7C 40%, #2D7FF9 78%, #E85D4C 120%)",
          boxShadow: "0 12px 40px rgba(10,61,74,0.25)",
        }}
      >
        <Typography variant="overline" sx={{ opacity: 0.9, letterSpacing: 1.2 }}>
          AI Executive Summary
        </Typography>
        <Typography sx={{ mt: 1, lineHeight: 1.75, fontSize: "1.05rem", maxWidth: 980 }}>
          {kpi.executive_summary || "Summary generating…"}
        </Typography>
      </Paper>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {KPI_STYLES.map((c) => {
          const raw = (kpi as any)[c.key] as number;
          return (
            <Grid key={c.label} item xs={12} sm={6} md={4} lg={2}>
              <Paper
                elevation={0}
                sx={{
                  p: 2.2,
                  height: "100%",
                  borderRadius: 3,
                  color: "#fff",
                  background: `linear-gradient(145deg, ${c.from} 0%, ${c.to} 100%)`,
                  boxShadow: `0 10px 24px ${c.from}33`,
                  transition: "transform 180ms ease",
                  "&:hover": { transform: "translateY(-3px)" },
                }}
              >
                <Typography variant="caption" sx={{ opacity: 0.9, fontWeight: 600 }}>
                  {c.label}
                </Typography>
                <Typography variant="h5" sx={{ mt: 0.8, fontWeight: 700 }}>
                  {fmt(raw, c.kind)}
                </Typography>
              </Paper>
            </Grid>
          );
        })}
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} lg={7}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              height: 380,
              borderRadius: 3,
              border: "1px solid #d7e6ee",
              background: "linear-gradient(180deg, #FFFFFF 0%, #F3FAFF 100%)",
            }}
          >
            <Typography variant="h6" gutterBottom sx={{ color: "#0A3D4A" }}>
              Top campaigns — spend vs revenue
            </Typography>
            <ResponsiveContainer width="100%" height="88%">
              <BarChart data={campaigns}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d7e6ee" />
                <XAxis dataKey="name" hide />
                <YAxis stroke="#5A6B75" />
                <Tooltip />
                <Legend />
                <Bar dataKey="spend" fill="#E85D4C" name="Spend" radius={[8, 8, 0, 0]} />
                <Bar dataKey="revenue" fill="#1F9D6C" name="Revenue" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        <Grid item xs={12} lg={5}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              height: 380,
              borderRadius: 3,
              border: "1px solid #d7e6ee",
              background: "linear-gradient(180deg, #FFFFFF 0%, #FFF6F3 100%)",
            }}
          >
            <Typography variant="h6" gutterBottom sx={{ color: "#0A3D4A" }}>
              Revenue mix
            </Typography>
            <ResponsiveContainer width="100%" height="88%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={110}
                  paddingAngle={3}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
