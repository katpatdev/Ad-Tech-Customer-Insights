import { Outlet, NavLink, useNavigate } from "react-router-dom";
import {
  AppBar,
  Box,
  Button,
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  Toolbar,
  Typography,
  Chip,
} from "@mui/material";
import { useAuth } from "../auth/AuthContext";

const width = 240;

const links = [
  { to: "/", label: "Executive", roles: ["admin", "agency_manager", "analyst", "guest"] },
  { to: "/campaigns", label: "Campaigns", roles: ["admin", "agency_manager", "analyst", "guest"] },
  { to: "/countries", label: "Countries", roles: ["admin", "agency_manager", "analyst"] },
  { to: "/platforms", label: "Platforms", roles: ["admin", "agency_manager", "analyst"] },
  { to: "/insights", label: "AI Insights", roles: ["admin", "agency_manager", "analyst"] },
  { to: "/chat", label: "AI Chat", roles: ["admin", "agency_manager", "analyst"] },
  { to: "/admin", label: "Admin", roles: ["admin", "agency_manager"] },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          zIndex: (t) => t.zIndex.drawer + 1,
          bgcolor: "#0B3D2E",
          backgroundImage:
            "linear-gradient(120deg, #0B3D2E 0%, #145C45 55%, #1F6F54 100%)",
        }}
      >
        <Toolbar sx={{ gap: 2 }}>
          <Typography variant="h6" sx={{ flexGrow: 1, letterSpacing: 0.4 }}>
            AIMP
          </Typography>
          <Chip
            size="small"
            label={`${user?.tenant_name} · ${user?.role}`}
            sx={{ bgcolor: "rgba(255,255,255,0.15)", color: "#fff" }}
          />
          <Button
            color="inherit"
            onClick={() => {
              logout();
              navigate("/login");
            }}
          >
            Logout
          </Button>
        </Toolbar>
      </AppBar>
      <Drawer
        variant="permanent"
        sx={{
          width,
          [`& .MuiDrawer-paper`]: {
            width,
            boxSizing: "border-box",
            borderRight: "1px solid #ddd6c8",
            bgcolor: "#FFFcf7",
          },
        }}
      >
        <Toolbar />
        <List sx={{ px: 1, pt: 2 }}>
          {links
            .filter((l) => user && l.roles.includes(user.role))
            .map((l) => (
              <ListItemButton
                key={l.to}
                component={NavLink}
                to={l.to}
                end={l.to === "/"}
                sx={{
                  borderRadius: 2,
                  mb: 0.5,
                  "&.active": { bgcolor: "rgba(11,61,46,0.1)", color: "#0B3D2E" },
                }}
              >
                <ListItemText primary={l.label} />
              </ListItemButton>
            ))}
        </List>
      </Drawer>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          mt: 8,
          background:
            "radial-gradient(circle at top right, rgba(196,92,38,0.08), transparent 40%), linear-gradient(180deg, #F3F0E8 0%, #E9E4D8 100%)",
          minHeight: "100vh",
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}
