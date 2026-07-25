import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  Grid,
  LinearProgress,
  Paper,
  Slider,
  Stack,
  Typography,
} from "@mui/material";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../api/client";

type Campaign = {
  id: number;
  name: string;
  platform: string;
  spend: number;
  revenue: number;
  roas: number;
  health_score: number;
};

type SimRow = {
  name: string;
  multiplier: number;
  baseline_spend: number;
  baseline_revenue: number;
  baseline_roas: number;
  projected_spend: number;
  projected_revenue: number;
  projected_roas: number;
  projected_conversions: number;
  efficiency: number;
};

type Simulation = {
  baseline: { spend: number; revenue: number; roas: number; conversions: number };
  projected: { spend: number; revenue: number; roas: number; conversions: number };
  revenue_delta: number;
  roas_delta: number;
  score: number;
  verdict: string;
  rows: SimRow[];
};

const MARKS = [
  { value: 0, label: "Pause" },
  { value: 1, label: "1x" },
  { value: 2, label: "2x" },
];

function money(n: number) {
  return `$${Math.round(n).toLocaleString()}`;
}

function scoreBand(score: number) {
  if (score >= 65) return { label: "Strong play", color: "#1F9D6C" };
  if (score >= 45) return { label: "Balanced", color: "#2D7FF9" };
  return { label: "Risky", color: "#E85D4C" };
}

export default function SimulatorPage() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [multipliers, setMultipliers] = useState<Record<string, number>>({});
  const [sim, setSim] = useState<Simulation | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .get<Campaign[]>("/api/campaigns")
      .then((r) => {
        const top = r.data.slice(0, 6);
        setCampaigns(top);
        setMultipliers(Object.fromEntries(top.map((c) => [c.name, 1])));
      })
      .catch(() => setError("Failed to load campaigns"));
  }, []);

  const runSimulation = useCallback(async (next: Record<string, number>) => {
    setBusy(true);
    try {
      const { data } = await api.post<Simulation>("/api/ai/simulate", { multipliers: next });
      setSim(data);
    } catch {
      setError("Simulation failed");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (Object.keys(multipliers).length) {
      const timer = setTimeout(() => runSimulation(multipliers), 250);
      return () => clearTimeout(timer);
    }
  }, [multipliers, runSimulation]);

  const chartData = useMemo(
    () =>
      (sim?.rows || [])
        .filter((r) => campaigns.some((c) => c.name === r.name))
        .map((r) => ({
          name: r.name.length > 14 ? `${r.name.slice(0, 13)}…` : r.name,
          Baseline: Math.round(r.baseline_revenue),
          Projected: Math.round(r.projected_revenue),
        })),
    [sim, campaigns]
  );

  function preset(kind: "reset" | "chase" | "trim" | "aggressive") {
    if (!campaigns.length) return;
    const ranked = [...campaigns].sort((a, b) => b.roas - a.roas);
    const next: Record<string, number> = {};
    campaigns.forEach((c) => (next[c.name] = 1));
    if (kind === "chase") {
      ranked.slice(0, 2).forEach((c) => (next[c.name] = 1.5));
      ranked.slice(-2).forEach((c) => (next[c.name] = 0.5));
    } else if (kind === "trim") {
      ranked.slice(-3).forEach((c) => (next[c.name] = 0));
    } else if (kind === "aggressive") {
      campaigns.forEach((c) => (next[c.name] = 1.8));
    }
    setMultipliers(next);
  }

  if (error) return <Alert severity="error">{error}</Alert>;

  const band = sim ? scoreBand(sim.score) : null;

  return (
    <>
      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        alignItems={{ md: "center" }}
        spacing={1}
        sx={{ mb: 2 }}
      >
        <Box>
          <Typography variant="h4">Budget Simulator</Typography>
          <Typography color="text.secondary">
            Drag spend up or down and see rule-projected revenue with diminishing returns.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Button variant="outlined" onClick={() => preset("chase")}>
            Chase winners
          </Button>
          <Button variant="outlined" onClick={() => preset("trim")}>
            Trim losers
          </Button>
          <Button variant="outlined" onClick={() => preset("aggressive")}>
            Scale everything
          </Button>
          <Button onClick={() => preset("reset")}>Reset</Button>
        </Stack>
      </Stack>

      {busy && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}

      {sim && band && (
        <Paper
          elevation={0}
          sx={{
            p: 3,
            mb: 2,
            borderRadius: 3,
            color: "#fff",
            background: `linear-gradient(120deg, #0A3D4A 0%, ${band.color} 120%)`,
          }}
        >
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }}>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="overline" sx={{ opacity: 0.9 }}>
                Simulation verdict
              </Typography>
              <Typography sx={{ mt: 0.5, lineHeight: 1.7, maxWidth: 820 }}>{sim.verdict}</Typography>
            </Box>
            <Box sx={{ textAlign: "center", minWidth: 130 }}>
              <Typography variant="h3" fontWeight={700}>
                {sim.score.toFixed(0)}
              </Typography>
              <Chip
                label={band.label}
                sx={{ bgcolor: "rgba(255,255,255,0.2)", color: "#fff", fontWeight: 700 }}
              />
            </Box>
          </Stack>
        </Paper>
      )}

      <Grid container spacing={2} sx={{ mb: 2 }}>
        {[
          {
            label: "Spend",
            base: sim?.baseline.spend,
            next: sim?.projected.spend,
            fmt: money,
            color: "#E85D4C",
          },
          {
            label: "Revenue",
            base: sim?.baseline.revenue,
            next: sim?.projected.revenue,
            fmt: money,
            color: "#1F9D6C",
          },
          {
            label: "ROAS",
            base: sim?.baseline.roas,
            next: sim?.projected.roas,
            fmt: (n: number) => `${n.toFixed(2)}x`,
            color: "#2D7FF9",
          },
          {
            label: "Conversions",
            base: sim?.baseline.conversions,
            next: sim?.projected.conversions,
            fmt: (n: number) => Math.round(n).toLocaleString(),
            color: "#E0A100",
          },
        ].map((c) => {
          const delta = (c.next ?? 0) - (c.base ?? 0);
          const up = delta >= 0;
          return (
            <Grid item xs={6} md={3} key={c.label}>
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: 3,
                  border: "1px solid #d7e6ee",
                  borderTop: `4px solid ${c.color}`,
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  {c.label}
                </Typography>
                <Typography variant="h5" fontWeight={700}>
                  {c.next != null ? c.fmt(c.next) : "—"}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ color: up ? "#1F9D6C" : "#E85D4C", fontWeight: 700 }}
                >
                  {c.base != null ? `${up ? "▲" : "▼"} ${c.fmt(Math.abs(delta))} vs today` : ""}
                </Typography>
              </Paper>
            </Grid>
          );
        })}
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} md={5}>
          <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: "1px solid #d7e6ee" }}>
            <Typography variant="h6" gutterBottom>
              Spend levers
            </Typography>
            <Stack spacing={2.5} sx={{ mt: 1 }}>
              {campaigns.map((c) => {
                const value = multipliers[c.name] ?? 1;
                const row = sim?.rows.find((r) => r.name === c.name);
                return (
                  <Box key={c.id}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography fontWeight={600}>{c.name}</Typography>
                      <Chip
                        size="small"
                        label={value === 0 ? "Paused" : `${value.toFixed(2)}x`}
                        sx={{
                          bgcolor: value > 1 ? "#1F9D6C" : value < 1 ? "#E0A100" : "#0A3D4A",
                          color: "#fff",
                          fontWeight: 700,
                        }}
                      />
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                      {c.platform} · today {money(c.spend)} at {c.roas.toFixed(2)}x
                      {row ? ` → ${money(row.projected_spend)} at ${row.projected_roas.toFixed(2)}x` : ""}
                    </Typography>
                    <Slider
                      value={value}
                      min={0}
                      max={2}
                      step={0.05}
                      marks={MARKS}
                      onChange={(_, v) =>
                        setMultipliers((prev) => ({ ...prev, [c.name]: v as number }))
                      }
                      sx={{ color: value > 1 ? "#1F9D6C" : value < 1 ? "#E0A100" : "#2D7FF9" }}
                    />
                  </Box>
                );
              })}
            </Stack>
          </Paper>
        </Grid>
        <Grid item xs={12} md={7}>
          <Paper
            elevation={0}
            sx={{ p: 2.5, height: 420, borderRadius: 3, border: "1px solid #d7e6ee" }}
          >
            <Typography variant="h6" gutterBottom>
              Revenue: today vs simulated
            </Typography>
            <ResponsiveContainer width="100%" height="86%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d7e6ee" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip formatter={(v: number) => money(v)} />
                <Legend />
                <Bar dataKey="Baseline" fill="#9FB8C4" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Projected" radius={[6, 6, 0, 0]}>
                  {chartData.map((d, i) => (
                    <Cell key={i} fill={d.Projected >= d.Baseline ? "#1F9D6C" : "#E85D4C"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      {sim && (
        <Button
          sx={{ mt: 2 }}
          variant="contained"
          onClick={() =>
            navigate("/chat", {
              state: {
                prefill: `I simulated a budget shift with projected ROAS ${sim.projected.roas.toFixed(
                  2
                )}. Where should we increase budget?`,
              },
            })
          }
        >
          Ask AI about this plan
        </Button>
      )}
    </>
  );
}
