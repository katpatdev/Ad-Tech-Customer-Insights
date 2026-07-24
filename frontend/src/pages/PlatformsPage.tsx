import { useEffect, useState } from "react";
import { Alert, Paper, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "../api/client";

export default function PlatformsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/api/platforms")
      .then((r) => setRows(r.data))
      .catch(() => setError("Failed to load platforms"));
  }, []);

  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <>
      <Typography variant="h4" gutterBottom>
        Platform Dashboard
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        Google Ads, Meta, TikTok, LinkedIn, Shopify, and more.
      </Typography>
      <Paper sx={{ p: 2, height: 320, mb: 2 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="roas" fill="#0B3D2E" name="ROAS" />
          </BarChart>
        </ResponsiveContainer>
      </Paper>
      <Paper>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Platform</TableCell>
              <TableCell>Spend</TableCell>
              <TableCell>Revenue</TableCell>
              <TableCell>ROAS</TableCell>
              <TableCell>CTR</TableCell>
              <TableCell>Conversions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.code}>
                <TableCell>{r.name}</TableCell>
                <TableCell>${r.spend.toLocaleString()}</TableCell>
                <TableCell>${r.revenue.toLocaleString()}</TableCell>
                <TableCell>{r.roas.toFixed(2)}</TableCell>
                <TableCell>{(r.ctr * 100).toFixed(2)}%</TableCell>
                <TableCell>{r.conversions}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </>
  );
}
