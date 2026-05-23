import React, { useState, useEffect } from "react";
import {
  Box,
  IconButton,
  Tooltip,
  Chip,
  Badge,
  CircularProgress,
} from "@mui/material";
import { VisibilityOff, Visibility, Timer } from "@mui/icons-material";
import IncognitoDialog from "./IncognitoDialog";
import Swal from "sweetalert2";

export default function IncognitoToggle({ user, subscription }) {
  const [incognitoStatus, setIncognitoStatus] = useState({
    active: false,
    remaining_minutes: 0,
    expires_at: null,
  });
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [checking, setChecking] = useState(true);

  // Only show for Gold plan users
  const hasIncognitoAccess =
    subscription?.plan === "Gold" && subscription?.status === "active";

  // Set up SSE to listen for subscription changes
  useEffect(() => {
    if (!user?.id) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    let sseEventSource = null;

    try {
      const isDev = import.meta.env.DEV;
      const protocol = window.location.protocol;
      const host = window.location.hostname;
      const apiPort = isDev ? "4000" : window.location.port || "";
      const sseUrl = isDev
        ? `${protocol}//${host}:${apiPort}/api/sse/events?token=${encodeURIComponent(token)}`
        : `${protocol}//${host}${apiPort ? `:${apiPort}` : ""}/api/sse/events?token=${encodeURIComponent(token)}`;

      sseEventSource = new EventSource(sseUrl);

      // Listen for subscription changes to re-check access
      const handleSubscriptionChange = () => {
        // Trigger re-render by updating a state that affects hasIncognitoAccess
        // The parent component should update the subscription prop
        console.log(
          "📡 [IncognitoToggle] Subscription changed, access may have changed"
        );
      };

      sseEventSource.addEventListener(
        "subscription:created",
        handleSubscriptionChange
      );
      sseEventSource.addEventListener(
        "subscription:updated",
        handleSubscriptionChange
      );
      sseEventSource.addEventListener(
        "subscription:expired",
        handleSubscriptionChange
      );

      sseEventSource.onopen = () => {
        console.log(
          "✅ [IncognitoToggle] SSE connected for subscription updates"
        );
      };

      sseEventSource.onerror = (error) => {
        console.warn("⚠️ [IncognitoToggle] SSE error:", error);
      };
    } catch (err) {
      console.warn("⚠️ [IncognitoToggle] SSE not available:", err);
    }

    return () => {
      if (sseEventSource) {
        sseEventSource.close();
        sseEventSource = null;
      }
    };
  }, [user?.id]);

  // Fetch incognito status
  const fetchIncognitoStatus = async () => {
    if (!hasIncognitoAccess) {
      setChecking(false);
      return;
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch("/api/subscriptions/incognito/status", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setIncognitoStatus(data.data);
      }
    } catch (error) {
      console.error("Error fetching incognito status:", error);
    } finally {
      setChecking(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchIncognitoStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasIncognitoAccess]);

  // Poll status when active (every 30 seconds)
  useEffect(() => {
    if (!incognitoStatus.active || !hasIncognitoAccess) return;

    const interval = setInterval(() => {
      fetchIncognitoStatus();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [incognitoStatus.active, hasIncognitoAccess]);

  // Update countdown every minute
  useEffect(() => {
    if (!incognitoStatus.active || !incognitoStatus.expires_at) return;

    const interval = setInterval(() => {
      const now = new Date();
      const expiresAt = new Date(incognitoStatus.expires_at);
      const remaining = Math.max(0, Math.round((expiresAt - now) / 60000));

      if (remaining <= 0) {
        setIncognitoStatus((prev) => ({
          ...prev,
          active: false,
          remaining_minutes: 0,
        }));
        clearInterval(interval);
      } else {
        setIncognitoStatus((prev) => ({
          ...prev,
          remaining_minutes: remaining,
        }));
      }
    }, 60000); // Every minute

    return () => clearInterval(interval);
  }, [incognitoStatus.active, incognitoStatus.expires_at]);

  const handleActivate = async (minutes) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/subscriptions/incognito/start", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ minutes }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to activate incognito mode");
      }

      // Update status
      setIncognitoStatus(data.data);
      setDialogOpen(false);

      // Show success notification
      Swal.fire({
        icon: "success",
        title: "Incognito Mode Activated",
        html: `
          <p>You're now browsing privately!</p>
          <p style="font-size: 0.9em; color: #666; margin-top: 8px;">
            ${data.data.consumed_minutes} minutes used. 
            ${data.data.remaining_minutes} minutes remaining today.
          </p>
        `,
        confirmButtonColor: "#D4AF37",
        timer: 3000,
        showConfirmButton: true,
      });

      // Refresh status after a moment
      setTimeout(() => fetchIncognitoStatus(), 1000);
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Activation Failed",
        text: error.message || "Failed to activate incognito mode",
        confirmButtonColor: "#D4AF37",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!hasIncognitoAccess) {
    return null; // Don't show if no access
  }

  if (checking) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", mr: 1 }}>
        <CircularProgress size={20} sx={{ color: "#D4AF37" }} />
      </Box>
    );
  }

  const formatTime = (minutes) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  return (
    <>
      <Tooltip
        title={
          incognitoStatus.active
            ? `Incognito active - ${formatTime(incognitoStatus.remaining_minutes)} remaining`
            : "Activate incognito mode"
        }
        arrow
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            mr: 1,
            cursor: "pointer",
          }}
          onClick={() => {
            if (incognitoStatus.active) {
              Swal.fire({
                icon: "info",
                title: "Incognito Mode Active",
                html: `
                  <p>You're browsing privately!</p>
                  <p style="font-size: 0.9em; color: #666; margin-top: 8px;">
                    ${formatTime(incognitoStatus.remaining_minutes)} remaining
                  </p>
                  <p style="font-size: 0.85em; color: #999; margin-top: 12px;">
                    Your views won't appear in others' "Who Viewed Me" list.
                  </p>
                `,
                confirmButtonColor: "#D4AF37",
              });
            } else {
              setDialogOpen(true);
            }
          }}
        >
          {incognitoStatus.active ? (
            <Chip
              icon={<VisibilityOff sx={{ color: "#D4AF37" }} />}
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <Timer sx={{ fontSize: "0.875rem" }} />
                  <span>{formatTime(incognitoStatus.remaining_minutes)}</span>
                </Box>
              }
              sx={{
                backgroundColor: "rgba(212, 175, 55, 0.15)",
                border: "1px solid rgba(212, 175, 55, 0.3)",
                color: "#B8941F",
                fontWeight: 600,
                "&:hover": {
                  backgroundColor: "rgba(212, 175, 55, 0.25)",
                },
              }}
            />
          ) : (
            <IconButton
              size="small"
              sx={{
                color: "rgba(26, 26, 26, 0.6)",
                "&:hover": {
                  backgroundColor: "rgba(212, 175, 55, 0.1)",
                  color: "#D4AF37",
                },
              }}
            >
              <VisibilityOff />
            </IconButton>
          )}
        </Box>
      </Tooltip>

      <IncognitoDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onActivate={handleActivate}
        loading={loading}
        currentStatus={incognitoStatus}
        userCategory={user?.category}
      />
    </>
  );
}
