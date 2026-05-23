import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Typography,
  IconButton,
  InputAdornment,
  Box,
  Alert,
  CircularProgress,
  Stack,
  Chip,
} from "@mui/material";
import {
  Close,
  Security,
  Visibility,
  VisibilityOff,
  Lock,
  CheckCircle,
  RadioButtonUnchecked,
} from "@mui/icons-material";
import Swal from "sweetalert2";

const defaultCriteria = {
  length: false,
  uppercase: false,
  lowercase: false,
  digit: false,
  special: false,
};

const PublicResetPasswordDialog = ({ open, onClose, user }) => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState({
    current: false,
    next: false,
    confirm: false,
  });
  const [criteria, setCriteria] = useState(defaultCriteria);
  const [message, setMessage] = useState(null);
  const [severity, setSeverity] = useState("success");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const nextCriteria = {
      length: newPassword.length >= 8,
      uppercase: /[A-Z]/.test(newPassword),
      lowercase: /[a-z]/.test(newPassword),
      digit: /\d/.test(newPassword),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword),
    };
    setCriteria(nextCriteria);
  }, [newPassword]);

  useEffect(() => {
    if (!open) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage(null);
      setSeverity("success");
      setCriteria(defaultCriteria);
      setShowPassword({ current: false, next: false, confirm: false });
    }
  }, [open]);

  const toggleVisibility = (field) => {
    setShowPassword((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setSeverity("error");
      setMessage("New password and confirmation must match.");
      return;
    }

    const unmetCriteria = Object.values(criteria).some((value) => !value);
    if (unmetCriteria) {
      setSeverity("error");
      setMessage("Please choose a stronger password before continuing.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setSeverity("error");
      setMessage("We could not verify your session. Please log in again.");
      return;
    }

    const submitData = {
      currentPassword,
      newPassword,
    };

    setLoading(true);
    try {
      const response = await fetch("/api/public/me/password", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(submitData),
      });
      const data = await response.json();

      if (data.success) {
        onClose?.();
        setTimeout(() => {
          localStorage.clear();
          Swal.fire({
            icon: "success",
            title: "Password Updated",
            text: "Your password has been changed successfully. Logging you out...",
            confirmButtonColor: "#D4AF37",
            showConfirmButton: false,
            timer: 1800,
            timerProgressBar: true,
            didOpen: () => {
              Swal.showLoading();
            },
          });
          setTimeout(() => {
            window.location.href = "/";
          }, 1800);
        }, 150);
      } else {
        setSeverity("error");
        setMessage(data.message || "We couldn't update your password.");
      }
    } catch (error) {
      console.error("Public password update failed:", error);
      setSeverity("error");
      setMessage("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const renderCriteriaChip = (label, met) => (
    <Chip
      key={label}
      label={label}
      className="criteria-chip"
      size="small"
      icon={
        met ? (
          <CheckCircle sx={{ fontSize: 16, color: "#2e7d32" }} />
        ) : (
          <RadioButtonUnchecked sx={{ fontSize: 16, color: "#9e9e9e" }} />
        )
      }
      sx={{
        borderRadius: 2,
        fontSize: "0.75rem",
        fontWeight: 500,
        color: met ? "#2e7d32" : "#616161",
        backgroundColor: met ? "rgba(46, 125, 50, 0.12)" : "rgba(0,0,0,0.04)",
        "& .MuiChip-icon": {
          marginLeft: "4px",
          marginRight: "-4px",
        },
      }}
    />
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: {
          borderRadius: 3,
          boxShadow: "0 16px 40px rgba(212, 175, 55, 0.2)",
          overflow: "visible",
        },
      }}
    >
      <DialogTitle
        sx={{
          background: "linear-gradient(135deg, #d4af37 0%, #b8941f 100%)",
          color: "#1a1a1a",
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          gap: 2,
          py: 3,
          px: 3,
          position: "relative",
        }}
      >
        <Security sx={{ fontSize: 32 }} />
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Reset Password
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.8 }}>
            {user?.name || "Secure your account"}
          </Typography>
        </Box>
        <IconButton
          onClick={onClose}
          sx={{
            position: "absolute",
            top: 12,
            right: 12,
            color: "#1a1a1a",
            "&:hover": {
              backgroundColor: "rgba(26, 26, 26, 0.08)",
            },
          }}
        >
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent
        sx={{
          px: 3,
          py: 3,
          backgroundColor: "#faf9f6",
        }}
      >
        {message && (
          <Alert
            severity={severity}
            sx={{
              mb: 2,
              borderRadius: 2,
            }}
          >
            {message}
          </Alert>
        )}

        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}
        >
          <TextField
            label="Current Password"
            type={showPassword.current ? "text" : "password"}
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            required
            fullWidth
            sx={{ mt: 2 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Lock />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => toggleVisibility("current")}
                    edge="end"
                  >
                    {showPassword.current ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <TextField
            label="New Password"
            type={showPassword.next ? "text" : "password"}
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            required
            fullWidth
            helperText="Use a strong password to keep your account secure."
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Lock />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => toggleVisibility("next")}
                    edge="end"
                  >
                    {showPassword.next ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <TextField
            label="Confirm New Password"
            type={showPassword.confirm ? "text" : "password"}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Lock />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => toggleVisibility("confirm")}
                    edge="end"
                  >
                    {showPassword.confirm ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <Box
            sx={{
              backgroundColor: "rgba(212, 175, 55, 0.08)",
              borderRadius: 2,
              p: 2,
              border: "1px solid rgba(212, 175, 55, 0.2)",
            }}
          >
            <Typography
              variant="subtitle2"
              sx={{ mb: 1, fontWeight: 600, color: "#1a1a1a" }}
            >
              Password must include:
            </Typography>
            <Stack
              direction="row"
              spacing={1}
              useFlexGap
              sx={{
                flexWrap: "wrap",
                justifyContent: { xs: "center", sm: "flex-start" },
                "& .criteria-chip": {
                  width: { xs: "calc(50% - 8px)", sm: "auto" },
                  justifyContent: "flex-start",
                },
                "& .criteria-chip:nth-of-type(5)": {
                  width: { xs: "100%", sm: "auto" },
                  display: "flex",
                  justifyContent: { xs: "center", sm: "flex-start" },
                },
              }}
            >
              {renderCriteriaChip("8+ characters", criteria.length)}
              {renderCriteriaChip("Uppercase letter", criteria.uppercase)}
              {renderCriteriaChip("Lowercase letter", criteria.lowercase)}
              {renderCriteriaChip("Number", criteria.digit)}
              {renderCriteriaChip("Special symbol", criteria.special)}
            </Stack>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions
        sx={{
          px: 3,
          py: 2.5,
          backgroundColor: "#faf9f6",
        }}
      >
        <Button
          onClick={onClose}
          variant="text"
          sx={{
            color: "rgba(26, 26, 26, 0.7)",
            textTransform: "none",
            fontWeight: 600,
            "&:hover": {
              backgroundColor: "rgba(0,0,0,0.04)",
            },
          }}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          sx={{
            background: "linear-gradient(135deg, #d4af37 0%, #b8941f 100%)",
            color: "#1a1a1a",
            textTransform: "none",
            fontWeight: 700,
            px: 3,
            borderRadius: 2,
            boxShadow: "0 10px 20px rgba(212, 175, 55, 0.25)",
            "&:hover": {
              background: "linear-gradient(135deg, #b8941f 0%, #d4af37 100%)",
            },
          }}
          disabled={loading}
          startIcon={
            loading ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              <Security />
            )
          }
        >
          {loading ? "Updating..." : "Update Password"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PublicResetPasswordDialog;
