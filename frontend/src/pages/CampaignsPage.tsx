import { useEffect, useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Alert,
  Chip,
  Link,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  createColumnHelper,
} from "@tanstack/react-table";
import { api } from "../api/client";

type Campaign = {
  id: number;
  name: string;
  status: string;
  budget_usd: number;
  platform: string;
  spend: number;
  revenue: number;
  conversions: number;
  ctr: number;
  roas: number;
  health_score: number;
};

const col = createColumnHelper<Campaign>();

export default function CampaignsPage() {
  const [rows, setRows] = useState<Campaign[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/api/campaigns")
      .then((r) => setRows(r.data))
      .catch(() => setError("Failed to load campaigns"));
  }, []);

  const columns = useMemo(
    () => [
      col.accessor("name", {
        header: "Campaign",
        cell: (info) => (
          <Link component={RouterLink} to={`/campaigns/${info.row.original.id}`}>
            {info.getValue()}
          </Link>
        ),
      }),
      col.accessor("platform", { header: "Platform" }),
      col.accessor("spend", {
        header: "Spend",
        cell: (i) => `$${i.getValue().toLocaleString()}`,
      }),
      col.accessor("revenue", {
        header: "Revenue",
        cell: (i) => `$${i.getValue().toLocaleString()}`,
      }),
      col.accessor("roas", {
        header: "ROAS",
        cell: (i) => i.getValue().toFixed(2),
      }),
      col.accessor("ctr", {
        header: "CTR",
        cell: (i) => `${(i.getValue() * 100).toFixed(2)}%`,
      }),
      col.accessor("health_score", {
        header: "Health",
        cell: (i) => {
          const v = i.getValue();
          const color = v >= 70 ? "success" : v >= 45 ? "warning" : "error";
          return <Chip size="small" color={color as any} label={v.toFixed(0)} />;
        },
      }),
    ],
    []
  );

  const table = useReactTable({ data: rows, columns, getCoreRowModel: getCoreRowModel() });

  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <>
      <Typography variant="h4" gutterBottom>
        Campaigns
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        Performance, budget, and campaign health across channels.
      </Typography>
      <Paper>
        <Table size="small">
          <TableHead>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((h) => (
                  <TableCell key={h.id}>{flexRender(h.column.columnDef.header, h.getContext())}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableHead>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id} hover>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </>
  );
}
