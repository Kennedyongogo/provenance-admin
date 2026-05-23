import React, { useEffect } from "react";
import { Box } from "@mui/material";
import HeroSection from "../components/Home/HeroSection";

export default function Home() {
  useEffect(() => {
    // Prevent body scroll on home page
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    // Signal that page is ready (helps with browser loading indicator)
    const timer = setTimeout(() => {
      if (document.readyState === "complete") {
        window.dispatchEvent(new Event("load"));
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      // Restore scrolling when leaving home page
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, []);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        maxHeight: "100vh",
        overflow: "hidden",
      }}
    >
      <HeroSection />
    </Box>
  );
}
