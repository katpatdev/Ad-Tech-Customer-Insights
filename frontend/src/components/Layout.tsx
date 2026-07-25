import { Outlet, NavLink, useNavigate } from "react-router-dom";
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  Toolbar,
  Typography,
  Chip,
  Stack,
} from "@mui/material";
import { useAuth } from "../auth/AuthContext";
import { brand } from "../theme";

const width = 260;

const links = [
  { to: "/", label: "Executive", roles: ["admin", "agency_manager", "analyst", "guest"] },
  { to: "/campaigns", label: "Campaigns", roles: ["admin", "agency_manager", "analyst", "guest"] },
  { to: "/countries", label: "Countries", roles: ["admin", "agency_manager", "analyst"] },
  { to: "/platforms", label: "Platforms", roles: ["admin", "agency_manager", "analyst"] },
  { to: "/insights", label: "AI Insights", roles: ["admin", "agency_manager", "analyst"] },
  { to: "/simulator", label: "Budget Simulator", roles: ["admin", "agency_manager", "analyst"] },
  { to: "/chat", label: "AI Chat", roles: ["admin", "agency_manager", "analyst"] },
  { to: "/admin", label: "Admin", roles: ["admin", "agency_manager"] },
];

function roleLabel(role?: string) {
  if (!role) return "";
  return role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function companyInitials(name?: string) {
  if (!name) return "CO";
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isNova = user?.tenant_name?.toLowerCase().includes("nova");
  const companyColor = isNova ? "#E85D4C" : "#1F9D6C";

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          zIndex: (t) => t.zIndex.drawer + 1,
          bgcolor: "#062830",
          backgroundImage:
            "linear-gradient(110deg, #062830 0%, #0A3D4A 45%, #1A6B7C 100%)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <Toolbar sx={{ gap: 2 }}>
          <Stack direction="row" alignItems="baseline" spacing={1.2} sx={{ flexGrow: 1 }}>
            <Typography
              variant="h5"
              sx={{ fontFamily: '"DM Sans", sans-serif', fontWeight: 700, letterSpacing: "-0.03em" }}
            >
              {brand.name}
            </Typography>
            <Typography
              variant="caption"
              sx={{ display: { xs: "none", sm: "block" }, opacity: 0.75, letterSpacing: 0.2 }}
            >
              {brand.fullName}
            </Typography>
          </Stack>

          <Chip
            avatar={
              <Avatar sx={{ bgcolor: companyColor, width: 28, height: 28, fontSize: 12, fontWeight: 700 }}>
                {companyInitials(user?.tenant_name)}
              </Avatar>
            }
            label={
              <Box sx={{ py: 0.2 }}>
                <Typography variant="caption" sx={{ display: "block", lineHeight: 1.1, fontWeight: 700, color: "#fff" }}>
                  {user?.tenant_name}
                </Typography>
                <Typography variant="caption" sx={{ display: "block", lineHeight: 1.1, opacity: 0.75, color: "#fff" }}>
                  {roleLabel(user?.role)}
                </Typography>
              </Box>
            }
            sx={{
              height: 42,
              bgcolor: "rgba(255,255,255,0.12)",
              border: "1px solid rgba(255,255,255,0.18)",
              "& .MuiChip-label": { px: 1.2 },
            }}
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
            borderRight: "1px solid #d5e2e8",
            bgcolor: "#F7FBFD",
          },
        }}
      >
        <Toolbar />
        <Box sx={{ px: 2, pt: 2.5, pb: 1 }}>
          <Box
            sx={{
              p: 1.8,
              borderRadius: 2.5,
              background: `linear-gradient(135deg, ${companyColor} 0%, ${isNova ? "#C44536" : "#0A3D4A"} 100%)`,
              color: "#fff",
            }}
          >
            <Typography variant="caption" sx={{ opacity: 0.85 }}>
              Company workspace
            </Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              {user?.tenant_name}
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.8 }}>
              Asia marketing portfolio
            </Typography>
          </Box>
        </Box>
        <List sx={{ px: 1.2, pt: 1 }}>
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
                  "&.active": {
                    bgcolor: "rgba(10,61,74,0.12)",
                    color: "#0A3D4A",
                    fontWeight: 700,
                  },
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
            "radial-gradient(circle at 90% 0%, rgba(45,127,249,0.12), transparent 35%), radial-gradient(circle at 10% 20%, rgba(232,93,76,0.08), transparent 30%), linear-gradient(180deg, #EEF4F7 0%, #E4EEF3 100%)",
          minHeight: "100vh",
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}
