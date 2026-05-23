import React from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  Typography,
  Chip,
  Badge,
} from "@mui/material";
import LockPersonIcon from "@mui/icons-material/LockPerson";
import SmsFailedIcon from "@mui/icons-material/SmsFailed";
import LogoutIcon from "@mui/icons-material/Logout";

const formatTimestamp = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const highlightColor = "#b8860b";

export default function SuspensionGate({
  user,
  suspension,
  onAppealClick,
  onLogout,
  loading = false,
}) {
  const createdAt = suspension?.createdAt || suspension?.metadata?.created_at;
  const updatedAt = suspension?.metadata?.updated_at || suspension?.updatedAt;

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "70vh",
        textAlign: "center",
        gap: 3,
        px: 2,
      }}
    >
      <Stack spacing={2} alignItems="center">
        <LockPersonIcon sx={{ fontSize: 64, color: "#b85050" }} />
        <Box>
          <Typography variant="h5" fontWeight={700} color="#2c3e50">
            Your account is suspended
          </Typography>
          <Typography variant="body1" color="#7f8c8d" sx={{ mt: 1 }}>
            {user?.name
              ? `Hi ${user.name.split(" ")[0]}, your access is restricted until the review is complete.`
              : "Your account access is temporarily restricted pending review."}
          </Typography>
        </Box>
      </Stack>

      <Card
        elevation={4}
        sx={{
          maxWidth: 520,
          width: "100%",
          borderRadius: 3,
          border: "1px solid rgba(212, 175, 55, 0.35)",
          background:
            "linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 215, 0, 0.08) 100%)",
        }}
      >
        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          <Stack spacing={2}>
            <Typography
              variant="subtitle1"
              fontWeight={700}
              color={highlightColor}
              display="flex"
              alignItems="center"
              gap={1}
            >
              <SmsFailedIcon fontSize="small" />
              Suspension Reason
            </Typography>
            <Typography
              variant="body1"
              color="#2c3e50"
              sx={{ whiteSpace: "pre-line" }}
            >
              {suspension?.reason || "No reason provided yet."}
            </Typography>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={{ xs: 1.5, sm: 1 }}
              flexWrap="wrap"
              alignItems={{ xs: "center", sm: "flex-start" }}
              justifyContent={{ xs: "center", sm: "flex-start" }}
            >
              {createdAt && (
                <Chip
                  size="small"
                  label={`Started: ${formatTimestamp(createdAt)}`}
                  variant="outlined"
                  sx={{
                    borderColor: highlightColor,
                    color: highlightColor,
                    backgroundColor: "rgba(184, 134, 11, 0.08)",
                    alignSelf: { xs: "center", sm: "flex-start" },
                    fontWeight: 600,
                  }}
                />
              )}
              {updatedAt && (
                <Chip
                  size="small"
                  label={`Updated: ${formatTimestamp(updatedAt)}`}
                  variant="outlined"
                  sx={{
                    borderColor: highlightColor,
                    color: highlightColor,
                    backgroundColor: "rgba(184, 134, 11, 0.08)",
                    alignSelf: { xs: "center", sm: "flex-start" },
                    fontWeight: 600,
                  }}
                />
              )}
              {typeof suspension?.unreadCount === "number" &&
                suspension.unreadCount > 0 && (
                  <Chip
                    size="small"
                    color="error"
                    label={`${suspension.unreadCount} new response${
                      suspension.unreadCount === 1 ? "" : "s"
                    } from admin`}
                  />
                )}
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        alignItems="center"
        justifyContent="center"
      >
        <Badge
          badgeContent={
            suspension?.unreadCount > 0 ? suspension.unreadCount : 0
          }
          color="primary"
          sx={{
            "& .MuiBadge-badge": {
              backgroundColor: "#008080", // Teal color
              color: "#ffffff",
              fontWeight: 700,
              display: suspension?.unreadCount > 0 ? "flex" : "none",
            },
          }}
        >
          <Button
            variant="contained"
            color="warning"
            onClick={onAppealClick}
            disabled={loading}
            sx={{
              minWidth: 220,
              fontWeight: 700,
              color: "#2c3e50",
              textTransform: "none",
              boxShadow: "0 10px 24px rgba(212, 175, 55, 0.35)",
              "&:hover": {
                backgroundColor: "#FFC700",
                boxShadow: "0 12px 28px rgba(212, 175, 55, 0.45)",
              },
            }}
          >
            Request Appeal Review
          </Button>
        </Badge>
        <Button
          variant="outlined"
          color="warning"
          onClick={onLogout}
          startIcon={<LogoutIcon />}
          sx={{
            minWidth: 180,
            fontWeight: 700,
            textTransform: "none",
            borderColor: highlightColor,
            color: highlightColor,
            "&:hover": {
              borderColor: highlightColor,
              backgroundColor: "rgba(184, 134, 11, 0.08)",
            },
          }}
        >
          Logout
        </Button>
      </Stack>
    </Box>
  );
}
