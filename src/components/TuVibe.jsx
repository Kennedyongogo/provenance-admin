import React from "react";
import { Box, Card, Typography } from "@mui/material";

export default function TuVibe() {
  return (
    <Card
      sx={{
        borderRadius: "16px",
        p: 3,
        textAlign: "center",
      }}
    >
      <Typography variant="h4" sx={{ fontWeight: 700 }}>
        TuVibe
      </Typography>
    </Card>
  );
}
