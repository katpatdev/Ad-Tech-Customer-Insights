import { useEffect, useState } from "react";
import {
  Alert,
  Chip,
  Paper,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";

export default function AdminPage() {
  const { user } = useAuth();
  const [flags, setFlags] = useState<any[]>([]);
  const [connectors, setConnectors] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [f, c] = await Promise.all([
          api.get("/api/admin/feature-flags"),
          api.get("/api/admin/connectors"),
        ]);
        setFlags(f.data);
        setConnectors(c.data);
        if (user?.role === "admin") {
          const t = await api.get("/api/admin/tenants");
          setTenants(t.data);
        }
      } catch {
        setError("Failed to load admin data");
      }
    }
    load();
  }, [user]);

  async function toggleFlag(key: string, enabled: boolean) {
    if (user?.role !== "admin") return;
    const { data } = await api.patch(`/api/admin/feature-flags/${key}`, { enabled });
    setFlags((prev) => prev.map((f) => (f.key === key ? data : f)));
  }

  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <>
      <Typography variant="h4" gutterBottom>
        Admin
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        Feature flags, mock connectors, and tenant overview.
      </Typography>

      {user?.role === "admin" && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            Tenants
          </Typography>
          {tenants.map((t) => (
            <Chip key={t.id} label={`${t.name} (${t.slug})`} sx={{ mr: 1, mb: 1 }} />
          ))}
        </Paper>
      )}

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Feature flags
        </Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Key</TableCell>
              <TableCell>Enabled</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {flags.map((f) => (
              <TableRow key={f.id}>
                <TableCell>{f.key}</TableCell>
                <TableCell>
                  <Switch
                    checked={f.enabled}
                    disabled={user?.role !== "admin"}
                    onChange={(_, checked) => toggleFlag(f.key, checked)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Connectors (mock)
        </Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Platform</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Last sync</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {connectors.map((c) => (
              <TableRow key={c.id}>
                <TableCell>{c.platform_code}</TableCell>
                <TableCell>
                  <Chip size="small" color="success" label={c.status} />
                </TableCell>
                <TableCell>{c.last_sync_at ? new Date(c.last_sync_at).toLocaleString() : "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </>
  );
}
