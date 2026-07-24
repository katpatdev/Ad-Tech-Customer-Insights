import { FormEvent, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { api } from "../api/client";

type Msg = { role: "user" | "assistant"; text: string; sources?: string[] };

const suggestionGroups = [
  {
    title: "Portfolio",
    color: "#0A3D4A",
    items: [
      "Give me a portfolio overview",
      "What is our current ROAS?",
      "How much did we spend?",
      "Morning briefing summary",
    ],
  },
  {
    title: "Campaigns",
    color: "#1F9D6C",
    items: [
      "What is the best campaign?",
      "Why is a campaign losing money?",
      "Which campaign has the worst health?",
      "Which campaigns should we pause?",
      "Compare top campaigns by spend",
    ],
  },
  {
    title: "Countries",
    color: "#2D7FF9",
    items: [
      "Why did Japan underperform?",
      "How is India performing?",
      "Singapore spend vs conversions",
      "Which country should receive more budget?",
      "What is the best country by ROAS?",
      "How is South Korea doing?",
      "Indonesia performance snapshot",
    ],
  },
  {
    title: "Platforms",
    color: "#E85D4C",
    items: [
      "Compare Meta vs TikTok",
      "Compare Google Ads vs LinkedIn",
      "What is the best platform?",
      "How is TikTok performing?",
      "How is Meta performing?",
    ],
  },
  {
    title: "Actions & risks",
    color: "#E0A100",
    items: [
      "Where should we increase budget?",
      "Show top anomalies and risks",
      "What opportunities do we have?",
      "Forecast next week revenue",
      "What is CPA?",
      "What can you help with?",
    ],
  },
];

export default function ChatPage() {
  const location = useLocation();
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      role: "assistant",
      text: "Ask about portfolio KPIs, campaigns, Asia countries, platforms, budget moves, anomalies, or forecasts. Answers are rule-based over your tenant data — pick a suggested question below.",
    },
  ]);
  const [busy, setBusy] = useState(false);

  async function ask(question: string) {
    if (!question.trim()) return;
    setBusy(true);
    setMsgs((m) => [...m, { role: "user", text: question }]);
    setInput("");
    try {
      const { data } = await api.post("/api/ai/chat", { question });
      setMsgs((m) => [...m, { role: "assistant", text: data.answer, sources: data.sources }]);
    } catch {
      setMsgs((m) => [
        ...m,
        { role: "assistant", text: "Chat failed. Check permissions or feature flags." },
      ]);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    const prefill = (location.state as { prefill?: string } | null)?.prefill;
    if (prefill) {
      void ask(prefill);
      window.history.replaceState({}, document.title);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    ask(input);
  }

  return (
    <>
      <Typography variant="h4" gutterBottom>
        AI Chat
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        Rule-based Q&A across portfolio, campaigns, countries, platforms, and actions (no LLM keys).
      </Typography>

      <Stack spacing={1.5} sx={{ mb: 2 }}>
        {suggestionGroups.map((group) => (
          <Box key={group.title}>
            <Typography
              variant="caption"
              sx={{ fontWeight: 700, color: group.color, letterSpacing: 0.4 }}
            >
              {group.title}
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 0.6 }}>
              {group.items.map((s) => (
                <Chip
                  key={s}
                  label={s}
                  onClick={() => ask(s)}
                  clickable
                  disabled={busy}
                  sx={{
                    borderColor: `${group.color}55`,
                    color: group.color,
                    fontWeight: 600,
                    bgcolor: `${group.color}10`,
                    "&:hover": { bgcolor: `${group.color}22` },
                  }}
                  variant="outlined"
                />
              ))}
            </Stack>
          </Box>
        ))}
      </Stack>

      <Paper
        sx={{
          p: 2,
          minHeight: 420,
          mb: 2,
          display: "flex",
          flexDirection: "column",
          gap: 1.5,
          borderRadius: 3,
          border: "1px solid #d7e6ee",
        }}
      >
        {msgs.map((m, i) => (
          <Box
            key={i}
            sx={{
              alignSelf: m.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "85%",
              bgcolor: m.role === "user" ? "#0A3D4A" : "#F3FAFF",
              color: m.role === "user" ? "#fff" : "inherit",
              px: 2,
              py: 1.2,
              borderRadius: 2,
            }}
          >
            <Typography variant="body2">{m.text}</Typography>
            {m.sources && m.sources.length > 0 && (
              <Typography variant="caption" sx={{ opacity: 0.8, display: "block", mt: 0.5 }}>
                Sources: {m.sources.join(", ")}
              </Typography>
            )}
          </Box>
        ))}
      </Paper>
      <Stack component="form" direction="row" spacing={1} onSubmit={onSubmit}>
        <TextField
          fullWidth
          placeholder="Ask about ROAS, Japan, Meta vs TikTok, budget, anomalies…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={busy}
        />
        <Button type="submit" variant="contained" disabled={busy}>
          Send
        </Button>
      </Stack>
    </>
  );
}
