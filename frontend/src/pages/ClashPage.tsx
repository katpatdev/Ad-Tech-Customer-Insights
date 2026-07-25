import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import {
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { api } from "../api/client";

type Campaign = {
  id: number;
  name: string;
  platform: string;
  spend: number;
  revenue: number;
  roas: number;
  ctr: number;
  health_score: number;
};

type ClashResult = {
  left: { id: number; name: string; platform: string; points: number };
  right: { id: number; name: string; platform: string; points: number };
  winner: string;
  title: string;
  verdict: string;
  rounds: {
    dimension: string;
    weight: number;
    left_value: number;
    right_value: number;
    left_score: number;
    right_score: number;
    winner: string;
  }[];
  radar: {
    left: { dimension: string; score: number }[];
    right: { dimension: string; score: number }[];
  };
};

function fmtDim(dim: string, value: number) {
  if (dim === "CTR") return `${(value * 100).toFixed(2)}%`;
  if (dim === "ROAS") return `${value.toFixed(2)}x`;
  if (dim.includes("CPA") || dim.includes("Efficiency")) return value.toFixed(4);
  if (dim.includes("Scale") || dim.includes("revenue")) return `$${Math.round(value).toLocaleString()}`;
  return value.toFixed(1);
}

export default function ClashPage() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [leftId, setLeftId] = useState<number | "">("");
  const [rightId, setRightId] = useState<number | "">("");
  const [result, setResult] = useState<ClashResult | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    api
      .get<Campaign[]>("/api/campaigns")
      .then((r) => {
        setCampaigns(r.data);
        if (r.data.length >= 2) {
          setLeftId(r.data[0].id);
          setRightId(r.data[1].id);
        }
      })
      .catch(() => setError("Failed to load campaigns"));
  }, []);

  async function fight(a?: number, b?: number) {
    const l = a ?? leftId;
    const r = b ?? rightId;
    if (l === "" || r === "" || l === r) {
      setError("Pick two different campaigns");
      return;
    }
    setError("");
    setBusy(true);
    setPulse(true);
    try {
      const { data } = await api.post<ClashResult>("/api/ai/clash", {
        left_id: l,
        right_id: r,
      });
      setResult(data);
    } catch {
      setError("Clash failed");
    } finally {
      setBusy(false);
      setTimeout(() => setPulse(false), 700);
    }
  }

  function randomMatchup() {
    if (campaigns.length < 2) return;
    const shuffled = [...campaigns].sort(() => Math.random() - 0.5);
    setLeftId(shuffled[0].id);
    setRightId(shuffled[1].id);
    fight(shuffled[0].id, shuffled[1].id);
  }

  const radarData = useMemo(() => {
    if (!result) return [];
    return result.radar.left.map((d, i) => ({
      dimension: d.dimension,
      [result.left.name]: d.score,
      [result.right.name]: result.radar.right[i]?.score ?? 0,
    }));
  }, [result]);

  const leftColor = "#2D7FF9";
  const rightColor = "#E85D4C";

  if (error && !campaigns.length) return <Alert severity="error">{error}</Alert>;

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
          <Typography variant="h4">Campaign Clash</Typography>
          <Typography color="text.secondary">
            Pick two campaigns and battle them across ROAS, health, CTR, efficiency, and scale.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={randomMatchup} disabled={busy}>
            Random matchup
          </Button>
          <Button variant="contained" onClick={() => fight()} disabled={busy}>
            {busy ? "Fighting…" : "Start clash"}
          </Button>
        </Stack>
      </Stack>

      {error && (
        <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={5}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 3,
              border: `2px solid ${leftColor}`,
              background: "linear-gradient(180deg,#fff,#F3F8FF)",
            }}
          >
            <Typography variant="overline" sx={{ color: leftColor, fontWeight: 700 }}>
              Corner A
            </Typography>
            <FormControl fullWidth size="small" sx={{ mt: 1 }}>
              <InputLabel>Campaign</InputLabel>
              <Select
                label="Campaign"
                value={leftId}
                onChange={(e) => setLeftId(Number(e.target.value))}
              >
                {campaigns.map((c) => (
                  <MenuItem key={c.id} value={c.id} disabled={c.id === rightId}>
                    {c.name} · {c.roas.toFixed(2)}x
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {result && (
              <Typography variant="h3" fontWeight={700} sx={{ mt: 2, color: leftColor }}>
                {result.left.points.toFixed(0)}
                <Typography component="span" variant="body2" sx={{ ml: 1 }}>
                  pts
                </Typography>
              </Typography>
            )}
          </Paper>
        </Grid>
        <Grid item xs={12} md={2} sx={{ display: "grid", placeItems: "center" }}>
          <Box
            sx={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              display: "grid",
              placeItems: "center",
              fontWeight: 800,
              fontSize: 22,
              color: "#fff",
              bgcolor: "#0A3D4A",
              transform: pulse ? "scale(1.15)" : "scale(1)",
              transition: "transform 300ms ease",
              boxShadow: "0 8px 24px rgba(10,61,74,0.35)",
            }}
          >
            VS
          </Box>
        </Grid>
        <Grid item xs={12} md={5}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 3,
              border: `2px solid ${rightColor}`,
              background: "linear-gradient(180deg,#fff,#FFF6F3)",
            }}
          >
            <Typography variant="overline" sx={{ color: rightColor, fontWeight: 700 }}>
              Corner B
            </Typography>
            <FormControl fullWidth size="small" sx={{ mt: 1 }}>
              <InputLabel>Campaign</InputLabel>
              <Select
                label="Campaign"
                value={rightId}
                onChange={(e) => setRightId(Number(e.target.value))}
              >
                {campaigns.map((c) => (
                  <MenuItem key={c.id} value={c.id} disabled={c.id === leftId}>
                    {c.name} · {c.roas.toFixed(2)}x
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {result && (
              <Typography variant="h3" fontWeight={700} sx={{ mt: 2, color: rightColor }}>
                {result.right.points.toFixed(0)}
                <Typography component="span" variant="body2" sx={{ ml: 1 }}>
                  pts
                </Typography>
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>

      {result && (
        <>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              mb: 2,
              borderRadius: 3,
              color: "#fff",
              background:
                result.winner === "draw"
                  ? "linear-gradient(120deg,#0A3D4A,#5A6B75)"
                  : result.winner === "left"
                    ? `linear-gradient(120deg,#0A3D4A,${leftColor})`
                    : `linear-gradient(120deg,#0A3D4A,${rightColor})`,
              animation: pulse ? "none" : "fadeIn 400ms ease",
            }}
          >
            <Typography variant="overline" sx={{ opacity: 0.9 }}>
              Clash verdict
            </Typography>
            <Typography variant="h4" fontWeight={700} sx={{ mt: 0.5 }}>
              {result.title}
            </Typography>
            <Typography sx={{ mt: 1, lineHeight: 1.7, maxWidth: 860 }}>{result.verdict}</Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
              <Chip
                label={`${result.left.name}: ${result.left.points.toFixed(0)}`}
                sx={{ bgcolor: "rgba(255,255,255,0.18)", color: "#fff", fontWeight: 700 }}
              />
              <Chip
                label={`${result.right.name}: ${result.right.points.toFixed(0)}`}
                sx={{ bgcolor: "rgba(255,255,255,0.18)", color: "#fff", fontWeight: 700 }}
              />
            </Stack>
          </Paper>

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Paper
                elevation={0}
                sx={{ p: 2.5, height: 380, borderRadius: 3, border: "1px solid #d7e6ee" }}
              >
                <Typography variant="h6" gutterBottom>
                  Arena radar
                </Typography>
                <ResponsiveContainer width="100%" height="88%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#d7e6ee" />
                    <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 11 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} />
                    <Radar
                      name={result.left.name}
                      dataKey={result.left.name}
                      stroke={leftColor}
                      fill={leftColor}
                      fillOpacity={0.35}
                    />
                    <Radar
                      name={result.right.name}
                      dataKey={result.right.name}
                      stroke={rightColor}
                      fill={rightColor}
                      fillOpacity={0.3}
                    />
                    <Legend />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper
                elevation={0}
                sx={{ p: 2.5, borderRadius: 3, border: "1px solid #d7e6ee", minHeight: 380 }}
              >
                <Typography variant="h6" gutterBottom>
                  Round-by-round
                </Typography>
                <Stack spacing={1.2}>
                  {result.rounds.map((r) => {
                    const winColor =
                      r.winner === "left" ? leftColor : r.winner === "right" ? rightColor : "#5A6B75";
                    return (
                      <Box
                        key={r.dimension}
                        sx={{
                          p: 1.5,
                          borderRadius: 2,
                          borderLeft: `4px solid ${winColor}`,
                          bgcolor: "#F7FBFD",
                        }}
                      >
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography fontWeight={700}>
                            {r.dimension}{" "}
                            <Typography component="span" variant="caption" color="text.secondary">
                              (w{(r.weight * 100).toFixed(0)})
                            </Typography>
                          </Typography>
                          <Chip
                            size="small"
                            label={
                              r.winner === "draw"
                                ? "Draw"
                                : r.winner === "left"
                                  ? result.left.name
                                  : result.right.name
                            }
                            sx={{ bgcolor: winColor, color: "#fff", fontWeight: 700 }}
                          />
                        </Stack>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          {result.left.name}: {fmtDim(r.dimension, r.left_value)} ·{" "}
                          {result.right.name}: {fmtDim(r.dimension, r.right_value)}
                        </Typography>
                      </Box>
                    );
                  })}
                </Stack>
              </Paper>
            </Grid>
          </Grid>

          <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
            <Button
              variant="contained"
              onClick={() =>
                navigate("/chat", {
                  state: {
                    prefill: `Compare ${result.left.name} vs ${result.right.name}. Who should get more budget?`,
                  },
                })
              }
            >
              Ask AI about this matchup
            </Button>
            {result.winner !== "draw" && (
              <Button
                variant="outlined"
                onClick={() =>
                  navigate(
                    `/campaigns/${result.winner === "left" ? result.left.id : result.right.id}`
                  )
                }
              >
                Open winner
              </Button>
            )}
          </Stack>
        </>
      )}
    </>
  );
}
