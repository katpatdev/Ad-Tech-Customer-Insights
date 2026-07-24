import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#0B3D2E" },
    secondary: { main: "#C45C26" },
    background: { default: "#F3F0E8", paper: "#FFFcf7" },
    text: { primary: "#1A1F1C", secondary: "#4A5560" },
    success: { main: "#2F6B4F" },
    warning: { main: "#B7791F" },
    error: { main: "#A33B2B" },
  },
  typography: {
    fontFamily: '"IBM Plex Sans", "Segoe UI", sans-serif',
    h1: { fontFamily: '"DM Sans", sans-serif', fontWeight: 700 },
    h2: { fontFamily: '"DM Sans", sans-serif', fontWeight: 700 },
    h3: { fontFamily: '"DM Sans", sans-serif', fontWeight: 650 },
    h4: { fontFamily: '"DM Sans", sans-serif', fontWeight: 650 },
    h5: { fontFamily: '"DM Sans", sans-serif', fontWeight: 600 },
    h6: { fontFamily: '"DM Sans", sans-serif', fontWeight: 600 },
  },
  shape: { borderRadius: 10 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { textTransform: "none", fontWeight: 600 },
      },
    },
  },
});
