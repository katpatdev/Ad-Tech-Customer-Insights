import { FormEvent, useState } from "react";
import { Box, Button, Chip, Paper, Stack, TextField, Typography } from "@mui/material";
import { api } from "../api/client";

type Msg = { role: "user" | "assistant"; text: string; sources?: string[] };

const suggestions = [
  "Why did Japan underperform?",
  "Compare Meta vs TikTok",
  "Which country should receive more budget?",
  "Give me a portfolio overview",
];

export default function ChatPage() {
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      role: "assistant",
      text: "Ask about countries, platforms, budget moves, or campaign performance. Answers come from rule-based intelligence over your tenant data.",
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
      setMsgs((m) => [...m, { role: "assistant", text: "Chat failed. Check permissions or feature flags." }]);
    } finally {
      setBusy(false);
    }
  }

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
        Natural-language questions answered by the rule engine (no LLM keys).
      </Typography>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
        {suggestions.map((s) => (
          <Chip key={s} label={s} onClick={() => ask(s)} clickable />
        ))}
      </Stack>
      <Paper sx={{ p: 2, minHeight: 420, mb: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
        {msgs.map((m, i) => (
          <Box
            key={i}
            sx={{
              alignSelf: m.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "85%",
              bgcolor: m.role === "user" ? "#0B3D2E" : "#F3F0E8",
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
          placeholder="Ask a question…"
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
