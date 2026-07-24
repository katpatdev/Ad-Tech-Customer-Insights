import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Grid,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { api } from "../api/client";

export default function InsightsPage() {
  const [insights, setInsights] = useState<any[]>([]);
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [recs, setRecs] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  async function load() {
    const [i, a, r] = await Promise.all([
      api.get("/api/insights"),
      api.get("/api/anomalies"),
      api.get("/api/recommendations"),
    ]);
    setInsights(i.data);
    setAnomalies(a.data);
    setRecs(r.data);
  }

  useEffect(() => {
    load().catch(() => setError("Failed to load insights"));
  }, []);

  async function regenerate() {
    setMsg("");
    try {
      await api.post("/api/ai/regenerate");
      await load();
      setMsg("Intelligence regenerated.");
    } catch {
      setMsg("Regenerate failed.");
    }
  }

  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h4">AI Insights</Typography>
          <Typography color="text.secondary">
            Rule-based risks, opportunities, anomalies, and budget actions.
          </Typography>
        </Box>
        <Button variant="contained" onClick={regenerate}>
          Regenerate
        </Button>
      </Stack>
      {msg && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {msg}
        </Alert>
      )}
      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, minHeight: 420 }}>
            <Typography variant="h6" gutterBottom>
              Insights
            </Typography>
            {insights.map((i) => (
              <Box key={i.id} sx={{ mb: 2, pb: 2, borderBottom: "1px solid #eee" }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Chip size="small" label={i.category} />
                  <Chip size="small" label={i.severity} variant="outlined" />
                </Stack>
                <Typography fontWeight={600} sx={{ mt: 1 }}>
                  {i.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {i.body}
                </Typography>
              </Box>
            ))}
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, minHeight: 420 }}>
            <Typography variant="h6" gutterBottom>
              Anomalies
            </Typography>
            {anomalies.slice(0, 25).map((a) => (
              <Box key={a.id} sx={{ mb: 1.5 }}>
                <Chip size="small" color={a.severity === "high" ? "error" : "warning"} label={a.severity} />
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  {a.message}
                </Typography>
              </Box>
            ))}
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, minHeight: 420 }}>
            <Typography variant="h6" gutterBottom>
              Recommendations
            </Typography>
            {recs.map((r) => (
              <Box key={r.id} sx={{ mb: 1.5 }}>
                <Typography fontWeight={600}>
                  {r.action.toUpperCase()} · {r.target}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {r.rationale}
                </Typography>
              </Box>
            ))}
          </Paper>
        </Grid>
      </Grid>
    </>
  );
}
