import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  IconButton,
  Badge,
  Tooltip,
} from "@mui/material";
import {
  Timeline as TimelineIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import PostsFeed from "../components/Posts/PostsFeed";

export default function Timeline({ user }) {
  const navigate = useNavigate();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const handleRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <Box>
      <Card
        sx={{
          p: { xs: 2, sm: 3 },
          mb: 2,
          borderRadius: "16px",
          background:
            "linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(245, 230, 211, 0.2) 100%)",
          border: "1px solid rgba(212, 175, 55, 0.2)",
          boxShadow: "0 4px 20px rgba(212, 175, 55, 0.1)",
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "row",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: { xs: 1, sm: 2 },
            mb: 0,
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box
              sx={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 1,
                mb: 0.5,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <TimelineIcon
                  sx={{
                    fontSize: { xs: "1.25rem", sm: "1.5rem" },
                    color: "#D4AF37",
                  }}
                />
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 700,
                    fontSize: { xs: "1.5rem", sm: "2.125rem" },
                    background: "linear-gradient(45deg, #D4AF37, #B8941F)",
                    backgroundClip: "text",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    lineHeight: 1.2,
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  Timeline
                </Typography>
              </Box>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "flex-end",
                  alignItems: "center",
                  gap: { xs: 0.75, sm: 1.25 },
                  flexShrink: 0,
                }}
              >
              </Box>
            </Box>
          </Box>
        </Box>
      </Card>

      <PostsFeed user={user} onRefresh={refreshTrigger} />
    </Box>
  );
}
