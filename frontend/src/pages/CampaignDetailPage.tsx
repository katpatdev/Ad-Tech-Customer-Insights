import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Alert, Chip, Grid, Paper, Stack, Typography } from "@mui/material";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../api/client";

export default function CampaignDetailPage() {
  const { id } = useParams();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get(`/api/campaigns/${id}`)
      .then((r) => setData(r.data))
      .catch(() => setError("Failed to load campaign"));
  }, [id]);

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!data) return null;

  return (
    <>
      <Typography variant="h4" gutterBottom>
        {data.name}
      </Typography>
      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        <Chip label={data.platform} />
        <Chip label={`Health ${data.health_score}`} color={data.health_score >= 60 ? "success" : "warning"} />
        <Chip label={`ROAS ${data.roas.toFixed(2)}`} />
      </Stack>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        {[
          ["Spend", `$${data.spend.toLocaleString()}`],
          ["Revenue", `$${data.revenue.toLocaleString()}`],
          ["Conversions", data.conversions],
          ["Budget", `$${data.budget_usd.toLocaleString()}`],
        ].map(([k, v]) => (
          <Grid key={k as string} item xs={6} md={3}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="caption">{k}</Typography>
              <Typography variant="h6">{v}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Paper sx={{ p: 2, height: 360, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Trend
        </Typography>
        <ResponsiveContainer width="100%" height="85%">
          <LineChart data={data.series}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" hide />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="spend" stroke="#0B3D2E" dot={false} />
            <Line type="monotone" dataKey="revenue" stroke="#C45C26" dot={false} />
            <Line type="monotone" dataKey="roas" stroke="#2F6B4F" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </Paper>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6">Forecasts</Typography>
            {data.forecasts?.length ? (
              data.forecasts.map((f: any, i: number) => (
                <Typography key={i} sx={{ mt: 1 }}>
                  {f.horizon}: ${f.predicted_value.toLocaleString()} {f.metric_name}
                </Typography>
              ))
            ) : (
              <Typography color="text.secondary">No forecasts</Typography>
            )}
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6">Anomalies</Typography>
            {data.anomalies?.length ? (
              data.anomalies.map((a: any, i: number) => (
                <Typography key={i} sx={{ mt: 1 }}>
                  [{a.severity}] {a.message}
                </Typography>
              ))
            ) : (
              <Typography color="text.secondary">No campaign-level anomalies</Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </>
  );
}
