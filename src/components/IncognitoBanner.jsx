import React from "react";
import { Box, Typography, Chip } from "@mui/material";
import { VisibilityOff, Timer } from "@mui/icons-material";

export default function IncognitoBanner({ remainingMinutes }) {
  const formatTime = (minutes) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 1.5,
        p: 1.5,
        mb: 2,
        borderRadius: "12px",
        backgroundColor: "rgba(212, 175, 55, 0.1)",
        border: "1px solid rgba(212, 175, 55, 0.3)",
      }}
    >
      <VisibilityOff sx={{ color: "#D4AF37", fontSize: "1.25rem" }} />
      <Typography
        variant="body2"
        sx={{
          color: "#B8941F",
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        Incognito Mode Active
        <Chip
          icon={<Timer sx={{ fontSize: "0.75rem !important" }} />}
          label={formatTime(remainingMinutes)}
          size="small"
          sx={{
            backgroundColor: "rgba(212, 175, 55, 0.2)",
            color: "#B8941F",
            fontWeight: 600,
            height: "24px",
            fontSize: "0.75rem",
          }}
        />
      </Typography>
      <Typography
        variant="caption"
        sx={{ color: "rgba(0, 0, 0, 0.6)", ml: "auto" }}
      >
        Your views are private
      </Typography>
    </Box>
  );
}

