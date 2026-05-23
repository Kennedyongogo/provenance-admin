import React from "react";
import { Box, Typography, Button } from "@mui/material";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            p: 3,
            textAlign: "center",
            borderRadius: "12px",
            bgcolor: "rgba(255, 0, 0, 0.05)",
            border: "1px solid rgba(255, 0, 0, 0.2)",
          }}
        >
          <Typography variant="h6" sx={{ mb: 1, color: "error.main" }}>
            Something went wrong
          </Typography>
          <Typography variant="body2" sx={{ mb: 2, color: "text.secondary" }}>
            {this.props.fallbackMessage || "Please refresh the page to try again."}
          </Typography>
          <Button
            variant="contained"
            onClick={() => {
              this.setState({ hasError: false, error: null });
              if (this.props.onReset) {
                this.props.onReset();
              }
            }}
            sx={{
              bgcolor: "#D4AF37",
              color: "#1a1a1a",
              "&:hover": {
                bgcolor: "#B8941F",
              },
            }}
          >
            Try Again
          </Button>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

