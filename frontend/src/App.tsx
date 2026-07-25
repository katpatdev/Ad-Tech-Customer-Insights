import { Navigate, Route, Routes } from "react-router-dom";
import { CircularProgress, Box } from "@mui/material";
import { useAuth } from "./auth/AuthContext";
import Layout from "./components/Layout";
import LoginPage from "./pages/LoginPage";
import ExecutivePage from "./pages/ExecutivePage";
import CampaignsPage from "./pages/CampaignsPage";
import CampaignDetailPage from "./pages/CampaignDetailPage";
import CountriesPage from "./pages/CountriesPage";
import PlatformsPage from "./pages/PlatformsPage";
import InsightsPage from "./pages/InsightsPage";
import SimulatorPage from "./pages/SimulatorPage";
import ChatPage from "./pages/ChatPage";
import AdminPage from "./pages/AdminPage";

function Private({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <Box sx={{ display: "grid", placeItems: "center", minHeight: "60vh" }}>
        <CircularProgress />
      </Box>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role) && user.role !== "admin") {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <Private>
            <Layout />
          </Private>
        }
      >
        <Route index element={<ExecutivePage />} />
        <Route path="campaigns" element={<CampaignsPage />} />
        <Route path="campaigns/:id" element={<CampaignDetailPage />} />
        <Route
          path="countries"
          element={
            <Private roles={["agency_manager", "analyst", "admin"]}>
              <CountriesPage />
            </Private>
          }
        />
        <Route
          path="platforms"
          element={
            <Private roles={["agency_manager", "analyst", "admin"]}>
              <PlatformsPage />
            </Private>
          }
        />
        <Route
          path="insights"
          element={
            <Private roles={["agency_manager", "analyst", "admin"]}>
              <InsightsPage />
            </Private>
          }
        />
        <Route
          path="simulator"
          element={
            <Private roles={["agency_manager", "analyst", "admin"]}>
              <SimulatorPage />
            </Private>
          }
        />
        <Route
          path="chat"
          element={
            <Private roles={["agency_manager", "analyst", "admin"]}>
              <ChatPage />
            </Private>
          }
        />
        <Route
          path="admin"
          element={
            <Private roles={["admin", "agency_manager"]}>
              <AdminPage />
            </Private>
          }
        />
      </Route>
    </Routes>
  );
}
