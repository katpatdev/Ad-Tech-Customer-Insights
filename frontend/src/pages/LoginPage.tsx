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
  Divider,
} from "@mui/material";
import { useAuth } from "../auth/AuthContext";

const demos = [
  { email: "manager@aimp.demo", label: "Agency Manager (Apex)" },
  { email: "analyst@aimp.demo", label: "Analyst (Apex)" },
  { email: "guest@aimp.demo", label: "Guest (Apex)" },
  { email: "manager@nova.demo", label: "Manager (Nova — other tenant)" },
  { email: "admin@aimp.demo", label: "Admin" },
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
        placeItems: "center",
        px: 2,
        background:
          "linear-gradient(135deg, #0B3D2E 0%, #1A5C44 40%, #C45C26 140%)",
      }}
    >
      <Paper sx={{ p: 4, width: "100%", maxWidth: 460, borderRadius: 3 }}>
        <Typography variant="h4" gutterBottom>
          AIMP
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          AI Marketing Intelligence Platform — Asia agency demo (rule-based AI, no API keys).
        </Typography>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Stack component="form" spacing={2} onSubmit={onSubmit}>
          <TextField label="Email" value={email} onChange={(e) => setEmail(e.target.value)} fullWidth />
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            fullWidth
          />
          <Button type="submit" variant="contained" size="large" disabled={busy}>
            Sign in
          </Button>
        </Stack>
        <Divider sx={{ my: 3 }} />
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Demo accounts (password: demo1234)
        </Typography>
        <Stack spacing={1}>
          {demos.map((d) => (
            <Button
              key={d.email}
              size="small"
              variant="outlined"
              onClick={() => {
                setEmail(d.email);
                setPassword("demo1234");
              }}
            >
              {d.label}
            </Button>
          ))}
        </Stack>
      </Paper>
    </Box>
  );
}
