import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SendIcon from "@mui/icons-material/Send";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";

const formatTimestamp = (timestamp) => {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const buildAuthorMeta = (message) => {
  if (message.sender_role === "admin") {
    return {
      name: "Platform Admin",
      color: "#b8860b",
      align: "flex-start",
      bg: "rgba(255, 215, 0, 0.15)",
      textColor: "#2c3e50",
      isSelf: false,
      initial: "A",
    };
  }
  return {
    name: "You",
    color: "#5a8a93",
    align: "flex-end",
    bg: "rgba(90, 138, 147, 0.12)",
    textColor: "#2c3e50",
    isSelf: true,
    initial: "Y",
  };
};

export default function SuspensionAppealModal({
  open,
  onClose,
  suspension,
  token,
  onSuspensionUpdated,
}) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [messageInput, setMessageInput] = useState("");
  const [error, setError] = useState("");

  const suspensionId = suspension?.id;

  const appendMessage = useCallback((newMessage) => {
    if (!newMessage) return;
    setMessages((prev) => {
      const exists = prev.some((msg) => msg.id === newMessage.id);
      if (exists) {
        return prev.map((msg) =>
          msg.id === newMessage.id ? { ...msg, ...newMessage } : msg
        );
      }
      return [...prev, newMessage].sort(
        (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
      );
    });
  }, []);

  const fetchThread = useCallback(
    async (silent = false) => {
      if (!open || !suspensionId || !token) return;
      try {
        if (!silent) {
          setLoading(true);
        }
        setError("");

        const response = await fetch(
          `/api/suspensions/me/${suspensionId}/messages`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );
        const payload = await response.json();
        if (!response.ok || !payload.success) {
          throw new Error(payload.message || "Failed to load appeal messages.");
        }

        setMessages(payload.data?.messages || []);

        await fetch(`/api/suspensions/me/${suspensionId}/messages/read`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (typeof onSuspensionUpdated === "function") {
          onSuspensionUpdated({
            id: suspensionId,
            unreadCount: 0,
          });
        }
      } catch (err) {
        console.error("[SuspensionAppealModal] fetchThread error:", err);
        if (!silent) {
          setError(err.message || "Failed to load appeal messages.");
        }
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [open, suspensionId, token, onSuspensionUpdated]
  );

  useEffect(() => {
    if (open && suspensionId) {
      fetchThread(false);
    } else if (!open) {
      setMessages([]);
      setMessageInput("");
      setError("");
    }
  }, [open, suspensionId, fetchThread]);

  // Polling for real-time message updates (runs when modal is open)
  useEffect(() => {
    if (!open || !suspensionId || !token) {
      return;
    }

    // Poll every 5 seconds to check for new messages from admin
    const intervalId = setInterval(() => {
      fetchThread(true); // Silent fetch to avoid showing loading state
    }, 5000);

    return () => clearInterval(intervalId);
  }, [open, suspensionId, token, fetchThread]);

  const handleSendMessage = useCallback(async () => {
    if (!messageInput.trim() || !suspensionId || !token) return;
    try {
      setSending(true);
      setError("");

      const response = await fetch(
        `/api/suspensions/me/${suspensionId}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ message: messageInput.trim() }),
        }
      );
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.message || "Failed to send message.");
      }

      appendMessage(payload.data);
      setMessageInput("");
      if (typeof onSuspensionUpdated === "function") {
        onSuspensionUpdated({
          ...suspension,
          unreadCount: 0,
        });
      }
    } catch (err) {
      console.error("[SuspensionAppealModal] send message error:", err);
      setError(err.message || "Failed to send message.");
    } finally {
      setSending(false);
    }
  }, [
    messageInput,
    suspensionId,
    token,
    appendMessage,
    onSuspensionUpdated,
    suspension,
  ]);

  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        handleSendMessage();
      }
    },
    [handleSendMessage]
  );

  const headerSubtitle = useMemo(() => {
    if (!suspension) return "";
    if (!suspension.reason) {
      return "Awaiting more details from admin team.";
    }
    const preview =
      suspension.reason.length > 64
        ? `${suspension.reason.slice(0, 64)}…`
        : suspension.reason;
    return preview;
  }, [suspension]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      PaperProps={{
        sx: {
          borderRadius: 3,
          border: "1px solid rgba(212, 175, 55, 0.35)",
          overflow: "hidden",
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
          pr: 2,
          background:
            "linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 215, 0, 0.12) 100%)",
        }}
      >
        <Stack spacing={0.5}>
          <Typography variant="h6" fontWeight={700} color="#2c3e50">
            Appeal Conversation
          </Typography>
          <Typography variant="body2" color="#7f8c8d">
            {headerSubtitle}
          </Typography>
        </Stack>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent
        sx={{
          backgroundColor: "#ffffff",
          minHeight: 360,
          p: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Box
          sx={{
            flexGrow: 1,
            overflowY: "auto",
            p: 2.5,
            backgroundColor: "#fafafa",
          }}
        >
          {loading ? (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
              }}
            >
              <CircularProgress sx={{ color: "#FFD700" }} />
            </Box>
          ) : messages.length === 0 ? (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                color: "#7f8c8d",
                gap: 1,
                textAlign: "center",
              }}
            >
              <AdminPanelSettingsIcon sx={{ fontSize: 44, color: "#b8860b" }} />
              <Typography variant="body1">
                Start the appeal by sharing your clarification below.
              </Typography>
              <Typography variant="body2">
                An admin will respond here once they review your request.
              </Typography>
            </Box>
          ) : (
            <Stack spacing={2}>
              {messages.map((message) => {
                const author = buildAuthorMeta(message);
                return (
                  <Stack
                    key={message.id}
                    direction="row"
                    justifyContent={author.align}
                  >
                    <Stack
                      direction="row"
                      spacing={1}
                      alignItems="flex-start"
                      sx={{ maxWidth: "80%" }}
                    >
                      {!author.isSelf && (
                        <Avatar
                          sx={{
                            bgcolor: author.color,
                            width: 32,
                            height: 32,
                            fontSize: 13,
                          }}
                        >
                          {author.initial}
                        </Avatar>
                      )}
                      <Box>
                        <Stack
                          direction="row"
                          spacing={1}
                          alignItems="center"
                          sx={{ mb: 0.5 }}
                        >
                          <Typography variant="subtitle2" color={author.color}>
                            {author.name}
                          </Typography>
                          <Typography variant="caption" color="#7f8c8d">
                            {formatTimestamp(message.createdAt)}
                          </Typography>
                        </Stack>
                        <Box
                          sx={{
                            backgroundColor: author.bg,
                            color: author.textColor,
                            p: 1.5,
                            borderRadius: 2,
                            boxShadow: "0 4px 12px rgba(90, 138, 147, 0.12)",
                            border: "1px solid rgba(0, 0, 0, 0.04)",
                            whiteSpace: "pre-line",
                          }}
                        >
                          <Typography variant="body2">
                            {message.message}
                          </Typography>
                        </Box>
                      </Box>
                    </Stack>
                  </Stack>
                );
              })}
            </Stack>
          )}
        </Box>
        {error && (
          <Box
            sx={{
              px: 2.5,
              pb: 1,
              color: "error.main",
            }}
          >
            <Typography variant="body2">{error}</Typography>
          </Box>
        )}
        <Divider />
        <Box sx={{ p: 2.5, backgroundColor: "#ffffff" }}>
          <TextField
            value={messageInput}
            onChange={(event) => setMessageInput(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Explain what happened or why your account should be restored..."
            multiline
            minRows={2}
            maxRows={5}
            fullWidth
            disabled={sending}
            InputProps={{
              sx: {
                borderRadius: 2,
                backgroundColor: "#fafafa",
              },
            }}
          />
        </Box>
      </DialogContent>
      <DialogActions
        sx={{
          p: 2,
          background:
            "linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 215, 0, 0.12) 100%)",
        }}
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          width="100%"
          justifyContent="space-between"
        >
          <Button
            variant="outlined"
            color="inherit"
            onClick={onClose}
            startIcon={<CloseIcon />}
          >
            Close
          </Button>
          <Button
            variant="contained"
            onClick={handleSendMessage}
            disabled={sending || !messageInput.trim()}
            startIcon={sending ? <CircularProgress size={16} /> : <SendIcon />}
            sx={{
              background: "#FFD700",
              color: "#2c3e50",
              fontWeight: 600,
              "&:hover": {
                background: "#FFC700",
              },
            }}
          >
            Send Message
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
}
