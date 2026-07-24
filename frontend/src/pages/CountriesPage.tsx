import { useEffect, useState } from "react";
import { Alert, Box, Grid, Paper, Typography } from "@mui/material";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import { api } from "../api/client";

type Country = {
  code: string;
  name: string;
  lat: number;
  lng: number;
  spend: number;
  revenue: number;
  conversions: number;
  roas: number;
  ctr: number;
};

export default function CountriesPage() {
  const [rows, setRows] = useState<Country[]>([]);
  const [selected, setSelected] = useState<Country | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/api/countries")
      .then((r) => {
        setRows(r.data);
        setSelected(r.data[0] || null);
      })
      .catch(() => setError("Failed to load countries"));
  }, []);

  if (error) return <Alert severity="error">{error}</Alert>;
  const maxSpend = Math.max(...rows.map((r) => r.spend), 1);

  return (
    <>
      <Typography variant="h4" gutterBottom>
        Country Dashboard
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        Asia performance map — click a market for the detailed rollup.
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={7}>
          <Paper sx={{ height: 480, overflow: "hidden" }}>
            <MapContainer center={[20, 110]} zoom={3} style={{ height: "100%", width: "100%" }}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {rows.map((c) => (
                <CircleMarker
                  key={c.code}
                  center={[c.lat, c.lng]}
                  radius={8 + (c.spend / maxSpend) * 18}
                  pathOptions={{
                    color: selected?.code === c.code ? "#C45C26" : "#0B3D2E",
                    fillColor: selected?.code === c.code ? "#C45C26" : "#1F6F54",
                    fillOpacity: 0.7,
                  }}
                  eventHandlers={{ click: () => setSelected(c) }}
                >
                  <Popup>
                    <strong>{c.name}</strong>
                    <br />
                    Spend ${c.spend.toLocaleString()}
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          </Paper>
        </Grid>
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 2.5, minHeight: 480 }}>
            {selected ? (
              <Box>
                <Typography variant="h5">{selected.name}</Typography>
                <Typography color="text.secondary" sx={{ mb: 2 }}>
                  {selected.code}
                </Typography>
                {[
                  ["Spend", `$${selected.spend.toLocaleString()}`],
                  ["Revenue", `$${selected.revenue.toLocaleString()}`],
                  ["ROAS", selected.roas.toFixed(2)],
                  ["CTR", `${(selected.ctr * 100).toFixed(2)}%`],
                  ["Conversions", selected.conversions.toLocaleString()],
                ].map(([k, v]) => (
                  <Box key={k as string} sx={{ display: "flex", justifyContent: "space-between", py: 1, borderBottom: "1px solid #eee" }}>
                    <Typography color="text.secondary">{k}</Typography>
                    <Typography fontWeight={600}>{v}</Typography>
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography>Select a country</Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </>
  );
}
