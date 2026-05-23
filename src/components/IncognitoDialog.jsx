import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  RadioGroup,
  FormControlLabel,
  Radio,
  Divider,
  Chip,
  CircularProgress,
  Alert,
} from "@mui/material";
import {
  VisibilityOff,
  Info,
  Timer,
} from "@mui/icons-material";

const PREMIUM_CATEGORIES = [
  "Sugar Mummy",
  "Sponsor",
  "Ben 10",
  "Urban Chics",
];

export default function IncognitoDialog({
  open,
  onClose,
  onActivate,
  loading,
  currentStatus,
  userCategory,
}) {
  const [selectedMinutes, setSelectedMinutes] = useState(null);
  const [dailyLimit, setDailyLimit] = useState(240); // Default for regular users

  useEffect(() => {
    // Set daily limit based on user category
    const isPremium = PREMIUM_CATEGORIES.includes(userCategory);
    setDailyLimit(isPremium ? 480 : 240); // 8 hours for premium, 4 hours for regular
  }, [userCategory]);

  const quickOptions = [
    { label: "30 minutes", value: 30 },
    { label: "1 hour", value: 60 },
    { label: "2 hours", value: 120 },
    { label: "4 hours", value: 240 },
  ];

  // Add 8-hour option for premium users
  if (dailyLimit === 480) {
    quickOptions.push({ label: "8 hours (Full)", value: 480 });
  } else {
    quickOptions.push({ label: "4 hours (Full)", value: 240 });
  }

  const handleActivate = () => {
    if (!selectedMinutes) return;
    onActivate(selectedMinutes);
  };

  const formatTime = (minutes) => {
    if (minutes < 60) return `${minutes} minutes`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) return `${hours} hour${hours > 1 ? "s" : ""}`;
    return `${hours} hour${hours > 1 ? "s" : ""} ${mins} minute${mins > 1 ? "s" : ""}`;
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: "16px",
          border: "1px solid rgba(212, 175, 55, 0.2)",
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          pb: 1,
          borderBottom: "1px solid rgba(212, 175, 55, 0.1)",
        }}
      >
        <VisibilityOff sx={{ color: "#D4AF37", fontSize: "1.5rem" }} />
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Activate Incognito Mode
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        <Alert
          icon={<Info />}
          severity="info"
          sx={{
            mb: 3,
            backgroundColor: "rgba(212, 175, 55, 0.08)",
            border: "1px solid rgba(212, 175, 55, 0.2)",
            "& .MuiAlert-icon": {
              color: "#D4AF37",
            },
          }}
        >
          <Typography variant="body2">
            Browse profiles without appearing in others' "Who Viewed Me" list.
            Your daily allowance: <strong>{formatTime(dailyLimit)}</strong>
          </Typography>
        </Alert>

        <Typography
          variant="subtitle2"
          sx={{ mb: 2, fontWeight: 600, color: "rgba(0, 0, 0, 0.7)" }}
        >
          Select Duration:
        </Typography>

        <RadioGroup
          value={selectedMinutes}
          onChange={(e) => setSelectedMinutes(Number(e.target.value))}
        >
          {quickOptions.map((option) => (
            <FormControlLabel
              key={option.value}
              value={option.value}
              control={<Radio sx={{ color: "#D4AF37" }} />}
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography>{option.label}</Typography>
                  {option.value === dailyLimit && (
                    <Chip
                      label="Full Allowance"
                      size="small"
                      sx={{
                        backgroundColor: "rgba(212, 175, 55, 0.15)",
                        color: "#B8941F",
                        fontSize: "0.7rem",
                        height: "20px",
                      }}
                    />
                  )}
                </Box>
              }
              sx={{
                mb: 1,
                p: 1.5,
                borderRadius: "8px",
                border: "1px solid rgba(212, 175, 55, 0.1)",
                "&:hover": {
                  backgroundColor: "rgba(212, 175, 55, 0.05)",
                },
                "&.Mui-checked": {
                  backgroundColor: "rgba(212, 175, 55, 0.1)",
                  border: "1px solid rgba(212, 175, 55, 0.3)",
                },
              }}
            />
          ))}
        </RadioGroup>

        <Divider sx={{ my: 2 }} />

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            p: 1.5,
            borderRadius: "8px",
            backgroundColor: "rgba(212, 175, 55, 0.05)",
          }}
        >
          <Timer sx={{ color: "#D4AF37", fontSize: "1.25rem" }} />
          <Box>
            <Typography variant="caption" sx={{ color: "rgba(0, 0, 0, 0.6)" }}>
              Daily Allowance
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {formatTime(dailyLimit)} per day
            </Typography>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2.5, pt: 1 }}>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleActivate}
          variant="contained"
          disabled={!selectedMinutes || loading}
          sx={{
            background:
              "linear-gradient(90deg, #D4AF37 0%, #B8941F 100%)",
            "&:hover": {
              background: "linear-gradient(90deg, #B8941F 0%, #D4AF37 100%)",
            },
            "&:disabled": {
              background: "rgba(0, 0, 0, 0.12)",
            },
          }}
        >
          {loading ? (
            <CircularProgress size={20} sx={{ color: "white" }} />
          ) : (
            "Activate"
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

