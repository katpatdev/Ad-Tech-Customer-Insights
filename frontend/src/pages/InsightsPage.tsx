import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Drawer,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tab,
  Tabs,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as ReTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../api/client";

type Insight = {
  id: number;
  category: string;
  title: string;
  body: string;
  severity: string;
  created_at: string;
};
type Anomaly = {
  id: number;
  entity_type: string;
  entity_key: string;
  metric_name: string;
  change_pct: number;
  severity: string;
  message: string;
  created_at: string;
};
type Rec = {
  id: number;
  action: string;
  target: string;
  rationale: string;
  priority: string;
  created_at: string;
};
type Forecast = {
  id: number;
  entity_type: string;
  entity_key: string;
  metric_name: string;
  horizon: string;
  predicted_value: number;
  created_at: string;
};

type Detail =
  | { kind: "insight"; item: Insight }
  | { kind: "anomaly"; item: Anomaly }
  | { kind: "rec"; item: Rec }
  | { kind: "forecast"; item: Forecast };

const SEVERITY_COLORS: Record<string, string> = {
  high: "#E85D4C",
  warning: "#E0A100",
  medium: "#E0A100",
  low: "#2D7FF9",
  info: "#1F9D6C",
};

const ACTION_COLORS: Record<string, string> = {
  increase: "#1F9D6C",
  decrease: "#E0A100",
  pause: "#E85D4C",
  hold: "#2D7FF9",
};

function severityColor(s: string) {
  return SEVERITY_COLORS[s?.toLowerCase()] || "#0A3D4A";
}

function parseEntityLink(entityKey: string): { type: string; path?: string; label: string } {
  if (entityKey.startsWith("campaign:")) {
    const id = entityKey.split(":")[1];
    return { type: "campaign", path: `/campaigns/${id}`, label: `Campaign #${id}` };
  }
  if (entityKey.startsWith("country:")) {
    const code = entityKey.split(":")[1];
    return { type: "country", path: "/countries", label: `Country ${code}` };
  }
  return { type: "entity", label: entityKey };
}

export default function InsightsPage() {
  const navigate = useNavigate();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [recs, setRecs] = useState<Rec[]>([]);
  const [forecasts, setForecasts] = useState<Forecast[]>([]);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [tab, setTab] = useState(0);
  const [severity, setSeverity] = useState<string>("all");
  const [category, setCategory] = useState<string>("all");
  const [action, setAction] = useState<string>("all");
  const [metric, setMetric] = useState<string>("all");
  const [sort, setSort] = useState<"newest" | "severity" | "impact">("newest");
  const [detail, setDetail] = useState<Detail | null>(null);
  const [saved, setSaved] = useState<Set<string>>(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem("aimp_saved_insights") || "[]"));
    } catch {
      return new Set();
    }
  });
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem("aimp_dismissed_insights") || "[]"));
    } catch {
      return new Set();
    }
  });
  const [showSavedOnly, setShowSavedOnly] = useState(false);

  async function load() {
    const [i, a, r, f] = await Promise.all([
      api.get("/api/insights"),
      api.get("/api/anomalies"),
      api.get("/api/recommendations"),
      api.get("/api/forecasts"),
    ]);
    setInsights(i.data);
    setAnomalies(a.data);
    setRecs(r.data);
    setForecasts(f.data);
  }

  useEffect(() => {
    load().catch(() => setError("Failed to load insights"));
  }, []);

  useEffect(() => {
    localStorage.setItem("aimp_saved_insights", JSON.stringify([...saved]));
  }, [saved]);

  useEffect(() => {
    localStorage.setItem("aimp_dismissed_insights", JSON.stringify([...dismissed]));
  }, [dismissed]);

  async function regenerate() {
    setMsg("");
    try {
      await api.post("/api/ai/regenerate");
      await load();
      setMsg("Intelligence regenerated — filters preserved.");
    } catch {
      setMsg("Regenerate failed.");
    }
  }

  const categories = useMemo(
    () => ["all", ...Array.from(new Set(insights.map((i) => i.category))).sort()],
    [insights]
  );
  const metrics = useMemo(
    () => ["all", ...Array.from(new Set(anomalies.map((a) => a.metric_name))).sort()],
    [anomalies]
  );
  const actions = useMemo(
    () => ["all", ...Array.from(new Set(recs.map((r) => r.action))).sort()],
    [recs]
  );

  const severityRank: Record<string, number> = {
    high: 3,
    warning: 2,
    medium: 2,
    low: 1,
    info: 0,
  };

  const filteredInsights = useMemo(() => {
    let rows = insights.filter((i) => !dismissed.has(`insight:${i.id}`));
    if (showSavedOnly) rows = rows.filter((i) => saved.has(`insight:${i.id}`));
    if (severity !== "all") rows = rows.filter((i) => i.severity === severity);
    if (category !== "all") rows = rows.filter((i) => i.category === category);
    if (sort === "severity") {
      rows = [...rows].sort(
        (a, b) => (severityRank[b.severity] || 0) - (severityRank[a.severity] || 0)
      );
    } else {
      rows = [...rows].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }
    return rows;
  }, [insights, severity, category, sort, saved, dismissed, showSavedOnly]);

  const filteredAnomalies = useMemo(() => {
    let rows = anomalies.filter((a) => !dismissed.has(`anomaly:${a.id}`));
    if (showSavedOnly) rows = rows.filter((a) => saved.has(`anomaly:${a.id}`));
    if (severity !== "all") rows = rows.filter((a) => a.severity === severity);
    if (metric !== "all") rows = rows.filter((a) => a.metric_name === metric);
    if (sort === "impact") {
      rows = [...rows].sort((a, b) => Math.abs(b.change_pct) - Math.abs(a.change_pct));
    } else if (sort === "severity") {
      rows = [...rows].sort(
        (a, b) => (severityRank[b.severity] || 0) - (severityRank[a.severity] || 0)
      );
    } else {
      rows = [...rows].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }
    return rows;
  }, [anomalies, severity, metric, sort, saved, dismissed, showSavedOnly]);

  const filteredRecs = useMemo(() => {
    let rows = recs.filter((r) => !dismissed.has(`rec:${r.id}`));
    if (showSavedOnly) rows = rows.filter((r) => saved.has(`rec:${r.id}`));
    if (action !== "all") rows = rows.filter((r) => r.action === action);
    if (severity !== "all") {
      // map priority ~ severity filter for recs
      rows = rows.filter((r) => r.priority === severity || (severity === "warning" && r.priority === "medium"));
    }
    return rows;
  }, [recs, action, severity, saved, dismissed, showSavedOnly]);

  const filteredForecasts = useMemo(() => {
    let rows = forecasts.filter((f) => !dismissed.has(`forecast:${f.id}`));
    if (showSavedOnly) rows = rows.filter((f) => saved.has(`forecast:${f.id}`));
    if (metric !== "all") rows = rows.filter((f) => f.metric_name === metric);
    return rows.slice(0, 40);
  }, [forecasts, metric, saved, dismissed, showSavedOnly]);

  const anomalyChart = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const a of anomalies) {
      counts[a.severity] = (counts[a.severity] || 0) + 1;
    }
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [anomalies]);

  const metricChart = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const a of anomalies) {
      counts[a.metric_name] = (counts[a.metric_name] || 0) + 1;
    }
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [anomalies]);

  const actionChart = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of recs) {
      counts[r.action] = (counts[r.action] || 0) + 1;
    }
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [recs]);

  function toggleSaved(key: string) {
    setSaved((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function dismiss(key: string) {
    setDismissed((prev) => new Set(prev).add(key));
    setDetail(null);
  }

  function askAbout(question: string) {
    navigate("/chat", { state: { prefill: question } });
  }

  const counts = {
    insights: filteredInsights.length,
    anomalies: filteredAnomalies.length,
    recs: filteredRecs.length,
    forecasts: filteredForecasts.length,
    high: anomalies.filter((a) => a.severity === "high").length,
    saved: saved.size,
  };

  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <>
      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", md: "center" }}
        spacing={2}
        sx={{ mb: 2 }}
      >
        <Box>
          <Typography variant="h4">AI Insights</Typography>
          <Typography color="text.secondary">
            Interactive risks, opportunities, anomalies, forecasts, and budget actions.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            variant={showSavedOnly ? "contained" : "outlined"}
            onClick={() => setShowSavedOnly((v) => !v)}
          >
            Saved ({counts.saved})
          </Button>
          <Button
            variant="outlined"
            onClick={() => {
              setDismissed(new Set());
              setMsg("Dismissed items restored.");
            }}
          >
            Restore dismissed
          </Button>
          <Button variant="contained" onClick={regenerate}>
            Regenerate
          </Button>
        </Stack>
      </Stack>

      {msg && (
        <Alert severity="info" sx={{ mb: 2 }} onClose={() => setMsg("")}>
          {msg}
        </Alert>
      )}

      <Grid container spacing={2} sx={{ mb: 2 }}>
        {[
          { label: "Insights", value: counts.insights, color: "#0A3D4A", tabIdx: 0 },
          { label: "Anomalies", value: counts.anomalies, color: "#E85D4C", tabIdx: 1 },
          { label: "High severity", value: counts.high, color: "#C44536", tabIdx: 1, filter: "high" },
          { label: "Recommendations", value: counts.recs, color: "#1F9D6C", tabIdx: 2 },
          { label: "Forecasts", value: counts.forecasts, color: "#2D7FF9", tabIdx: 3 },
        ].map((c) => (
          <Grid item xs={6} sm={4} md key={c.label}>
            <Paper
              elevation={0}
              onClick={() => {
                setTab(c.tabIdx);
                if (c.filter) setSeverity(c.filter);
              }}
              sx={{
                p: 2,
                borderRadius: 3,
                cursor: "pointer",
                color: "#fff",
                background: `linear-gradient(135deg, ${c.color}, ${c.color}cc)`,
                transition: "transform 160ms ease",
                "&:hover": { transform: "translateY(-2px)" },
              }}
            >
              <Typography variant="caption" sx={{ opacity: 0.9 }}>
                {c.label}
              </Typography>
              <Typography variant="h4" fontWeight={700}>
                {c.value}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Paper elevation={0} sx={{ p: 2, mb: 2, borderRadius: 3, border: "1px solid #d7e6ee" }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }}>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={severity}
            onChange={(_, v) => v && setSeverity(v)}
          >
            {["all", "high", "medium", "low", "info", "warning"].map((s) => (
              <ToggleButton key={s} value={s}>
                {s}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Category</InputLabel>
            <Select label="Category" value={category} onChange={(e) => setCategory(e.target.value)}>
              {categories.map((c) => (
                <MenuItem key={c} value={c}>
                  {c}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Metric</InputLabel>
            <Select label="Metric" value={metric} onChange={(e) => setMetric(e.target.value)}>
              {metrics.map((m) => (
                <MenuItem key={m} value={m}>
                  {m}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Action</InputLabel>
            <Select label="Action" value={action} onChange={(e) => setAction(e.target.value)}>
              {actions.map((a) => (
                <MenuItem key={a} value={a}>
                  {a}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Sort</InputLabel>
            <Select
              label="Sort"
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
            >
              <MenuItem value="newest">Newest</MenuItem>
              <MenuItem value="severity">Severity</MenuItem>
              <MenuItem value="impact">Impact %</MenuItem>
            </Select>
          </FormControl>
          <Button
            size="small"
            onClick={() => {
              setSeverity("all");
              setCategory("all");
              setMetric("all");
              setAction("all");
              setSort("newest");
              setShowSavedOnly(false);
            }}
          >
            Reset filters
          </Button>
        </Stack>
      </Paper>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={4}>
          <Paper elevation={0} sx={{ p: 2, height: 220, borderRadius: 3, border: "1px solid #d7e6ee" }}>
            <Typography variant="subtitle2" gutterBottom>
              Anomaly severity mix
            </Typography>
            <ResponsiveContainer width="100%" height="85%">
              <PieChart>
                <Pie data={anomalyChart} dataKey="value" nameKey="name" innerRadius={40} outerRadius={70}>
                  {anomalyChart.map((d, i) => (
                    <Cell key={i} fill={severityColor(d.name)} />
                  ))}
                </Pie>
                <ReTooltip />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper elevation={0} sx={{ p: 2, height: 220, borderRadius: 3, border: "1px solid #d7e6ee" }}>
            <Typography variant="subtitle2" gutterBottom>
              Anomalies by metric
            </Typography>
            <ResponsiveContainer width="100%" height="85%">
              <BarChart data={metricChart}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <ReTooltip />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {metricChart.map((_, i) => (
                    <Cell key={i} fill={["#E85D4C", "#2D7FF9", "#1F9D6C", "#E0A100", "#0A3D4A", "#0891B2"][i % 6]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper elevation={0} sx={{ p: 2, height: 220, borderRadius: 3, border: "1px solid #d7e6ee" }}>
            <Typography variant="subtitle2" gutterBottom>
              Recommendation actions
            </Typography>
            <ResponsiveContainer width="100%" height="85%">
              <BarChart data={actionChart}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <ReTooltip />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {actionChart.map((d, i) => (
                    <Cell key={i} fill={ACTION_COLORS[d.name] || "#0A3D4A"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid #d7e6ee" }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ px: 1, borderBottom: "1px solid #e6eef3" }}
        >
          <Tab label={`Insights (${filteredInsights.length})`} />
          <Tab label={`Anomalies (${filteredAnomalies.length})`} />
          <Tab label={`Recommendations (${filteredRecs.length})`} />
          <Tab label={`Forecasts (${filteredForecasts.length})`} />
        </Tabs>

        <Box sx={{ p: 2, maxHeight: 520, overflow: "auto" }}>
          {tab === 0 && (
            <Grid container spacing={1.5}>
              {filteredInsights.map((i) => {
                const key = `insight:${i.id}`;
                return (
                  <Grid item xs={12} md={6} key={i.id}>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 2,
                        cursor: "pointer",
                        borderLeft: `5px solid ${severityColor(i.severity)}`,
                        "&:hover": { bgcolor: "#F3FAFF" },
                      }}
                      onClick={() => setDetail({ kind: "insight", item: i })}
                    >
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                        <Chip size="small" label={i.category} color="primary" variant="outlined" />
                        <Chip size="small" label={i.severity} sx={{ bgcolor: `${severityColor(i.severity)}22` }} />
                        {saved.has(key) && <Chip size="small" label="saved" color="success" />}
                      </Stack>
                      <Typography fontWeight={700}>{i.title}</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {i.body.slice(0, 160)}
                        {i.body.length > 160 ? "…" : ""}
                      </Typography>
                    </Paper>
                  </Grid>
                );
              })}
              {!filteredInsights.length && <Typography color="text.secondary">No insights match filters.</Typography>}
            </Grid>
          )}

          {tab === 1 && (
            <Stack spacing={1.2}>
              {filteredAnomalies.map((a) => {
                const key = `anomaly:${a.id}`;
                const link = parseEntityLink(a.entity_key);
                return (
                  <Paper
                    key={a.id}
                    variant="outlined"
                    sx={{
                      p: 1.8,
                      cursor: "pointer",
                      borderLeft: `5px solid ${severityColor(a.severity)}`,
                      "&:hover": { bgcolor: "#FFF8F6" },
                    }}
                    onClick={() => setDetail({ kind: "anomaly", item: a })}
                  >
                    <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                        <Chip size="small" label={a.severity} sx={{ bgcolor: severityColor(a.severity), color: "#fff" }} />
                        <Chip size="small" label={a.metric_name} variant="outlined" />
                        <Chip size="small" label={`${a.change_pct > 0 ? "+" : ""}${a.change_pct}%`} />
                        <Chip size="small" label={link.label} variant="outlined" />
                        {saved.has(key) && <Chip size="small" color="success" label="saved" />}
                      </Stack>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(a.created_at).toLocaleString()}
                      </Typography>
                    </Stack>
                    <Typography sx={{ mt: 1 }}>{a.message}</Typography>
                  </Paper>
                );
              })}
              {!filteredAnomalies.length && <Typography color="text.secondary">No anomalies match filters.</Typography>}
            </Stack>
          )}

          {tab === 2 && (
            <Grid container spacing={1.5}>
              {filteredRecs.map((r) => {
                const key = `rec:${r.id}`;
                return (
                  <Grid item xs={12} md={6} key={r.id}>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 2,
                        cursor: "pointer",
                        borderLeft: `5px solid ${ACTION_COLORS[r.action] || "#0A3D4A"}`,
                        "&:hover": { bgcolor: "#F4FFF8" },
                      }}
                      onClick={() => setDetail({ kind: "rec", item: r })}
                    >
                      <Stack direction="row" spacing={1} sx={{ mb: 0.5 }}>
                        <Chip
                          size="small"
                          label={r.action.toUpperCase()}
                          sx={{ bgcolor: ACTION_COLORS[r.action] || "#0A3D4A", color: "#fff" }}
                        />
                        <Chip size="small" label={r.priority} variant="outlined" />
                        {saved.has(key) && <Chip size="small" color="success" label="saved" />}
                      </Stack>
                      <Typography fontWeight={700}>{r.target}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {r.rationale}
                      </Typography>
                    </Paper>
                  </Grid>
                );
              })}
              {!filteredRecs.length && <Typography color="text.secondary">No recommendations match filters.</Typography>}
            </Grid>
          )}

          {tab === 3 && (
            <Grid container spacing={1.5}>
              {filteredForecasts.map((f) => {
                const key = `forecast:${f.id}`;
                const link = parseEntityLink(f.entity_key);
                return (
                  <Grid item xs={12} sm={6} md={4} key={f.id}>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 2,
                        cursor: "pointer",
                        background: "linear-gradient(180deg,#fff,#F3FAFF)",
                        "&:hover": { boxShadow: "0 8px 20px rgba(45,127,249,0.15)" },
                      }}
                      onClick={() => setDetail({ kind: "forecast", item: f })}
                    >
                      <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                        <Chip size="small" label={f.horizon} color="info" />
                        <Chip size="small" label={f.metric_name} variant="outlined" />
                        {saved.has(key) && <Chip size="small" color="success" label="saved" />}
                      </Stack>
                      <Typography variant="h5" fontWeight={700} color="#2D7FF9">
                        ${f.predicted_value.toLocaleString()}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {link.label}
                      </Typography>
                    </Paper>
                  </Grid>
                );
              })}
              {!filteredForecasts.length && <Typography color="text.secondary">No forecasts match filters.</Typography>}
            </Grid>
          )}
        </Box>
      </Paper>

      <Drawer anchor="right" open={!!detail} onClose={() => setDetail(null)}>
        <Box sx={{ width: { xs: 320, sm: 420 }, p: 3 }}>
          {!detail ? null : (
            <>
              <Typography variant="overline" color="text.secondary">
                {detail.kind} detail
              </Typography>
              {detail.kind === "insight" && (
                <>
                  <Typography variant="h5" sx={{ mb: 1 }}>
                    {detail.item.title}
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                    <Chip label={detail.item.category} />
                    <Chip label={detail.item.severity} sx={{ bgcolor: `${severityColor(detail.item.severity)}22` }} />
                  </Stack>
                  <Typography sx={{ lineHeight: 1.7 }}>{detail.item.body}</Typography>
                  <Divider sx={{ my: 2 }} />
                  <Stack spacing={1}>
                    <Button
                      variant="contained"
                      onClick={() => askAbout(`Explain this insight: ${detail.item.title}. ${detail.item.body}`)}
                    >
                      Ask AI about this
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => toggleSaved(`insight:${detail.item.id}`)}
                    >
                      {saved.has(`insight:${detail.item.id}`) ? "Unsave" : "Save for later"}
                    </Button>
                    <Button color="warning" onClick={() => dismiss(`insight:${detail.item.id}`)}>
                      Dismiss
                    </Button>
                  </Stack>
                </>
              )}
              {detail.kind === "anomaly" && (
                <>
                  <Typography variant="h5" sx={{ mb: 1 }}>
                    {detail.item.metric_name} anomaly
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
                    <Chip label={detail.item.severity} sx={{ bgcolor: severityColor(detail.item.severity), color: "#fff" }} />
                    <Chip label={`${detail.item.change_pct > 0 ? "+" : ""}${detail.item.change_pct}%`} />
                    <Chip label={detail.item.entity_key} variant="outlined" />
                  </Stack>
                  <Typography sx={{ lineHeight: 1.7, mb: 2 }}>{detail.item.message}</Typography>
                  {(() => {
                    const link = parseEntityLink(detail.item.entity_key);
                    return link.path ? (
                      <Button sx={{ mb: 1 }} onClick={() => navigate(link.path!)}>
                        Open {link.label}
                      </Button>
                    ) : null;
                  })()}
                  <Divider sx={{ my: 2 }} />
                  <Stack spacing={1}>
                    <Button
                      variant="contained"
                      onClick={() =>
                        askAbout(
                          `Why did ${detail.item.metric_name} change ${detail.item.change_pct}% on ${detail.item.entity_key}?`
                        )
                      }
                    >
                      Ask AI about this
                    </Button>
                    <Button variant="outlined" onClick={() => toggleSaved(`anomaly:${detail.item.id}`)}>
                      {saved.has(`anomaly:${detail.item.id}`) ? "Unsave" : "Save for later"}
                    </Button>
                    <Button color="warning" onClick={() => dismiss(`anomaly:${detail.item.id}`)}>
                      Dismiss
                    </Button>
                  </Stack>
                </>
              )}
              {detail.kind === "rec" && (
                <>
                  <Typography variant="h5" sx={{ mb: 1 }}>
                    {detail.item.action.toUpperCase()} · {detail.item.target}
                  </Typography>
                  <Chip
                    label={detail.item.priority}
                    sx={{ mb: 2, bgcolor: ACTION_COLORS[detail.item.action] || "#0A3D4A", color: "#fff" }}
                  />
                  <Typography sx={{ lineHeight: 1.7 }}>{detail.item.rationale}</Typography>
                  <Divider sx={{ my: 2 }} />
                  <Stack spacing={1}>
                    <Button
                      variant="contained"
                      onClick={() =>
                        askAbout(
                          `Should we ${detail.item.action} budget on ${detail.item.target}? ${detail.item.rationale}`
                        )
                      }
                    >
                      Ask AI about this action
                    </Button>
                    <Button onClick={() => navigate("/campaigns")}>Browse campaigns</Button>
                    <Button variant="outlined" onClick={() => toggleSaved(`rec:${detail.item.id}`)}>
                      {saved.has(`rec:${detail.item.id}`) ? "Unsave" : "Save for later"}
                    </Button>
                    <Button color="warning" onClick={() => dismiss(`rec:${detail.item.id}`)}>
                      Dismiss
                    </Button>
                  </Stack>
                </>
              )}
              {detail.kind === "forecast" && (
                <>
                  <Typography variant="h5" sx={{ mb: 1 }}>
                    {detail.item.horizon} forecast
                  </Typography>
                  <Typography variant="h3" color="#2D7FF9" fontWeight={700}>
                    ${detail.item.predicted_value.toLocaleString()}
                  </Typography>
                  <Typography color="text.secondary" sx={{ mb: 2 }}>
                    {detail.item.metric_name} · {detail.item.entity_key}
                  </Typography>
                  {(() => {
                    const link = parseEntityLink(detail.item.entity_key);
                    return link.path ? (
                      <Button sx={{ mb: 1 }} onClick={() => navigate(link.path!)}>
                        Open {link.label}
                      </Button>
                    ) : null;
                  })()}
                  <Divider sx={{ my: 2 }} />
                  <Stack spacing={1}>
                    <Button
                      variant="contained"
                      onClick={() =>
                        askAbout(
                          `Explain the ${detail.item.horizon} ${detail.item.metric_name} forecast of $${detail.item.predicted_value} for ${detail.item.entity_key}`
                        )
                      }
                    >
                      Ask AI about this forecast
                    </Button>
                    <Button variant="outlined" onClick={() => toggleSaved(`forecast:${detail.item.id}`)}>
                      {saved.has(`forecast:${detail.item.id}`) ? "Unsave" : "Save for later"}
                    </Button>
                    <Button color="warning" onClick={() => dismiss(`forecast:${detail.item.id}`)}>
                      Dismiss
                    </Button>
                  </Stack>
                </>
              )}
              <Button fullWidth sx={{ mt: 2 }} onClick={() => setDetail(null)}>
                Close
              </Button>
            </>
          )}
        </Box>
      </Drawer>
    </>
  );
}
