import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import {
  ThemeProvider,
  CssBaseline,
  Box,
  CircularProgress,
} from "@mui/material";
import { theme } from "./theme";
import "./App.css";
import React, { useState, useEffect, Suspense, lazy } from "react";
import { HelmetProvider } from "react-helmet-async";
import PageRoutes from "./components/PageRoutes";

// Lazy load components
const Home = lazy(() => import("./pages/Home"));
const PostDetail = lazy(() => import("./pages/PostDetail"));
const Pricing = lazy(() => import("./pages/Pricing"));
const PublicPricing = lazy(() => import("./pages/PublicPricing"));

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

function App() {
  const [user, setUser] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(true); // Drawer open by default

  return (
    <HelmetProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          <ScrollToTop />
          <Suspense
            fallback={
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  height: "100vh",
                  backgroundColor: "white",
                }}
              >
                <CircularProgress />
              </Box>
            }
          >
            <Routes>
              {/* Public landing page */}
              <Route path="/" element={<Home />} />
              {/* Public pricing page - for non-logged in users (Explore button) */}
              <Route path="/explore-pricing" element={<PublicPricing />} />
              {/* Post detail page - accessible without auth for sharing */}
              <Route
                path="/post/:postId"
                element={<PostDetail user={null} />}
              />
              {/* Authenticated routes - includes pricing with navbar */}
              <Route path="/*" element={<PageRoutes />} />
            </Routes>
          </Suspense>
        </Router>
      </ThemeProvider>
    </HelmetProvider>
  );
}

export default App;
