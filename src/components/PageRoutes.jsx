import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  Route,
  Routes,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { Box, CircularProgress } from "@mui/material";
import Swal from "sweetalert2";
import { fetchWithTimeout } from "../utils/fetchWithTimeout";

import Navbar from "./Navbar";
import TuVibe from "../components/TuVibe";
import Dashboard from "../pages/Dashboard";
import Profile from "../pages/Profile";
import Explore from "../pages/Explore";
import Wallet from "../pages/Wallet";
import Market from "../pages/Market";
import Reports from "../pages/Reports";
import Notifications from "../pages/Notifications";
import Timeline from "../pages/Timeline";
import Pricing from "../pages/Pricing";
import SuspensionGate from "./Suspension/SuspensionGate";
import SuspensionAppealModal from "./Suspension/SuspensionAppealModal";
import RatingPromptDialog from "./RatingPromptDialog";
import useServerSentEvents from "../hooks/useServerSentEvents";
import {
  getRatingPromptStatus,
  submitRatingTestimonial,
  dismissRatingPrompt,
} from "../utils/ratingPrompt";

function PageRoutes() {
  const navigate = useNavigate();
  const location = useLocation();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [suspension, setSuspension] = useState(null);
  const [loadingSuspension, setLoadingSuspension] = useState(false);
  const [suspensionReady, setSuspensionReady] = useState(true); // Start as true to not block UI
  const initialSuspensionCheckRef = useRef(true);
  const prevUserIdRef = useRef(null);
  const [appealOpen, setAppealOpen] = useState(false);
  const [ratingPromptOpen, setRatingPromptOpen] = useState(false);
  const [ratingPromptLoading, setRatingPromptLoading] = useState(false);
  const [ratingPromptInfo, setRatingPromptInfo] = useState(null);

  const authToken = useMemo(() => localStorage.getItem("token"), [user]);

  const checkAuthentication = useCallback(() => {
    const savedUser = localStorage.getItem("user");
    const token = localStorage.getItem("token");

    if (savedUser && token) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser((prevUser) => {
          if (!prevUser || prevUser.id !== parsedUser.id) {
            initialSuspensionCheckRef.current = true;
            prevUserIdRef.current = parsedUser.id;
            return parsedUser;
          }
          return prevUser;
        });
        setLoading(false);
        return true;
      } catch (error) {
        localStorage.clear();
        setUser(null);
        setSuspensionReady(true);
        setLoading(false);
        navigate("/", { replace: true });
        return false;
      }
    }

    setUser(null);
    setSuspension(null);
    setAppealOpen(false);
    setSuspensionReady(true);
    initialSuspensionCheckRef.current = true;
    prevUserIdRef.current = null;
    setLoading(false);
    navigate("/", { replace: true });
    return false;
  }, [navigate]);

  const fetchSuspensionStatus = useCallback(
    async (shouldGate = false) => {
      const token = localStorage.getItem("token");
      if (!token || !user) {
        setSuspension(null);
        setSuspensionReady(true);
        initialSuspensionCheckRef.current = false;
        return;
      }

      try {
        setLoadingSuspension(true);
        // Don't block UI - allow skeleton loaders to show immediately
        // Only block if we're gating (showing SuspensionGate)
        if (shouldGate) {
          setSuspensionReady(false);
        }
        const response = await fetchWithTimeout(
          "/api/suspensions/me/status",
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          },
          8000
        );

        const payload = await response.json();
        if (!response.ok) {
          throw new Error(
            payload.message || "Failed to load suspension status"
          );
        }

        const suspensionData = payload.data || null;
        setSuspension(suspensionData);
        if (!suspensionData) {
          setAppealOpen(false);
        }
      } catch (error) {
        console.error("[PageRoutes] fetchSuspensionStatus error:", error);
      } finally {
        setLoadingSuspension(false);
        setSuspensionReady(true);
        initialSuspensionCheckRef.current = false;
      }
    },
    [user]
  );

  const requestLogout = useCallback(async () => {
    const result = await Swal.fire({
      title: "Logout?",
      text: "Are you sure you want to logout?",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, Logout",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#D4AF37",
      cancelButtonColor: "#666",
      allowOutsideClick: false,
      allowEscapeKey: true,
      customClass: {
        popup: "swal-popup-gold",
      },
      didOpen: () => {
        const swal = document.querySelector(".swal2-popup");
        if (swal) {
          swal.style.borderRadius = "20px";
          swal.style.border = "1px solid rgba(212, 175, 55, 0.3)";
          swal.style.boxShadow = "0 20px 60px rgba(212, 175, 55, 0.25)";
        }
      },
    });

    if (!result.isConfirmed) {
      return;
    }

    const token = localStorage.getItem("token");
    if (token) {
      try {
        await fetchWithTimeout(
          "/api/public/logout",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          },
          5000
        );
      } catch (error) {
        console.error("Logout API call failed:", error);
      }
    }

    localStorage.clear();
    setUser(null);
    setSuspension(null);
    setAppealOpen(false);
    setSuspensionReady(true);
    initialSuspensionCheckRef.current = true;
    prevUserIdRef.current = null;
    setLoading(false);
    navigate("/", { replace: true });
  }, [navigate]);

  const handleSuspensionUpdated = useCallback((updated) => {
    if (!updated || updated.status === "revoked") {
      setSuspension(null);
      setAppealOpen(false);
      return;
    }

    setSuspension((prev) => ({
      ...(prev || {}),
      ...updated,
    }));
  }, []);

  const handleUserUpdated = useCallback(
    (updatedUserData) => {
      if (!updatedUserData) return;

      const updatedUser = { ...updatedUserData };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setUser(updatedUser);

      // Also refresh suspension status when user is updated
      fetchSuspensionStatus(false);
    },
    [fetchSuspensionStatus]
  );

  const suspensionHandlers = useMemo(() => {
    if (!user) return {};

    return {
      "suspension:update": (payload) => {
        if (payload?.public_user_id !== user.id) return;
        handleSuspensionUpdated(payload);
      },
      "suspension:revoked": (payload) => {
        if (payload?.public_user_id !== user.id) return;
        handleSuspensionUpdated(null);
      },
      "suspension:message:new": (payload) => {
        const suspensionId =
          payload?.suspensionId || payload?.message?.suspension_id;
        if (!suspensionId || suspensionId !== suspension?.id) return;
        if (appealOpen) return;

        const unread =
          payload?.unreadCounts?.user ??
          (typeof payload?.unreadCounts === "number"
            ? payload.unreadCounts
            : undefined);

        handleSuspensionUpdated({
          ...(suspension || {}),
          unreadCount:
            unread !== undefined ? unread : suspension?.unreadCount || 0,
        });
      },
      "suspension:messages:read": (payload) => {
        if (payload?.suspensionId !== suspension?.id) return;
        const unread =
          payload?.unreadCounts?.user ??
          (typeof payload?.unreadCounts === "number"
            ? payload.unreadCounts
            : 0);

        handleSuspensionUpdated({
          ...(suspension || {}),
          unreadCount: unread,
        });
      },
      "user:update": (payload) => {
        if (payload?.id !== user.id) return;
        handleUserUpdated(payload);
      },
      "user:status": (payload) => {
        if (payload?.id !== user.id) return;
        handleUserUpdated(payload);
      },
    };
  }, [
    user,
    suspension,
    handleSuspensionUpdated,
    appealOpen,
    handleUserUpdated,
  ]);

  const checkRatingPrompt = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token || !user) {
      setRatingPromptOpen(false);
      setRatingPromptInfo(null);
      return;
    }

    try {
      const data = await getRatingPromptStatus(token);
      setRatingPromptInfo(data);
      setRatingPromptOpen(Boolean(data?.shouldPrompt));
    } catch (error) {
      console.error("[PageRoutes] rating prompt check failed:", error);
      setRatingPromptOpen(false);
    }
  }, [user]);

  const handleRatingSubmit = useCallback(async ({ rating, testimonial }) => {
    const token = localStorage.getItem("token");
    if (!token) {
      setRatingPromptOpen(false);
      return;
    }
    try {
      setRatingPromptLoading(true);
      await submitRatingTestimonial({ token, rating, testimonial });
      setRatingPromptOpen(false);
      setRatingPromptInfo({
        shouldPrompt: false,
        hasSubmitted: true,
        daysUntilNextPrompt: null,
      });
      Swal.fire({
        title: "Thank you!",
        text: "Your rating helps us make TuVibe better.",
        icon: "success",
        confirmButtonColor: "#D4AF37",
      });
    } catch (error) {
      console.error("[PageRoutes] rating submit failed:", error);
      Swal.fire({
        title: "Something went wrong",
        text: error.message || "Failed to submit rating. Please try again.",
        icon: "error",
        confirmButtonColor: "#D4AF37",
      });
    } finally {
      setRatingPromptLoading(false);
    }
  }, []);

  const handleRatingDismiss = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setRatingPromptOpen(false);
      return;
    }
    try {
      setRatingPromptLoading(true);
      const data = await dismissRatingPrompt(token);
      setRatingPromptInfo((prev) => ({
        ...(prev || {}),
        shouldPrompt: false,
        hasSubmitted: false,
        daysUntilNextPrompt: 3,
        nextPromptDate: data?.nextPromptDate,
      }));
      setRatingPromptOpen(false);
    } catch (error) {
      console.error("[PageRoutes] rating dismiss failed:", error);
      setRatingPromptOpen(false);
    } finally {
      setRatingPromptLoading(false);
    }
  }, []);

  // Get SSE endpoint URL - memoize to prevent unnecessary reconnections
  const sseUrl = useMemo(() => {
    const isDev = import.meta.env.DEV;
    const protocol = window.location.protocol;
    const host = window.location.hostname;
    const apiPort = isDev ? "4000" : window.location.port || "";
    return isDev
      ? `${protocol}//${host}:${apiPort}/api/sse/events`
      : `${protocol}//${host}${apiPort ? `:${apiPort}` : ""}/api/sse/events`;
  }, []); // Only calculate once on mount

  const sseConnection = useServerSentEvents({
    url: sseUrl,
    token: authToken,
    enabled: Boolean(user && authToken),
    eventHandlers: suspensionHandlers,
  });

  useEffect(() => {
    checkAuthentication();
  }, [checkAuthentication]);

  useEffect(() => {
    if (user) {
      const isNewUser = prevUserIdRef.current !== user.id;
      if (isNewUser) {
        initialSuspensionCheckRef.current = true;
        prevUserIdRef.current = user.id;
      }

      // Check if user needs to complete profile (missing age/birth_year)
      // Only check if not already on profile page
      // Also check localStorage flag set during Google sign-in
      const needsCompletion =
        localStorage.getItem("needsProfileCompletion") === "true";
      const isGoogleUser = user.auth_provider === "google";
      const missingAge = !user.birth_year && !user.age;

      if (
        location.pathname !== "/profile" &&
        missingAge &&
        (isGoogleUser || needsCompletion)
      ) {
        // Clear the flag
        localStorage.removeItem("needsProfileCompletion");
        navigate("/profile", { replace: true });
        // Only show alert if not coming from Google sign-in (to avoid double alerts)
        if (!needsCompletion) {
          Swal.fire({
            icon: "info",
            title: "Complete Your Profile",
            text: "Please add your age and phone number to continue using TuVibe.",
            confirmButtonColor: "#D4AF37",
          });
        }
        return;
      }

      // Clear the flag if profile is complete
      if (needsCompletion && !missingAge) {
        localStorage.removeItem("needsProfileCompletion");
      }

      // Parallelize suspension status and rating prompt checks for faster loading
      Promise.all([fetchSuspensionStatus(false), checkRatingPrompt()]).catch(
        (error) => {
          console.error(
            "[PageRoutes] Error in parallel user data fetch:",
            error
          );
        }
      );
    } else {
      setSuspension(null);
      setAppealOpen(false);
      setSuspensionReady(true);
      initialSuspensionCheckRef.current = false;
      prevUserIdRef.current = null;
      setRatingPromptOpen(false);
      setRatingPromptInfo(null);
    }
  }, [
    user,
    fetchSuspensionStatus,
    checkRatingPrompt,
    location.pathname,
    navigate,
  ]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const savedUser = localStorage.getItem("user");

    if (!token || !savedUser) {
      if (user) {
        setUser(null);
        setSuspensionReady(true);
        navigate("/", { replace: true });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  useEffect(() => {
    const handlePopState = () => {
      setTimeout(() => {
        const token = localStorage.getItem("token");
        const savedUser = localStorage.getItem("user");
        if (!token || !savedUser) {
          setSuspensionReady(true);
          navigate("/", { replace: true });
        }
      }, 0);
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [navigate]);

  // Initial fetch on mount/login - optimized to parallelize with suspension check
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token || !user) return;

    // Only fetch if this is the first time or user changed
    if (prevUserIdRef.current !== user.id) {
      // Parallelize user data fetch with suspension check for faster initial load
      const fetchInitialStatus = async () => {
        try {
          // Use Promise.allSettled to prevent one failure from blocking the other
          // Increased timeout to 60 seconds (1 minute) to handle slow server responses
          const [userResponseResult, suspensionResponseResult] =
            await Promise.allSettled([
              fetchWithTimeout(
                "/api/public/me",
                {
                  headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                  },
                },
                60000
              ),
              fetchWithTimeout(
                "/api/suspensions/me/status",
                {
                  method: "GET",
                  headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                  },
                },
                60000
              ),
            ]);

          // Process user data (non-blocking - if it fails, user data from localStorage is used)
          if (
            userResponseResult.status === "fulfilled" &&
            userResponseResult.value.ok
          ) {
            try {
              const userData = await userResponseResult.value.json();
              if (userData.success && userData.data) {
                const updatedUser = { ...userData.data };
                localStorage.setItem("user", JSON.stringify(updatedUser));
                setUser(updatedUser);
              }
            } catch (parseError) {
              console.warn(
                "[PageRoutes] Failed to parse user data:",
                parseError
              );
              // Continue with existing user data from localStorage
            }
          } else {
            // User fetch failed or timed out - use existing data from localStorage
            console.warn(
              "[PageRoutes] User data fetch failed, using cached data"
            );
          }

          // Process suspension data (non-blocking)
          if (
            suspensionResponseResult.status === "fulfilled" &&
            suspensionResponseResult.value.ok
          ) {
            try {
              const suspensionData =
                await suspensionResponseResult.value.json();
              if (suspensionData.data !== undefined) {
                setSuspension(suspensionData.data || null);
                if (!suspensionData.data) {
                  setAppealOpen(false);
                }
              }
              setSuspensionReady(true);
              initialSuspensionCheckRef.current = false;
            } catch (parseError) {
              console.warn(
                "[PageRoutes] Failed to parse suspension data:",
                parseError
              );
              // Default to no suspension if parse fails
              setSuspension(null);
              setSuspensionReady(true);
              initialSuspensionCheckRef.current = false;
            }
          } else {
            // Suspension check failed - default to no suspension
            setSuspension(null);
            setSuspensionReady(true);
            initialSuspensionCheckRef.current = false;
          }
        } catch (error) {
          console.error("Failed to fetch initial user status:", error);
        }
      };

      fetchInitialStatus();
    }
    // Poll for suspension status updates (including unread counts)
    if (user?.id) {
      const pollInterval = setInterval(() => {
        fetchSuspensionStatus(false);
      }, 5000); // Poll every 5 seconds

      return () => clearInterval(pollInterval);
    }
  }, [user?.id, fetchSuspensionStatus]);

  useEffect(() => {
    if (!suspension) {
      setAppealOpen(false);
    }
  }, [suspension]);

  // Only show global loader if we're still checking authentication
  // Don't block UI for suspension check - let skeleton loaders show
  const showGlobalLoader = loading;

  if (showGlobalLoader) {
    return (
      <Box
        sx={{
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#FAFAFA",
        }}
      >
        <CircularProgress sx={{ color: "#D4AF37" }} />
      </Box>
    );
  }

  // If suspension check is still loading and we don't have user yet, show loader
  // Otherwise, show UI immediately with skeleton loaders
  if (!user) {
    return (
      <Box
        sx={{
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#FAFAFA",
        }}
      >
        <CircularProgress sx={{ color: "#D4AF37" }} />
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex" }}>
      <Navbar
        user={user}
        setUser={setUser}
        isSuspended={Boolean(suspension)}
        onLogout={requestLogout}
      />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3 },
          mt: { xs: 8, sm: 9 },
          pb: { xs: 10, md: 3 },
          backgroundColor: "#FAFAFA",
          minHeight: "100vh",
          width: "100%",
          maxWidth: "100%",
          overflowX: "hidden",
          boxSizing: "border-box",
        }}
      >
        {/* Show SuspensionGate if suspension exists, otherwise show routes immediately */}
        {/* Suspension check happens in background - don't block UI */}
        {suspension && suspensionReady ? (
          <SuspensionGate
            user={user}
            suspension={suspension}
            onAppealClick={() => setAppealOpen(true)}
            onLogout={requestLogout}
            loading={loadingSuspension}
          />
        ) : (
          <Routes>
            <Route path="home" element={<Dashboard user={user} />} />
            <Route path="explore" element={<Explore user={user} />} />
            <Route path="market" element={<Market user={user} />} />
            <Route
              path="wallet"
              element={<Wallet user={user} setUser={setUser} />}
            />
            <Route
              path="profile"
              element={<Profile user={user} setUser={setUser} />}
            />
            <Route path="reports" element={<Reports user={user} />} />
            <Route
              path="notifications"
              element={<Notifications user={user} />}
            />
            <Route path="timeline" element={<Timeline user={user} />} />
            <Route path="pricing" element={<Pricing />} />
            <Route path="*" element={<Navigate to="/home" replace />} />
          </Routes>
        )}
      </Box>
      <SuspensionAppealModal
        open={appealOpen && Boolean(suspension)}
        onClose={() => setAppealOpen(false)}
        suspension={suspension}
        token={authToken}
        onSuspensionUpdated={handleSuspensionUpdated}
      />
      <RatingPromptDialog
        open={ratingPromptOpen}
        submitting={ratingPromptLoading}
        onDismiss={handleRatingDismiss}
        onSubmit={handleRatingSubmit}
        daysUntilNextPrompt={ratingPromptInfo?.daysUntilNextPrompt ?? null}
      />
    </Box>
  );
}

export default PageRoutes;
