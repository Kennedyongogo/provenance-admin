import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Typography,
  Box,
  TextField,
  Button,
  Tooltip,
  Paper,
  Chip,
  Fade,
  Grow,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import StarBorder from "@mui/icons-material/StarBorder";
import Star from "@mui/icons-material/Star";
import RateReviewIcon from "@mui/icons-material/RateReview";
import FavoriteIcon from "@mui/icons-material/Favorite";

const STAR_OPTIONS = [1, 2, 3, 4, 5];

const RatingPromptDialog = ({
  open,
  submitting,
  onDismiss,
  onSubmit,
  daysUntilNextPrompt = null,
}) => {
  const [rating, setRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [testimonial, setTestimonial] = useState("");

  const selectedValue = hoveredStar || rating;

  const handleSubmit = async () => {
    if (!rating || submitting) return;
    await onSubmit({
      rating,
      testimonial,
    });
    setRating(0);
    setHoveredStar(0);
    setTestimonial("");
  };

  const getRatingLabel = (value) => {
    const labels = {
      1: "Poor",
      2: "Fair",
      3: "Good",
      4: "Very Good",
      5: "Excellent",
    };
    return labels[value] || "";
  };

  const renderStarIcon = (value) => {
    const isActive = value <= selectedValue;
    const isHovered = value <= hoveredStar && hoveredStar > 0;
    const shouldGlow = isActive || isHovered;

    return (
      <Box
        sx={{
          position: "relative",
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          transform: shouldGlow
            ? { xs: "scale(1.1)", sm: "scale(1.15)" }
            : "scale(1)",
        }}
      >
        <Star
          sx={{
            fontSize: { xs: 36, sm: 56 },
            color: isActive
              ? "#D4AF37"
              : isHovered
                ? "rgba(212, 175, 55, 0.6)"
                : "rgba(0, 0, 0, 0.15)",
            transition: "all 0.2s ease",
            filter: shouldGlow
              ? "drop-shadow(0 4px 12px rgba(212, 175, 55, 0.4))"
              : "none",
            "&:hover": {
              transform: "scale(1.1)",
            },
          }}
        />
        {shouldGlow && (
          <Box
            sx={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "100%",
              height: "100%",
              background: `radial-gradient(circle, rgba(212, 175, 55, 0.3) 0%, transparent 70%)`,
              borderRadius: "50%",
              pointerEvents: "none",
              animation: "pulse 2s infinite",
              "@keyframes pulse": {
                "0%, 100%": {
                  opacity: 0.5,
                  transform: "translate(-50%, -50%) scale(1)",
                },
                "50%": {
                  opacity: 0.8,
                  transform: "translate(-50%, -50%) scale(1.2)",
                },
              },
            }}
          />
        )}
      </Box>
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onDismiss}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: { xs: 3, sm: 4 },
          overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.15)",
          maxHeight: { xs: "90vh", sm: "auto" },
          margin: { xs: 2, sm: "auto" },
        },
      }}
      sx={{
        "& .MuiBackdrop-root": {
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          backdropFilter: "blur(4px)",
        },
      }}
    >
      {/* Header with gradient background */}
      <Box
        sx={{
          background:
            "linear-gradient(135deg, rgba(212, 175, 55, 0.1) 0%, rgba(255, 255, 255, 0.9) 100%)",
          borderBottom: "1px solid rgba(212, 175, 55, 0.2)",
          p: { xs: 2, sm: 3 },
          pb: { xs: 1.5, sm: 2 },
        }}
      >
        <DialogTitle
          sx={{
            fontWeight: 700,
            color: "rgba(0, 0, 0, 0.9)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            pr: { xs: 0.5, sm: 1 },
            pb: { xs: 0.5, sm: 1 },
            fontSize: { xs: "1.125rem", sm: "1.5rem" },
            px: { xs: 0, sm: 2 },
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: { xs: 1, sm: 1.5 },
            }}
          >
            <RateReviewIcon
              sx={{
                color: "#D4AF37",
                fontSize: { xs: 24, sm: 32 },
                display: { xs: "none", sm: "block" },
              }}
            />
            <Box>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 700,
                  background: "linear-gradient(45deg, #D4AF37, #B8941F)",
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  mb: { xs: 0, sm: 0.5 },
                  fontSize: { xs: "1rem", sm: "1.25rem" },
                }}
              >
                Rate Your Experience
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: "rgba(0, 0, 0, 0.6)",
                  fontSize: { xs: "0.7rem", sm: "0.75rem" },
                  display: { xs: "none", sm: "block" },
                }}
              >
                Help us improve TuVibe
              </Typography>
            </Box>
          </Box>
          <IconButton
            onClick={onDismiss}
            sx={{
              color: "rgba(0, 0, 0, 0.6)",
              "&:hover": {
                backgroundColor: "rgba(212, 175, 55, 0.1)",
                color: "#D4AF37",
              },
              transition: "all 0.2s ease",
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
      </Box>

      <DialogContent
        sx={{
          p: { xs: 2, sm: 4 },
          "&.MuiDialogContent-root": {
            pt: { xs: 2, sm: 3 },
            px: { xs: 2, sm: 4 },
            pb: { xs: 2, sm: 4 },
          },
          overflowY: "auto",
          maxHeight: { xs: "calc(90vh - 200px)", sm: "none" },
        }}
      >
        <Typography
          variant="body1"
          sx={{
            color: "rgba(0, 0, 0, 0.75)",
            mb: { xs: 2, sm: 3 },
            lineHeight: 1.6,
            fontSize: { xs: "0.875rem", sm: "1rem" },
            textAlign: "center",
          }}
        >
          We'd love to hear what you think about TuVibe. Your feedback helps us
          improve the experience for everyone.
        </Typography>

        {typeof daysUntilNextPrompt === "number" && daysUntilNextPrompt > 0 && (
          <Fade in={true}>
            <Paper
              elevation={0}
              sx={{
                backgroundColor: "rgba(212, 175, 55, 0.08)",
                border: "1px solid rgba(212, 175, 55, 0.3)",
                borderRadius: 2,
                p: { xs: 1.5, sm: 2 },
                mb: { xs: 2, sm: 3 },
                textAlign: "center",
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  color: "rgba(0, 0, 0, 0.7)",
                  fontSize: { xs: "0.8rem", sm: "0.875rem" },
                  lineHeight: 1.5,
                }}
              >
                <FavoriteIcon
                  sx={{
                    fontSize: { xs: 14, sm: 16 },
                    color: "#D4AF37",
                    verticalAlign: "middle",
                    mr: 0.5,
                  }}
                />
                We'll remind you again in {daysUntilNextPrompt} day
                {daysUntilNextPrompt === 1 ? "" : "s"} if you close this now.
              </Typography>
            </Paper>
          </Fade>
        )}

        {/* Star Rating Section */}
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            mb: { xs: 2, sm: 3 },
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: { xs: 0.25, sm: 1 },
              mb: { xs: 1.5, sm: 2 },
              width: "100%",
              overflowX: "auto",
              overflowY: "hidden",
              pb: { xs: 1, sm: 0 },
              "&::-webkit-scrollbar": {
                display: "none",
              },
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
          >
            {STAR_OPTIONS.map((value) => (
              <Tooltip
                key={value}
                title={`${value} Star${value > 1 ? "s" : ""} - ${getRatingLabel(value)}`}
                arrow
                placement="top"
              >
                <IconButton
                  onClick={() => setRating(value)}
                  onMouseEnter={() => setHoveredStar(value)}
                  onMouseLeave={() => setHoveredStar(0)}
                  disableFocusRipple
                  disableRipple
                  sx={{
                    padding: { xs: 0.25, sm: 1 },
                    minWidth: { xs: 40, sm: "auto" },
                    "&:hover": {
                      transform: "scale(1.1)",
                      backgroundColor: "transparent",
                    },
                    "&:focus": {
                      outline: "none",
                    },
                    "&:focus-visible": {
                      outline: "none",
                    },
                    "&.Mui-focusVisible": {
                      outline: "none",
                      boxShadow: "none",
                      backgroundColor: "transparent",
                    },
                    "&:active": {
                      backgroundColor: "transparent",
                    },
                    transition: "transform 0.2s ease",
                    flexShrink: 0,
                  }}
                >
                  {renderStarIcon(value)}
                </IconButton>
              </Tooltip>
            ))}
          </Box>

          {/* Rating Label */}
          <Grow in={rating > 0}>
            <Box>
              <Chip
                label={
                  rating > 0 ? `${rating} - ${getRatingLabel(rating)}` : ""
                }
                sx={{
                  backgroundColor: "rgba(212, 175, 55, 0.15)",
                  color: "#B8941F",
                  fontWeight: 600,
                  fontSize: { xs: "0.75rem", sm: "0.875rem" },
                  height: { xs: 28, sm: 32 },
                  border: "1px solid rgba(212, 175, 55, 0.3)",
                  "& .MuiChip-label": {
                    px: { xs: 1.5, sm: 2 },
                  },
                }}
              />
            </Box>
          </Grow>
        </Box>

        {/* Testimonial Input */}
        <TextField
          multiline
          minRows={3}
          maxRows={4}
          fullWidth
          label="Share your experience (optional)"
          placeholder="Tell us what you love about TuVibe or how we can improve..."
          value={testimonial}
          onChange={(e) => {
            if (e.target.value.length <= 500) {
              setTestimonial(e.target.value);
            }
          }}
          inputProps={{ maxLength: 500 }}
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: 0,
              backgroundColor: "rgba(0, 0, 0, 0.02)",
              transition: "all 0.2s ease",
              "&:hover": {
                backgroundColor: "rgba(0, 0, 0, 0.04)",
              },
              "&.Mui-focused": {
                backgroundColor: "rgba(212, 175, 55, 0.05)",
                borderColor: "#D4AF37",
              },
              "& fieldset": {
                borderColor: "rgba(0, 0, 0, 0.15)",
              },
              "&:hover fieldset": {
                borderColor: "rgba(212, 175, 55, 0.5)",
              },
              "&.Mui-focused fieldset": {
                borderColor: "#D4AF37",
                borderWidth: "2px",
              },
            },
            "& .MuiInputLabel-root": {
              color: "rgba(0, 0, 0, 0.6)",
              "&.Mui-focused": {
                color: "#D4AF37",
              },
            },
          }}
        />
        <Typography
          variant="caption"
          sx={{
            display: "block",
            textAlign: "right",
            mt: 1,
            color: "rgba(0, 0, 0, 0.5)",
            fontSize: "0.75rem",
          }}
        >
          {testimonial.length} / 500 characters
        </Typography>
      </DialogContent>

      <DialogActions
        sx={{
          px: { xs: 2, sm: 4 },
          py: { xs: 2, sm: 3 },
          gap: { xs: 1.5, sm: 2 },
          borderTop: "1px solid rgba(0, 0, 0, 0.08)",
          backgroundColor: "rgba(0, 0, 0, 0.02)",
          flexDirection: { xs: "column-reverse", sm: "row" },
        }}
      >
        <Button
          onClick={onDismiss}
          fullWidth={true}
          sx={{
            textTransform: "none",
            fontWeight: 600,
            color: "rgba(0, 0, 0, 0.7)",
            px: { xs: 2, sm: 3 },
            py: { xs: 1, sm: 1 },
            borderRadius: 2,
            width: { xs: "100%", sm: "auto" },
            "&:hover": {
              backgroundColor: "rgba(0, 0, 0, 0.05)",
            },
            transition: "all 0.2s ease",
          }}
        >
          Maybe Later
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={!rating || submitting}
          fullWidth={true}
          sx={{
            textTransform: "none",
            borderRadius: 3,
            px: { xs: 3, sm: 4 },
            py: { xs: 1.25, sm: 1.25 },
            fontWeight: 700,
            fontSize: { xs: "0.875rem", sm: "0.9375rem" },
            width: { xs: "100%", sm: "auto" },
            background:
              rating > 0
                ? "linear-gradient(90deg, #D4AF37 0%, #B8941F 100%)"
                : "rgba(0, 0, 0, 0.2)",
            boxShadow:
              rating > 0 ? "0 8px 20px rgba(212, 175, 55, 0.4)" : "none",
            "&:hover": {
              background:
                rating > 0
                  ? "linear-gradient(90deg, #B8941F 0%, #D4AF37 100%)"
                  : "rgba(0, 0, 0, 0.2)",
              boxShadow:
                rating > 0 ? "0 12px 28px rgba(212, 175, 55, 0.5)" : "none",
              transform: rating > 0 ? "translateY(-2px)" : "none",
            },
            "&:disabled": {
              background: "rgba(0, 0, 0, 0.1)",
              color: "rgba(0, 0, 0, 0.3)",
            },
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          {submitting ? "Submitting..." : "Submit Rating"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RatingPromptDialog;
