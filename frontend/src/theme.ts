import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#0A3D4A", light: "#1A6B7C", dark: "#062830" },
    secondary: { main: "#E85D4C", light: "#FF8A7A", dark: "#C44536" },
    background: { default: "#EEF4F7", paper: "#FFFFFF" },
    text: { primary: "#0F1C24", secondary: "#5A6B75" },
    success: { main: "#1F9D6C" },
    warning: { main: "#E0A100" },
    error: { main: "#D64545" },
    info: { main: "#2D7FF9" },
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
  shape: { borderRadius: 12 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { textTransform: "none", fontWeight: 600 },
      },
    },
  },
});

export const brand = {
  name: "AIMP",
  fullName: "AI Marketing Intelligence Platform",
  tagline: "One intelligence layer for Asia campaigns",
};
