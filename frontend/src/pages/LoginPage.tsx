import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Paper,
  Stack,
  TextField,
  Typography,
  Chip,
} from "@mui/material";
import { useAuth } from "../auth/AuthContext";
import { brand } from "../theme";

const demos = [
  { email: "manager@aimp.demo", label: "Apex Agency · Manager", color: "#1F9D6C" },
  { email: "analyst@aimp.demo", label: "Apex Agency · Analyst", color: "#2D7FF9" },
  { email: "guest@aimp.demo", label: "Apex Agency · Guest", color: "#E0A100" },
  { email: "manager@nova.demo", label: "Nova Digital · Manager", color: "#E85D4C" },
  { email: "admin@aimp.demo", label: "Platform Admin", color: "#0A3D4A" },
];

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("manager@aimp.demo");
  const [password, setPassword] = useState("demo1234");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(email, password);
      navigate("/");
    } catch {
      setError("Login failed. Use a demo account with password demo1234.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "1.15fr 0.85fr" },
        background:
          "radial-gradient(ellipse at 20% 20%, rgba(45,127,249,0.35), transparent 45%), radial-gradient(ellipse at 80% 10%, rgba(232,93,76,0.28), transparent 40%), linear-gradient(145deg, #062830 0%, #0A3D4A 42%, #145C6B 100%)",
      }}
    >
      <Box
        sx={{
          display: { xs: "none", md: "flex" },
          flexDirection: "column",
          justifyContent: "flex-end",
          p: 8,
          color: "#fff",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(180deg, transparent 35%, rgba(6,40,48,0.75) 100%)",
            pointerEvents: "none",
          }}
        />
        <Box sx={{ position: "relative", maxWidth: 520 }}>
          <Typography
            sx={{
              fontFamily: '"DM Sans", sans-serif',
              fontSize: { md: "4.5rem", lg: "5.5rem" },
              fontWeight: 700,
              lineHeight: 0.95,
              letterSpacing: "-0.04em",
              mb: 2,
            }}
          >
            {brand.name}
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 500, mb: 1.5, opacity: 0.95 }}>
            {brand.fullName}
          </Typography>
          <Typography sx={{ fontSize: "1.15rem", opacity: 0.8, maxWidth: 420, lineHeight: 1.6 }}>
            {brand.tagline}. Unify Meta, Google, TikTok and more — then act on
            rule-powered insights across Asia.
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 4 }}>
            {["Multi-tenant", "Asia markets", "No API keys"].map((t) => (
              <Chip
                key={t}
                label={t}
                sx={{ bgcolor: "rgba(255,255,255,0.14)", color: "#fff", fontWeight: 600 }}
              />
            ))}
          </Stack>
        </Box>
      </Box>

      <Box sx={{ display: "grid", placeItems: "center", p: { xs: 2.5, md: 4 } }}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, sm: 4 },
            width: "100%",
            maxWidth: 440,
            borderRadius: 3,
            border: "1px solid rgba(255,255,255,0.35)",
            bgcolor: "rgba(255,255,255,0.96)",
            backdropFilter: "blur(8px)",
          }}
        >
          <Box sx={{ display: { xs: "block", md: "none" }, mb: 2 }}>
            <Typography variant="h3" sx={{ letterSpacing: "-0.03em" }}>
              {brand.name}
            </Typography>
          </Box>
          <Typography variant="h5" gutterBottom>
            Sign in to your agency
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Access your company workspace — campaigns, countries, and AI briefings.
          </Typography>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Stack component="form" spacing={2} onSubmit={onSubmit}>
            <TextField
              label="Work email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
            />
            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
            />
            <Button type="submit" variant="contained" size="large" disabled={busy} sx={{ py: 1.2 }}>
              Enter workspace
            </Button>
          </Stack>

          <Typography variant="subtitle2" sx={{ mt: 3.5, mb: 1.2 }}>
            Demo companies — password <strong>demo1234</strong>
          </Typography>
          <Stack spacing={1}>
            {demos.map((d) => (
              <Button
                key={d.email}
                size="medium"
                variant="outlined"
                onClick={() => {
                  setEmail(d.email);
                  setPassword("demo1234");
                }}
                sx={{
                  justifyContent: "flex-start",
                  borderColor: `${d.color}55`,
                  color: d.color,
                  fontWeight: 600,
                  "&:hover": { borderColor: d.color, bgcolor: `${d.color}12` },
                }}
              >
                {d.label}
              </Button>
            ))}
          </Stack>
        </Paper>
      </Box>
    </Box>
  );
}
