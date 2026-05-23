import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  CircularProgress,
  Stack,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Badge,
  IconButton,
  Tooltip,
  List,
  ListItem,
  ListItemAvatar,
  Avatar,
  ListItemText,
  Divider,
  useMediaQuery,
  useTheme,
  Skeleton,
} from "@mui/material";
import { keyframes } from "@mui/system";
import Autocomplete, { createFilterOptions } from "@mui/material/Autocomplete";
import {
  Explore,
  Store,
  Store as StoreIcon,
  Star as StarIcon,
  WhatsApp as WhatsAppIcon,
  LocalOffer as TagIcon,
  Person,
  LocationOn,
  Cake,
  Verified,
  TrendingUp,
  AccessTime,
  Favorite,
  LockOpen,
  MyLocation,
  Insights,
  GpsFixed,
  BarChart,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { fetchWithTimeout } from "../utils/fetchWithTimeout";
import UserLists from "../components/UserLists/UserLists";
import { KENYA_COUNTIES, normalizeCountyName } from "../data/kenyaCounties";
import GeoTargetPicker from "../components/Boost/GeoTargetPicker";
import StoriesFeed from "../components/Stories/StoriesFeed";
import StoryViewer from "../components/Stories/StoryViewer";
import StoryCreator from "../components/Stories/StoryCreator";
import ErrorBoundary from "../components/ErrorBoundary";

const goldShine = keyframes`
  0% {
    opacity: 0.35;
    box-shadow: 0 0 12px rgba(255, 215, 0, 0.45), 0 0 22px rgba(212, 175, 55, 0.35);
  }
  50% {
    opacity: 0.9;
    box-shadow: 0 0 26px rgba(255, 215, 0, 0.9), 0 0 46px rgba(212, 175, 55, 0.65);
  }
  100% {
    opacity: 0.35;
    box-shadow: 0 0 12px rgba(255, 215, 0, 0.45), 0 0 22px rgba(212, 175, 55, 0.35);
  }
`;

const colorShift = keyframes`
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
`;

const getRemainingTimeForDate = (dateValue) => {
  if (!dateValue) return null;
  try {
    const now = new Date();
    const until = new Date(dateValue);
    const diff = until.getTime() - now.getTime();
    if (Number.isNaN(diff) || diff <= 0) {
      return null;
    }
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return { hours, minutes, diff };
  } catch (error) {
    console.error("Failed to calculate remaining time:", error);
    return null;
  }
};

const BOOST_CATEGORIES = [
  "Regular",
  "Sugar Mummy",
  "Sponsor",
  "Ben 10",
  "Urban Chics",
];
const MIN_BOOST_HOURS = 1;
const MAX_BOOST_HOURS = 6;
const DEFAULT_BOOST_RADIUS_KM = 10;
const MIN_BOOST_RADIUS_KM = 1;
const MAX_BOOST_RADIUS_KM = 200;

const normalizeSearchText = (value) =>
  (value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const parseNumericValue = (value) => {
  if (value === null || value === undefined) return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

export default function Dashboard({ user, setUser }) {
  const navigate = useNavigate();
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const [featuredItems, setFeaturedItems] = useState([]);
  const [loadingFeatured, setLoadingFeatured] = useState(false);
  const [featuredUsers, setFeaturedUsers] = useState([]);
  const [loadingFeaturedUsers, setLoadingFeaturedUsers] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState({}); // Track current image index for each user
  const [currentItemImageIndex, setCurrentItemImageIndex] = useState({}); // Track current image index for each featured item
  const [failedImages, setFailedImages] = useState(new Set()); // Track failed image URLs to avoid rendering them
  const [userListsTab, setUserListsTab] = useState("favorites");
  // Refs to track current arrays for interval safety checks
  const featuredUsersRef = useRef([]);
  const featuredItemsRef = useRef([]);
  // Refs to track intervals for proper cleanup
  const featuredUsersIntervalsRef = useRef({});
  const featuredItemsIntervalsRef = useRef({});
  // Ref to track if component is mounted
  const isMountedRef = useRef(true);
  const [boostDialogOpen, setBoostDialogOpen] = useState(false);
  const [boosting, setBoosting] = useState(false);
  const [boostTimeRemaining, setBoostTimeRemaining] = useState(null);
  const [boostCategory, setBoostCategory] = useState(
    user?.category || "Regular"
  );
  const [boostArea, setBoostArea] = useState(user?.county || "");
  const [subscription, setSubscription] = useState(null);
  const [boostHoursInfo, setBoostHoursInfo] = useState(null);

  // Dynamic max boost hours based on package (default to 6 if no package info)
  const maxBoostHours = useMemo(() => {
    if (boostHoursInfo?.maxDurationPerBoost) {
      return Math.max(MIN_BOOST_HOURS, boostHoursInfo.maxDurationPerBoost);
    }
    return MAX_BOOST_HOURS; // Fallback for non-subscribers
  }, [boostHoursInfo?.maxDurationPerBoost]);

  // Default boost hours based on package (default to MIN_BOOST_HOURS if no package info)
  const defaultBoostHours = useMemo(() => {
    if (boostHoursInfo?.defaultDurationPerBoost) {
      return Math.max(MIN_BOOST_HOURS, boostHoursInfo.defaultDurationPerBoost);
    }
    return MIN_BOOST_HOURS;
  }, [boostHoursInfo?.defaultDurationPerBoost]);

  const [boostHours, setBoostHours] = useState(MIN_BOOST_HOURS);

  // Update boostHours when defaultBoostHours changes (e.g., when subscription loads)
  useEffect(() => {
    if (defaultBoostHours && defaultBoostHours !== MIN_BOOST_HOURS) {
      setBoostHours(defaultBoostHours);
    }
  }, [defaultBoostHours]);

  const sanitizedBoostHours = Math.min(
    maxBoostHours,
    Math.max(
      MIN_BOOST_HOURS,
      Math.floor(Number(boostHours) || defaultBoostHours)
    )
  );
  const [targetedBoosts, setTargetedBoosts] = useState([]);
  const [loadingTargetedBoosts, setLoadingTargetedBoosts] = useState(false);
  const [targetedDialogOpen, setTargetedDialogOpen] = useState(false);
  const targetedCount = targetedBoosts.length;
  const [activeBoosts, setActiveBoosts] = useState([]);
  const [selectedBoostId, setSelectedBoostId] = useState(null);
  const [loadingBoostStatus, setLoadingBoostStatus] = useState(false);
  const [boostStatusError, setBoostStatusError] = useState("");
  const [boostTargetEdited, setBoostTargetEdited] = useState(false);
  const [statsDialogOpen, setStatsDialogOpen] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState("");
  const [statsData, setStatsData] = useState(null);
  const [storyViewerOpen, setStoryViewerOpen] = useState(false);
  const [selectedStoryGroup, setSelectedStoryGroup] = useState(null);
  const [storyGroups, setStoryGroups] = useState([]);
  const [storyCreatorOpen, setStoryCreatorOpen] = useState(false);
  const [storyCreated, setStoryCreated] = useState(false);
  const storiesFeedRefreshRef = React.useRef(null);
  // Cache refs to prevent unnecessary refetches on remount
  const dataFetchedRef = useRef(false);
  const lastFetchTimeRef = useRef(0);
  const CACHE_DURATION_MS = 30000; // 30 seconds cache
  const normalizedTargetCounty = useMemo(() => {
    if (!boostArea) return "";
    const normalized = normalizeCountyName(boostArea);
    return normalized || boostArea;
  }, [boostArea]);
  const selectedBoost = useMemo(() => {
    if (!Array.isArray(activeBoosts) || activeBoosts.length === 0) return null;

    if (selectedBoostId) {
      const byId = activeBoosts.find((boost) => boost.id === selectedBoostId);
      if (byId) return byId;
    }

    const normalizedCategory = boostCategory || user?.category || "Regular";

    const categoryMatches = activeBoosts.filter((boost) => {
      const boostCategoryValue =
        boost?.target_category || user?.category || "Regular";
      return boostCategoryValue === normalizedCategory;
    });

    const pool = categoryMatches.length > 0 ? categoryMatches : activeBoosts;

    if (normalizedTargetCounty) {
      const byCounty = pool.find((boost) => {
        const boostCounty = normalizeCountyName(boost?.target_area);
        return boostCounty && boostCounty === normalizedTargetCounty;
      });
      if (byCounty) return byCounty;
    }

    return pool[0] || null;
  }, [
    activeBoosts,
    normalizedTargetCounty,
    boostCategory,
    user?.category,
    selectedBoostId,
  ]);
  const selectedBoostRemaining = useMemo(() => {
    if (!selectedBoost) return null;
    const remaining = getRemainingTimeForDate(selectedBoost.ends_at);
    if (!remaining) return null;
    return `${remaining.hours}h ${remaining.minutes}m`;
  }, [selectedBoost]);
  const selectedBoostExpiresAt = useMemo(() => {
    if (!selectedBoost?.ends_at) return null;
    try {
      return new Date(selectedBoost.ends_at).toLocaleString();
    } catch {
      return null;
    }
  }, [selectedBoost]);
  const isPremiumUser = useMemo(() => {
    if (!user) return false;
    const premiumCategories = [
      "Sugar Mummy",
      "Sponsor",
      "Ben 10",
      "Urban Chics",
    ];
    return (
      Boolean(user.isVerified) ||
      (user.category && premiumCategories.includes(user.category))
    );
  }, [user]);
  const hasActiveBoost = useMemo(() => {
    const now = Date.now();
    if (
      Array.isArray(activeBoosts) &&
      activeBoosts.some((boost) => {
        if (!boost?.ends_at) return false;
        const ends = new Date(boost.ends_at).getTime();
        return Number.isFinite(ends) && ends > now;
      })
    ) {
      return true;
    }
    const fallbackEnds =
      user?.active_boost_until || user?.is_featured_until || null;
    if (!fallbackEnds) return false;
    const ends = new Date(fallbackEnds).getTime();
    return Number.isFinite(ends) && ends > now;
  }, [activeBoosts, user?.active_boost_until, user?.is_featured_until]);
  const [boostLatitude, setBoostLatitude] = useState(null);
  const [boostLongitude, setBoostLongitude] = useState(null);
  const [viewerLatitude, setViewerLatitude] = useState(
    parseNumericValue(user?.latitude)
  );
  const [viewerLongitude, setViewerLongitude] = useState(
    parseNumericValue(user?.longitude)
  );
  const [boostRadiusKm, setBoostRadiusKm] = useState(DEFAULT_BOOST_RADIUS_KM);
  const [locatingBoost, setLocatingBoost] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [targetedBoostsError, setTargetedBoostsError] = useState(null);
  const locationRequestedRef = React.useRef(false);
  const sanitizedBoostRadiusKm = Math.min(
    MAX_BOOST_RADIUS_KM,
    Math.max(
      MIN_BOOST_RADIUS_KM,
      Number.parseFloat(boostRadiusKm) || DEFAULT_BOOST_RADIUS_KM
    )
  );
  const targetedTooltip = loadingTargetedBoosts
    ? "Checking for matching boosts..."
    : targetedBoostsError
      ? targetedBoostsError
      : targetedCount > 0
        ? `${targetedCount} boost match${targetedCount > 1 ? "es" : ""}`
        : "No targeted boosts yet";

  const handleOpenTargetedDialog = () => setTargetedDialogOpen(true);
  const handleCloseTargetedDialog = () => setTargetedDialogOpen(false);

  const programmaticBoostCloseRef = React.useRef(false);

  const applyBoostContext = useCallback(
    (boost) => {
      if (!boost) return;
      setSelectedBoostId(boost.id);
      setBoostCategory(boost.target_category || user?.category || "Regular");
      const targetArea =
        (typeof boost.target_area === "string" && boost.target_area.trim()) ||
        normalizeCountyName(boost.target_area) ||
        "";
      setBoostArea(targetArea);
      const latValue = parseNumericValue(boost.target_lat);
      const lngValue = parseNumericValue(boost.target_lng);
      if (latValue !== null && lngValue !== null) {
        setBoostLatitude(latValue);
        setBoostLongitude(lngValue);
      }
      const radiusValue = parseNumericValue(boost.radius_km);
      if (Number.isFinite(radiusValue)) {
        setBoostRadiusKm(radiusValue);
      }
    },
    [user?.category]
  );

  const handleSelectActiveBoost = useCallback(
    (boost) => {
      if (!boost) return;
      applyBoostContext(boost);
      setBoostTargetEdited(false);
    },
    [applyBoostContext]
  );

  const requestCurrentLocation = useCallback(
    ({ applyToBoost = false, onComplete } = {}) => {
      if (typeof navigator === "undefined" || !navigator.geolocation) {
        setLocationError(
          "Geolocation is not supported by this device or browser."
        );
        if (onComplete) onComplete(false);
        return;
      }

      setLocatingBoost(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setLocatingBoost(false);
          setLocationError("");
          setViewerLatitude(latitude);
          setViewerLongitude(longitude);
          if (applyToBoost) {
            setBoostLatitude(latitude);
            setBoostLongitude(longitude);
          }
          if (onComplete) onComplete(true);
        },
        (error) => {
          setLocatingBoost(false);
          setLocationError(
            error?.message || "Unable to fetch your current location."
          );
          if (onComplete) onComplete(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 30000,
        }
      );
    },
    []
  );

  // Fetch subscription status
  const fetchSubscription = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setSubscription(null);
      return;
    }

    try {
      const response = await fetchWithTimeout(
        "/api/subscriptions/status",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
        8000
      );

      const data = await response.json();

      if (
        data.success &&
        data.data?.hasSubscription &&
        data.data.subscription
      ) {
        setSubscription(data.data.subscription);
        setBoostHoursInfo(data.data.boostHours || null);
      } else {
        setSubscription(null);
        setBoostHoursInfo(null);
      }
    } catch (error) {
      console.error("Error fetching subscription:", error);
      setSubscription(null);
    }
  }, []);

  useEffect(() => {
    fetchSubscription();
  }, [user, fetchSubscription]);

  // Poll for subscription updates (replaces SSE for better performance)
  useEffect(() => {
    if (!isMountedRef.current || !user?.id) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    let pollInterval = null;

    // Poll every 45 seconds - checks subscription status without blocking initial load
    const startPolling = () => {
      // Clear any existing interval first
      if (pollInterval) {
        clearInterval(pollInterval);
      }

      pollInterval = setInterval(() => {
        if (!isMountedRef.current) {
          clearInterval(pollInterval);
          return;
        }

        // Only poll if page is visible (don't waste resources on hidden tabs)
        if (document.hidden) {
          return;
        }

        // Non-blocking fetch - doesn't delay component loading
        fetchSubscription().catch((err) => {
          console.error("[Dashboard] Polling error:", err);
        });
      }, 45000); // Check every 45 seconds
    };

    // Start polling after initial load (delayed to avoid blocking)
    const timeoutId = setTimeout(() => {
      startPolling();
    }, 2000); // Wait 2 seconds after mount before starting to poll

    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [user?.id, fetchSubscription]);

  const fetchPremiumStats = useCallback(async () => {
    setStatsLoading(true);
    setStatsError("");
    const token = localStorage.getItem("token");
    if (!token) {
      setStatsError("Please log in again to view your statistics.");
      setStatsData(null);
      setStatsLoading(false);
      return;
    }
    try {
      const response = await fetchWithTimeout(
        "/api/premium/stats/overview",
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
        10000
      );
      const data = await response.json();
      if (!response.ok || !data.success) {
        setStatsError(
          data.message ||
            "Unable to load your statistics. Please try again shortly."
        );
        setStatsData(null);
      } else {
        setStatsData(data.data || null);
      }
    } catch (error) {
      console.error("[Dashboard] premium stats error", error);
      setStatsError("We hit a snag fetching your stats. Please try again.");
      setStatsData(null);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const handleOpenStatsDialog = useCallback(() => {
    setStatsDialogOpen(true);
    fetchPremiumStats();
  }, [fetchPremiumStats]);

  const handleCloseStatsDialog = useCallback(() => {
    setStatsDialogOpen(false);
  }, []);

  const resetBoostForm = useCallback(() => {
    setBoostCategory(user?.category || "Regular");
    const initialArea =
      (typeof user?.county === "string" && user.county.trim()) ||
      normalizeCountyName(user?.county) ||
      "";
    setBoostArea(initialArea);
    setBoostHours(MIN_BOOST_HOURS);
    setBoostRadiusKm(DEFAULT_BOOST_RADIUS_KM);
    setBoostLatitude(parseNumericValue(user?.latitude) ?? null);
    setBoostLongitude(parseNumericValue(user?.longitude) ?? null);
    setBoostTargetEdited(false);
    setLocationError("");
  }, [user?.category, user?.county, user?.latitude, user?.longitude]);

  const openBoostDialog = useCallback(
    (shouldReset = true) => {
      if (shouldReset) {
        resetBoostForm();
      }
      programmaticBoostCloseRef.current = false;
      setBoostDialogOpen(true);
    },
    [resetBoostForm]
  );

  // Check subscription before opening boost dialog
  const handleBoostButtonClick = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      Swal.fire({
        icon: "warning",
        title: "Login Required",
        text: "Please login to boost your profile",
        confirmButtonColor: "#D4AF37",
      });
      return;
    }

    try {
      // Check subscription by attempting to get premium stats
      // This will return 403 if no subscription, 200 if subscription exists
      const response = await fetchWithTimeout(
        "/api/premium/stats/overview",
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
        10000
      );

      const data = await response.json();

      if (response.status === 403) {
        // No active subscription
        Swal.fire({
          icon: "warning",
          title: "Subscription Required",
          html: `<p>${data.message || "Active subscription required to boost your profile."}</p><p>Please subscribe to a plan to continue.</p>`,
          confirmButtonText: "View Plans",
          cancelButtonText: "Cancel",
          showCancelButton: true,
          confirmButtonColor: "#D4AF37",
          didOpen: () => {
            const swal = document.querySelector(".swal2-popup");
            if (swal) {
              swal.style.borderRadius = "20px";
            }
          },
        }).then((result) => {
          if (result.isConfirmed) {
            navigate("/pricing");
          }
        });
        return;
      }

      // If we get here, user has subscription - open the dialog
      // Note: The backend will still validate boost availability when they try to boost
      openBoostDialog(true);
    } catch (error) {
      console.error("Error checking boost availability:", error);
      // On error, still try to open dialog (let backend handle validation)
      openBoostDialog(true);
    }
  }, [navigate, openBoostDialog]);

  const showBoostDialogAlert = useCallback(
    async (options) => {
      const wasOpen = boostDialogOpen;
      if (wasOpen) {
        programmaticBoostCloseRef.current = true;
        setBoostDialogOpen(false);
        await new Promise((resolve) => setTimeout(resolve, 0));
        programmaticBoostCloseRef.current = false;
      }

      await Swal.fire({
        confirmButtonColor: "#D4AF37",
        ...options,
      });

      if (wasOpen) {
        openBoostDialog(false);
      }
    },
    [boostDialogOpen, openBoostDialog]
  );

  const fetchActiveBoosts = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setActiveBoosts([]);
      setBoostStatusError("");
      return;
    }

    setLoadingBoostStatus(true);
    try {
      const response = await fetchWithTimeout(
        "/api/public/boosts/status",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
        8000
      );
      const data = await response.json();

      if (response.ok && data.success) {
        const boostsSource = Array.isArray(data.data?.boosts)
          ? data.data.boosts
          : data.data?.boost
            ? [data.data.boost]
            : [];
        const boosts = boostsSource.filter(Boolean);
        setActiveBoosts(boosts);
        setSelectedBoostId((prev) => {
          if (boosts.length === 0) {
            return null;
          }
          if (prev && boosts.some((boost) => boost.id === prev)) {
            return prev;
          }
          return boosts[0].id;
        });
        setBoostStatusError("");
      } else {
        setActiveBoosts([]);
        setBoostStatusError(
          data.message || "Unable to load your current boosts."
        );
      }
    } catch (error) {
      console.error("Fetch boost status error:", error);
      setActiveBoosts([]);
      setBoostStatusError("Unable to load your current boosts.");
    } finally {
      setLoadingBoostStatus(false);
    }
  }, []);

  useEffect(() => {
    if (!locationRequestedRef.current) {
      locationRequestedRef.current = true;
      const id = setTimeout(() => {
        requestCurrentLocation({ applyToBoost: false });
      }, 400); // defer until after first paint
      return () => clearTimeout(id);
    }
  }, [requestCurrentLocation]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const styleId = "boost-extend-compact-styles";
    if (document.getElementById(styleId)) return;
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      .boost-extend-compact {
        padding: 18px 20px !important;
        border-radius: 16px !important;
      }
      .boost-extend-compact-title {
        font-size: 1.1rem !important;
        margin-bottom: 6px !important;
      }
      .boost-extend-compact-body {
        font-size: 0.82rem !important;
      }
      .boost-extend-compact-body .swal2-input {
        height: 36px !important;
        font-size: 0.82rem !important;
      }
      .boost-extend-compact-summary {
        font-size: 0.78rem;
        color: rgba(26,26,26,0.65);
      }
      .boost-extend-compact-confirm,
      .boost-extend-compact-cancel {
        font-size: 0.8rem !important;
        padding: 8px 18px !important;
        border-radius: 10px !important;
      }
    `;
    document.head.appendChild(style);
  }, []);

  // Remove focus outlines from buttons and tabs
  useEffect(() => {
    if (typeof document === "undefined") return;
    const styleId = "remove-focus-outline-styles";
    if (document.getElementById(styleId)) return;
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      button:focus,
      button:focus-visible,
      .MuiButton-root:focus,
      .MuiButton-root:focus-visible,
      .MuiIconButton-root:focus,
      .MuiIconButton-root:focus-visible,
      .MuiTab-root:focus,
      .MuiTab-root:focus-visible,
      .MuiCard-root:focus,
      .MuiCard-root:focus-visible {
        outline: none !important;
        box-shadow: none !important;
      }
      button:focus-visible,
      .MuiButton-root:focus-visible,
      .MuiIconButton-root:focus-visible,
      .MuiTab-root:focus-visible {
        outline: none !important;
      }
    `;
    document.head.appendChild(style);
  }, []);

  useEffect(() => {
    if (boostDialogOpen) {
      fetchActiveBoosts();
    }
  }, [boostDialogOpen, fetchActiveBoosts]);

  useEffect(() => {
    // Boost dialog opened with selected boost
  }, [boostDialogOpen, selectedBoost]);

  useEffect(() => {
    if (!boostDialogOpen) return;
    if (!selectedBoost) return;

    if (!boostTargetEdited) {
      applyBoostContext(selectedBoost);
    }
  }, [boostDialogOpen, selectedBoost, boostTargetEdited, applyBoostContext]);

  useEffect(() => {
    const latFromProfile = parseNumericValue(user?.latitude);
    const lngFromProfile = parseNumericValue(user?.longitude);
    if (latFromProfile !== null && lngFromProfile !== null) {
      setViewerLatitude(latFromProfile);
      setViewerLongitude(lngFromProfile);
    }
  }, [user?.latitude, user?.longitude]);

  const handleCloseBoostDialog = useCallback(() => {
    programmaticBoostCloseRef.current = false;
    setBoostDialogOpen(false);
    resetBoostForm();
  }, [resetBoostForm]);

  const favoritesSectionRef = React.useRef(null);

  // Track component mount status
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // Reset fetch flags on unmount
      dataFetchedRef.current = false;
    };
  }, []);

  const fetchFeaturedItems = useCallback(async () => {
    try {
      setLoadingFeatured(true);
      const response = await fetchWithTimeout("/api/market", {}, 8000);
      const data = await response.json();

      if (data.success) {
        // Filter and get only featured items, limit to 6
        const featured = (data.data || [])
          .filter((item) => item.is_featured)
          .slice(0, 6);
        setFeaturedItems(featured);
      }
    } catch (err) {
      console.error("Error fetching featured items:", err);
    } finally {
      setLoadingFeatured(false);
    }
  }, []);

  const fetchFeaturedUsers = useCallback(async () => {
    try {
      setLoadingFeaturedUsers(true);
      const token = localStorage.getItem("token");
      const headers = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetchWithTimeout(
        "/api/public/featured/boosts?limit=12",
        {
          headers,
        },
        8000
      );
      const data = await response.json();

      if (data.success) {
        const users = data.data || [];
        setFeaturedUsers(users);
      }
    } catch (err) {
      console.error("Error fetching featured users:", err);
    } finally {
      setLoadingFeaturedUsers(false);
    }
  }, []);

  // Fetch featured market items and users (with caching to prevent refetch on remount)
  // Optimized: All fetches run in parallel for faster loading
  useEffect(() => {
    const now = Date.now();
    const shouldFetch =
      !dataFetchedRef.current ||
      now - lastFetchTimeRef.current > CACHE_DURATION_MS;

    if (shouldFetch) {
      // Parallelize all data fetches for faster initial load
      Promise.all([
        fetchFeaturedItems(),
        fetchFeaturedUsers(),
        fetchActiveBoosts(),
      ]).catch((error) => {
        console.error("[Dashboard] Error in parallel data fetch:", error);
      });
      dataFetchedRef.current = true;
      lastFetchTimeRef.current = now;
    }
  }, [fetchFeaturedItems, fetchFeaturedUsers, fetchActiveBoosts]);

  // Auto-transition images for each featured user
  useEffect(() => {
    // Update ref with current users
    featuredUsersRef.current = featuredUsers;

    // Always clean up previous intervals first
    Object.values(featuredUsersIntervalsRef.current).forEach((interval) => {
      if (interval) clearInterval(interval);
    });
    featuredUsersIntervalsRef.current = {};

    if (featuredUsers.length === 0) {
      // Reset indices when no users
      setCurrentImageIndex({});
      return () => {};
    }

    const intervals = {};
    // Reset all image indices when users change
    const newIndices = {};

    featuredUsers.forEach((userData) => {
      const images = getAllImages(userData);
      const userId = userData.id;

      // Preload all images for smooth transitions
      images.forEach((imageSrc) => {
        const img = new Image();
        img.src = imageSrc;
      });

      // Always reset to 0 for new users
      newIndices[userId] = 0;

      if (images.length > 1) {
        const imageCount = images.length;

        // Set up interval for this user
        intervals[userId] = setInterval(() => {
          if (!isMountedRef.current) return;
          setCurrentImageIndex((prev) => {
            // Safety check: only update if user still exists in current featuredUsers
            const userStillExists = featuredUsersRef.current.some(
              (user) => user.id === userId
            );
            if (!userStillExists || !isMountedRef.current) {
              return prev;
            }
            const currentIdx = prev[userId] || 0;
            const nextIdx = (currentIdx + 1) % imageCount;
            return { ...prev, [userId]: nextIdx };
          });
        }, 3000); // Change image every 3 seconds
      }
    });

    // Store intervals in ref for cleanup
    featuredUsersIntervalsRef.current = intervals;

    // Set all indices to 0
    setCurrentImageIndex(newIndices);

    // Cleanup intervals on unmount or when users change
    return () => {
      Object.values(intervals).forEach((interval) => {
        if (interval) clearInterval(interval);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [featuredUsers]);

  // Auto-transition images for each featured market item
  useEffect(() => {
    // Update ref with current items
    featuredItemsRef.current = featuredItems;

    // Always clean up previous intervals first
    Object.values(featuredItemsIntervalsRef.current).forEach((interval) => {
      if (interval) clearInterval(interval);
    });
    featuredItemsIntervalsRef.current = {};

    if (featuredItems.length === 0) {
      // Reset indices when no items
      setCurrentItemImageIndex({});
      return () => {};
    }

    const intervals = {};
    const newIndices = {};

    featuredItems.forEach((item) => {
      const images = item.images || [];
      const itemId = item.id;

      // Preload all images for smooth transitions
      images.forEach((imagePath) => {
        const img = new Image();
        img.src = getImageUrl(imagePath);
      });

      // Always reset to 0 for new items
      newIndices[itemId] = 0;

      if (images.length > 1) {
        const imageCount = images.length;

        // Set up interval for this item
        intervals[itemId] = setInterval(() => {
          if (!isMountedRef.current) return;
          setCurrentItemImageIndex((prev) => {
            // Safety check: only update if item still exists in current featuredItems
            const itemStillExists = featuredItemsRef.current.some(
              (item) => item.id === itemId
            );
            if (!itemStillExists || !isMountedRef.current) {
              return prev;
            }
            const currentIdx = prev[itemId] || 0;
            const nextIdx = (currentIdx + 1) % imageCount;
            return { ...prev, [itemId]: nextIdx };
          });
        }, 3000); // Change image every 3 seconds
      }
    });

    // Store intervals in ref for cleanup
    featuredItemsIntervalsRef.current = intervals;

    // Set all indices to 0
    setCurrentItemImageIndex(newIndices);

    // Cleanup intervals on unmount or when items change
    return () => {
      Object.values(intervals).forEach((interval) => {
        if (interval) clearInterval(interval);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [featuredItems]);

  useEffect(() => {
    const resolveEndsAt = () => {
      if (Array.isArray(activeBoosts) && activeBoosts.length > 0) {
        const sorted = [...activeBoosts].sort(
          (a, b) => new Date(a.ends_at) - new Date(b.ends_at)
        );
        return sorted[0]?.ends_at || null;
      }
      return user?.active_boost_until || user?.is_featured_until || null;
    };

    const calculateTimeRemaining = () => {
      const endsAtValue = resolveEndsAt();
      if (!endsAtValue) {
        setBoostTimeRemaining(null);
        return;
      }

      const now = new Date();
      const until = new Date(endsAtValue);
      const diff = until.getTime() - now.getTime();

      if (Number.isNaN(diff) || diff <= 0) {
        setBoostTimeRemaining(null);
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setBoostTimeRemaining({ hours, minutes });
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 60000);

    return () => clearInterval(interval);
  }, [activeBoosts, user?.active_boost_until, user?.is_featured_until]);

  useEffect(() => {
    resetBoostForm();
  }, [resetBoostForm]);

  const handleBoostProfile = async () => {
    if (!boostCategory) {
      await showBoostDialogAlert({
        icon: "warning",
        title: "Select Category",
        text: "Choose the audience category you want to reach before boosting.",
      });
      return;
    }

    if (!normalizedTargetCounty) {
      await showBoostDialogAlert({
        icon: "warning",
        title: "Select a Location",
        text: "Choose the area you want to target before boosting.",
      });
      return;
    }

    if (boostLatitude === null || boostLongitude === null) {
      await showBoostDialogAlert({
        icon: "warning",
        title: "Set Target Location",
        text: "Allow location access or choose a location on the map before boosting.",
      });
      return;
    }

    if (!Number.isFinite(sanitizedBoostRadiusKm)) {
      await showBoostDialogAlert({
        icon: "warning",
        title: "Invalid Radius",
        text: "Provide a radius between 1 km and 200 km for your boost.",
      });
      return;
    }

    const hours = sanitizedBoostHours;

    const token = localStorage.getItem("token");
    if (!token) {
      await showBoostDialogAlert({
        icon: "error",
        title: "Authentication Required",
        text: "Please login to boost your profile.",
      });
      return;
    }

    try {
      programmaticBoostCloseRef.current = true;
      setBoostDialogOpen(false);

      const confirmation = await Swal.fire({
        icon: "question",
        title: "Confirm New Boost",
        html: `
          <div style="font-size: 0.9rem; line-height: 1.35; text-align: left;">
            <p style="margin: 0 0 6px 0;"><strong>Targeting:</strong> ${boostCategory} audience in <strong>${normalizedTargetCounty}</strong>.</p>
            <p style="margin: 0 0 6px 0;"><strong>Duration:</strong> ${hours} hour${hours > 1 ? "s" : ""}</p>
            <p style="margin: 0 0 6px 0;"><strong>Radius:</strong> ${sanitizedBoostRadiusKm.toFixed(1)} km</p>
            <p style="font-size: 0.82rem; color: #555; margin: 0;">This will use ${hours} hour${hours > 1 ? "s" : ""} from your daily boost hours allowance. Use Extend Boost if you want to add time to an existing boost in the same area.</p>
          </div>
        `,
        width: 420,
        showCancelButton: true,
        confirmButtonText: "Boost Now",
        cancelButtonText: "Cancel",
        confirmButtonColor: "#D4AF37",
        cancelButtonColor: "#9E9E9E",
      });

      if (!confirmation.isConfirmed) {
        programmaticBoostCloseRef.current = false;
        openBoostDialog(false);
        return;
      }

      setBoosting(true);

      const response = await fetch("/api/tokens/boost", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          targetCategory: boostCategory,
          targetArea: normalizedTargetCounty,
          targetLatitude: boostLatitude,
          targetLongitude: boostLongitude,
          targetRadiusKm: sanitizedBoostRadiusKm,
          durationHours: hours,
        }),
      });

      const data = await response.json();

      // Handle subscription-related errors
      if (response.status === 402) {
        // No active subscription required
        programmaticBoostCloseRef.current = false;
        openBoostDialog(false);
        Swal.fire({
          icon: "warning",
          title: "Subscription Required",
          html: `<p>${data.message || "Active subscription required to boost your profile."}</p><p>Please subscribe to a plan to continue.</p>`,
          confirmButtonText: "View Plans",
          cancelButtonText: "Cancel",
          showCancelButton: true,
          confirmButtonColor: "#D4AF37",
          didOpen: () => {
            const swal = document.querySelector(".swal2-popup");
            if (swal) {
              swal.style.borderRadius = "20px";
            }
          },
        }).then((result) => {
          if (result.isConfirmed) {
            navigate("/pricing");
          }
        });
        return;
      }

      if (response.status === 403) {
        // Boost not available for current plan
        programmaticBoostCloseRef.current = false;
        openBoostDialog(false);
        Swal.fire({
          icon: "info",
          title: "Boost Not Available",
          html: `<p>${data.message || "Profile boosts are not available for your subscription plan."}</p><p>Upgrade to a plan that includes profile boosts to use this feature.</p>`,
          confirmButtonText: "View Plans",
          cancelButtonText: "Cancel",
          showCancelButton: true,
          confirmButtonColor: "#D4AF37",
          didOpen: () => {
            const swal = document.querySelector(".swal2-popup");
            if (swal) {
              swal.style.borderRadius = "20px";
            }
          },
        }).then((result) => {
          if (result.isConfirmed) {
            navigate("/pricing");
          }
        });
        return;
      }

      if (response.status === 429) {
        // Daily limit reached
        programmaticBoostCloseRef.current = true;
        setBoostDialogOpen(false);
        await new Promise((resolve) => setTimeout(resolve, 100));
        programmaticBoostCloseRef.current = false;
        Swal.fire({
          icon: "info",
          title: "Daily Boost Hours Limit Reached",
          html: `<p>${data.message || "You've used all your daily boost hours for today."}</p><p>Your daily limit will reset tomorrow. You can extend existing boosts if you have remaining hours available.</p>`,
          confirmButtonText: "OK",
          confirmButtonColor: "#D4AF37",
          didOpen: () => {
            const swal = document.querySelector(".swal2-popup");
            if (swal) {
              swal.style.borderRadius = "20px";
            }
          },
        });
        return;
      }

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to boost profile");
      }

      const createdBoost = data.data?.boost || null;

      const meResponse = await fetch("/api/public/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const meData = await meResponse.json();
      if (meData.success && typeof setUser === "function") {
        setUser(meData.data);
      } else if (typeof setUser === "function") {
        setUser((prev) =>
          prev
            ? {
                ...prev,
                active_boost_until:
                  createdBoost?.ends_at || prev.active_boost_until,
              }
            : prev
        );
      }

      const remainingInfo = getRemainingTimeForDate(createdBoost?.ends_at);
      if (remainingInfo) {
        setBoostTimeRemaining({
          hours: remainingInfo.hours,
          minutes: remainingInfo.minutes,
        });
      } else {
        setBoostTimeRemaining(null);
      }

      await fetchActiveBoosts();
      fetchFeaturedUsers();
      fetchFeaturedItems();
      fetchTargetedBoosts();

      Swal.fire({
        icon: "success",
        title: "Profile Boosted!",
        html: `
          <p>Your profile will be boosted for <strong>${hours} hour${hours > 1 ? "s" : ""}</strong>.</p>
          <p style="font-size: 0.9rem; color: rgba(26, 26, 26, 0.7);">
            Boost expires: ${
              createdBoost?.ends_at
                ? new Date(createdBoost.ends_at).toLocaleString()
                : "Soon"
            }
          </p>
        `,
        confirmButtonColor: "#D4AF37",
      });

      resetBoostForm();
      programmaticBoostCloseRef.current = false;
    } catch (err) {
      console.error("[Boost] create error:", err);
      programmaticBoostCloseRef.current = false;
      openBoostDialog(false);
      Swal.fire({
        icon: "error",
        title: "Boost Failed",
        text: err.message || "Failed to boost profile. Please try again later.",
        confirmButtonColor: "#D4AF37",
      });
    } finally {
      setBoosting(false);
    }
  };

  const handleExtendBoost = async (boostOverride = null) => {
    const boostToUse = boostOverride || selectedBoost;
    if (!boostToUse) {
      Swal.fire({
        icon: "info",
        title: "No Boost To Extend",
        text: "Create a boost in this area first, then you can extend it.",
        confirmButtonColor: "#D4AF37",
      });
      return;
    }

    if (boostOverride) {
      applyBoostContext(boostToUse);
      setBoostTargetEdited(false);
    }

    let dialogWasOpen = false;
    if (boostDialogOpen) {
      dialogWasOpen = true;
      programmaticBoostCloseRef.current = true;
      setBoostDialogOpen(false);
      await new Promise((resolve) => setTimeout(resolve, 0));
      programmaticBoostCloseRef.current = false;
    }

    const currentRadius =
      parseNumericValue(boostToUse.radius_km) ?? sanitizedBoostRadiusKm;
    const defaultHours = sanitizedBoostHours;
    const defaultRadius = Number.isFinite(currentRadius)
      ? Number(currentRadius)
      : sanitizedBoostRadiusKm;
    const currentEndsDate = boostToUse.ends_at
      ? new Date(boostToUse.ends_at)
      : null;
    const currentEndsLabel = currentEndsDate
      ? currentEndsDate.toLocaleString()
      : "Soon";
    const currentRemaining = getRemainingTimeForDate(boostToUse.ends_at);
    const currentRemainingLabel = currentRemaining
      ? `${currentRemaining.hours}h ${currentRemaining.minutes}m`
      : null;

    const adjustResult = await Swal.fire({
      icon: undefined,
      title: "Adjust Extension",
      html: `
        <div style="text-align: left; display: flex; flex-direction: column; gap: 10px; font-size: 0.82rem;">
          <div class="boost-extend-compact-summary"><strong>Current time left:</strong> ${
            currentRemainingLabel || "Calculating…"
          }</div>
          <div class="boost-extend-compact-summary"><strong>Current end time:</strong> ${currentEndsLabel}</div>
          <div class="boost-extend-compact-summary"><strong>Current radius:</strong> ${Number.isFinite(currentRadius) ? Number(currentRadius).toFixed(1) + " km" : "N/A"}</div>
          <div>
            <label for="extend-hours-input" style="font-weight: 600; font-size: 0.85rem;">Hours to add</label>
            <input id="extend-hours-input" type="number" class="swal2-input" style="margin-top: 4px; height: 36px; font-size: 0.82rem;" min="${MIN_BOOST_HOURS}" max="${maxBoostHours}" step="1" value="${defaultHours}" />
            <small style="display:block; margin-top:4px; color: rgba(26,26,26,0.6); font-size: 0.72rem;">
              Choose between ${MIN_BOOST_HOURS} and ${maxBoostHours} hours to add${boostHoursInfo?.maxDurationPerBoost ? ` (your ${subscription?.plan || "package"} plan allows up to ${maxBoostHours} hours per boost)` : ""}.
            </small>
          </div>
          <div style="display: flex; flex-direction: column; gap: 10px;">
            <div>
              <label style="font-weight: 600; font-size: 0.85rem;">Current radius (km)</label>
              <input type="number" class="swal2-input" style="margin-top: 4px; height: 36px; font-size: 0.82rem;" value="${
                Number.isFinite(currentRadius)
                  ? Number(currentRadius).toFixed(1)
                  : ""
              }" disabled />
            </div>
            <div>
              <label for="extend-radius-input" style="font-weight: 600; font-size: 0.85rem;">New radius (km)</label>
              <input id="extend-radius-input" type="number" class="swal2-input" style="margin-top: 4px; height: 36px; font-size: 0.82rem;" min="${MIN_BOOST_RADIUS_KM}" max="${MAX_BOOST_RADIUS_KM}" step="0.5" value="${defaultRadius.toFixed(
                1
              )}" />
            </div>
          </div>
          <small style="display:block; margin-top:4px; color: rgba(26,26,26,0.6); font-size: 0.72rem;">
            Allowed range: ${MIN_BOOST_RADIUS_KM} – ${MAX_BOOST_RADIUS_KM} km.
          </small>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "Review Extension",
      cancelButtonText: "Cancel",
      focusConfirm: false,
      width: 380,
      customClass: {
        popup: "boost-extend-compact",
        title: "boost-extend-compact-title",
        htmlContainer: "boost-extend-compact-body",
        confirmButton: "boost-extend-compact-confirm",
        cancelButton: "boost-extend-compact-cancel",
      },
      didOpen: () => {
        const hoursInput = document.getElementById("extend-hours-input");
        const radiusInput = document.getElementById("extend-radius-input");
        if (hoursInput) {
          hoursInput.value = defaultHours.toString();
        }
        if (radiusInput) {
          radiusInput.value = defaultRadius.toFixed(1);
        }
      },
      preConfirm: () => {
        const hoursValue = Number(
          document.getElementById("extend-hours-input")?.value
        );
        const radiusValue = Number(
          document.getElementById("extend-radius-input")?.value
        );

        if (
          !Number.isFinite(hoursValue) ||
          hoursValue < MIN_BOOST_HOURS ||
          hoursValue > maxBoostHours
        ) {
          Swal.showValidationMessage(
            `Hours must be between ${MIN_BOOST_HOURS} and ${maxBoostHours}.`
          );
          return false;
        }

        if (
          !Number.isFinite(radiusValue) ||
          radiusValue < MIN_BOOST_RADIUS_KM ||
          radiusValue > MAX_BOOST_RADIUS_KM
        ) {
          Swal.showValidationMessage(
            `Radius must be between ${MIN_BOOST_RADIUS_KM} and ${MAX_BOOST_RADIUS_KM} km.`
          );
          return false;
        }

        return {
          hours: Math.floor(hoursValue),
          radius: Number(radiusValue.toFixed(1)),
        };
      },
    });

    if (!adjustResult.isConfirmed || !adjustResult.value) {
      if (dialogWasOpen) {
        openBoostDialog(false);
      }
      return;
    }

    const adjustedHours = Math.min(
      maxBoostHours,
      Math.max(MIN_BOOST_HOURS, adjustResult.value.hours)
    );
    const adjustedRadius = Math.min(
      MAX_BOOST_RADIUS_KM,
      Math.max(MIN_BOOST_RADIUS_KM, adjustResult.value.radius)
    );

    setBoostHours(String(adjustedHours));
    setBoostRadiusKm(adjustedRadius);
    setBoostTargetEdited(true);

    const hours = adjustedHours;
    const extensionRadiusKm = adjustedRadius;
    const previousRadiusLabel = Number.isFinite(currentRadius)
      ? `${Number(currentRadius).toFixed(1)} km`
      : "N/A";
    const newRadiusLabel = `${extensionRadiusKm.toFixed(1)} km`;

    const token = localStorage.getItem("token");
    if (!token) {
      Swal.fire({
        icon: "error",
        title: "Authentication Required",
        text: "Please login to manage your boosts.",
        confirmButtonColor: "#D4AF37",
      });
      return;
    }

    try {
      programmaticBoostCloseRef.current = true;
      setBoostDialogOpen(false);

      const now = new Date();
      const baselineForPreview =
        currentEndsDate && currentEndsDate > now ? currentEndsDate : now;
      const previewEndsAt = new Date(
        baselineForPreview.getTime() + hours * 60 * 60 * 1000
      );
      const previewEndsText = previewEndsAt.toLocaleString();
      const previewRemaining = getRemainingTimeForDate(previewEndsAt);
      const previewRemainingLabel = previewRemaining
        ? `${previewRemaining.hours}h ${previewRemaining.minutes}m`
        : null;
      const currentEndsText = currentEndsLabel;
      const confirmation = await Swal.fire({
        icon: undefined,
        title: "Extend Existing Boost",
        html: `
          <div style="font-size: 0.9rem; line-height: 1.35; text-align: left;">
            <p style="margin: 0 0 6px 0;"><strong>Area:</strong> ${
              boostToUse.target_area || "Custom location"
            }</p>
            <p style="margin: 0 0 6px 0;"><strong>Current radius:</strong> ${
              boostToUse.radius_km
                ? Number.parseFloat(boostToUse.radius_km).toFixed(1)
                : "N/A"
            } km → <strong>${newRadiusLabel}</strong></p>
            <p style="margin: 0 0 6px 0;"><strong>Current end time:</strong> ${currentEndsText}</p>
            <p style="margin: 0 0 6px 0;"><strong>New end time:</strong> ${previewEndsText}${
              previewRemainingLabel
                ? ` (${previewRemainingLabel} from now)`
                : ""
            }</p>
            <p style="margin: 0 0 10px 0;"><strong>Extension:</strong> Add ${hours} hour${
              hours > 1 ? "s" : ""
            } to this boost. This will use ${hours} hour${hours > 1 ? "s" : ""} from your daily boost hours allowance.</p>
            <p style="font-size: 0.82rem; color: #555; margin: 0;">Extending keeps the same target area and audience.</p>
          </div>
        `,
        width: 420,
        showCancelButton: true,
        confirmButtonText: "Extend Boost",
        cancelButtonText: "Cancel",
        confirmButtonColor: "#D4AF37",
        cancelButtonColor: "#9E9E9E",
      });

      if (!confirmation.isConfirmed) {
        programmaticBoostCloseRef.current = false;
        openBoostDialog(false);
        return;
      }

      setBoosting(true);

      const response = await fetch(
        `/api/tokens/boost/${boostToUse.id}/extend`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            additionalHours: hours,
            targetRadiusKm: extensionRadiusKm,
          }),
        }
      );

      const data = await response.json();

      if (response.status === 402) {
        // Subscription required
        Swal.fire({
          icon: "warning",
          title: "Subscription Required",
          html: `<p>${data.message || "Active subscription required to extend your boost."}</p><p>Please subscribe to a plan to continue.</p>`,
          confirmButtonText: "View Plans",
          cancelButtonText: "Cancel",
          showCancelButton: true,
          confirmButtonColor: "#D4AF37",
          didOpen: () => {
            const swal = document.querySelector(".swal2-popup");
            if (swal) {
              swal.style.borderRadius = "20px";
            }
          },
        }).then((result) => {
          if (result.isConfirmed) {
            navigate("/pricing");
          }
        });
        programmaticBoostCloseRef.current = false;
        openBoostDialog(false);
        return;
      }

      if (response.status === 429) {
        // Daily limit reached
        programmaticBoostCloseRef.current = true;
        setBoostDialogOpen(false);
        await new Promise((resolve) => setTimeout(resolve, 100));
        programmaticBoostCloseRef.current = false;
        Swal.fire({
          icon: "info",
          title: "Daily Boost Hours Limit Reached",
          html: `<p>${data.message || "You've used all your daily boost hours for today."}</p><p>Your daily limit will reset tomorrow.</p>`,
          confirmButtonText: "OK",
          confirmButtonColor: "#D4AF37",
          didOpen: () => {
            const swal = document.querySelector(".swal2-popup");
            if (swal) {
              swal.style.borderRadius = "20px";
            }
          },
        });
        return;
      }

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to extend boost");
      }

      const updatedBoost = data.data?.boost || null;

      const meResponse = await fetch("/api/public/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const meData = await meResponse.json();
      if (meData.success && typeof setUser === "function") {
        setUser(meData.data);
      } else if (typeof setUser === "function") {
        setUser((prev) =>
          prev
            ? {
                ...prev,
                active_boost_until:
                  updatedBoost?.ends_at || prev.active_boost_until,
              }
            : prev
        );
      }

      const remainingInfo = getRemainingTimeForDate(updatedBoost?.ends_at);
      if (remainingInfo) {
        setBoostTimeRemaining({
          hours: remainingInfo.hours,
          minutes: remainingInfo.minutes,
        });
      } else {
        setBoostTimeRemaining(null);
      }

      await fetchActiveBoosts();
      fetchFeaturedUsers();
      fetchFeaturedItems();
      fetchTargetedBoosts();

      Swal.fire({
        icon: "success",
        title: "Boost Extended",
        html: `
          <p>You added <strong>${hours} hour${
            hours > 1 ? "s" : ""
          }</strong> to your boost.</p>
          <p style="font-size: 0.9rem; color: rgba(26, 26, 26, 0.7); margin-bottom: 4px;">
            Previous expiry: ${currentEndsText}
          </p>
          <p style="font-size: 0.9rem; color: rgba(26, 26, 26, 0.7); margin-bottom: 4px;">
            New expiry: ${
              updatedBoost?.ends_at
                ? new Date(updatedBoost.ends_at).toLocaleString()
                : previewEndsText
            }
          </p>
          ${
            previewRemainingLabel
              ? `<p style="font-size: 0.82rem; color: rgba(26,26,26,0.6); margin-bottom: 6px;">Time remaining now: ${previewRemainingLabel}.</p>`
              : ""
          }
          <p style="font-size: 0.82rem; color: rgba(26,26,26,0.6);">
            Radius: <strong>${previousRadiusLabel}</strong> → <strong>${newRadiusLabel}</strong>.
          </p>
        `,
        confirmButtonColor: "#D4AF37",
      });

      resetBoostForm();
      programmaticBoostCloseRef.current = false;
    } catch (err) {
      console.error("[Boost] extend error:", err);
      programmaticBoostCloseRef.current = false;
      openBoostDialog(false);
      Swal.fire({
        icon: "error",
        title: "Extension Failed",
        text:
          err.message || "Failed to extend your boost. Please try again later.",
        confirmButtonColor: "#D4AF37",
      });
    } finally {
      setBoosting(false);
    }
  };

  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    if (imagePath.startsWith("http")) return imagePath;
    if (imagePath.startsWith("/")) return imagePath;
    return `/uploads/${imagePath}`;
  };

  const buildImageUrl = (imageUrl) => {
    if (!imageUrl) return "";
    if (imageUrl.startsWith("http")) return imageUrl;
    if (imageUrl.startsWith("uploads/")) return `/${imageUrl}`;
    if (imageUrl.startsWith("/uploads/")) return imageUrl;
    if (imageUrl.startsWith("profiles/")) return `/uploads/${imageUrl}`;
    return imageUrl;
  };

  // Get all images for a user (main photo + photos array)
  const getAllImages = (userData) => {
    const images = [];
    // Add main photo if it exists (only approved)
    if (userData.photo && userData.photo_moderation_status === "approved") {
      images.push(buildImageUrl(userData.photo));
    }
    // Add photos from array if they exist (only approved photos)
    if (userData.photos && Array.isArray(userData.photos)) {
      userData.photos.forEach((photo) => {
        if (photo.path && photo.moderation_status === "approved") {
          images.push(buildImageUrl(photo.path));
        }
      });
    }
    return images;
  };

  const handleWhatsAppClick = (item) => {
    const phoneNumber = item.whatsapp_number || "";
    const cleanedNumber = phoneNumber.replace(/[^0-9+]/g, "");
    const message = encodeURIComponent(
      `Hi! I'm interested in ${item.title} (KES ${parseFloat(item.price).toLocaleString()}). Can you provide more details?`
    );

    if (cleanedNumber) {
      const whatsappUrl = `https://wa.me/${cleanedNumber}?text=${message}`;
      window.open(whatsappUrl, "_blank");
    } else {
      Swal.fire({
        icon: "warning",
        title: "No WhatsApp Number",
        text: "This item doesn't have a WhatsApp contact. Please contact support.",
        confirmButtonColor: "#D4AF37",
      });
    }
  };

  // Check if user has active subscription
  const hasActiveSubscription = subscription?.status === "active";

  // Show subscription required dialog
  const showSubscriptionRequiredDialog = (itemName, reason) => {
    Swal.fire({
      icon: "info",
      title: "Subscription Required",
      html: `
        <div style="text-align: left;">
          <p style="margin-bottom: 12px; font-size: 0.9rem; color: #333;">
            <strong>${itemName}</strong> requires an active subscription.
          </p>
          <div style="background: #f5f5f5; padding: 12px; border-radius: 8px; margin-bottom: 12px;">
            <p style="margin: 0; font-size: 0.85rem; color: #666; line-height: 1.4;">
              ${reason}
            </p>
          </div>
          <p style="margin: 0; font-size: 0.85em; color: #333;">
            Subscribe now to unlock all premium features and get the most out of TuVibe!
          </p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "View Plans",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#D4AF37",
      cancelButtonColor: "#666",
      didOpen: () => {
        const swal = document.querySelector(".swal2-popup");
        const isSmallScreen = window.innerWidth <= 768;

        if (swal) {
          swal.style.borderRadius = "20px";
          swal.style.border = "1px solid rgba(212, 175, 55, 0.3)";
          swal.style.boxShadow = "0 20px 60px rgba(212, 175, 55, 0.25)";

          if (isSmallScreen) {
            swal.style.maxWidth = "90vw";
            swal.style.width = "90vw";
            swal.style.padding = "1rem";
            swal.style.maxHeight = "90vh";
            swal.style.overflowY = "auto";
          }
        }

        if (isSmallScreen) {
          // Reduce icon size on mobile
          const icon = document.querySelector(".swal2-icon");
          if (icon) {
            icon.style.width = "3rem";
            icon.style.height = "3rem";
            icon.style.marginBottom = "0.5rem";
          }
          // Reduce title size on mobile
          const title = document.querySelector(".swal2-title");
          if (title) {
            title.style.fontSize = "1.25rem";
            title.style.padding = "0.5rem 0";
          }
          // Reduce content padding on mobile
          const content = document.querySelector(".swal2-html-container");
          if (content) {
            content.style.padding = "0.5rem 0";
          }
          // Reduce button container padding on mobile
          const actions = document.querySelector(".swal2-actions");
          if (actions) {
            actions.style.marginTop = "0.75rem";
            actions.style.padding = "0";
          }
          // Make buttons more compact on mobile
          const buttons = document.querySelectorAll(
            ".swal2-confirm, .swal2-cancel"
          );
          buttons.forEach((btn) => {
            btn.style.padding = "0.5rem 1rem";
            btn.style.fontSize = "0.875rem";
            btn.style.margin = "0.25rem";
          });
        }
      },
    }).then((result) => {
      if (result.isConfirmed) {
        navigate("/pricing");
      }
    });
  };

  const handleViewMarket = () => {
    if (!hasActiveSubscription) {
      showSubscriptionRequiredDialog(
        "TuVibe Market",
        "TuVibe Market is where members buy and sell items within the community. Subscribe to access the marketplace and start trading with verified members."
      );
      return;
    }
    navigate("/market");
  };

  const handleViewExplore = () => {
    if (!hasActiveSubscription) {
      showSubscriptionRequiredDialog(
        "Explore",
        "Explore lets you discover and connect with other members based on your preferences. Subscribe to unlock unlimited profile browsing and find your perfect match."
      );
      return;
    }
    navigate("/explore");
  };

  const handleScrollToUserLists = (tab) => {
    setUserListsTab(tab);
    if (favoritesSectionRef.current) {
      favoritesSectionRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

  const fetchTargetedBoosts = useCallback(async () => {
    if (!user?.category) {
      setTargetedBoosts([]);
      setTargetedBoostsError("Set your category to see boosts targeting you.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setTargetedBoosts([]);
      setTargetedBoostsError("Login to view boosts targeting you.");
      return;
    }

    const latForQuery =
      viewerLatitude ?? parseNumericValue(user?.latitude) ?? null;
    const lngForQuery =
      viewerLongitude ?? parseNumericValue(user?.longitude) ?? null;

    if (latForQuery === null || lngForQuery === null) {
      setTargetedBoosts([]);
      setTargetedBoostsError(
        "Enable location services to see boosts targeting your current area."
      );
      return;
    }

    setLoadingTargetedBoosts(true);
    setTargetedBoostsError(null);
    try {
      const params = new URLSearchParams();
      params.set("category", user.category);
      params.set("lat", latForQuery);
      params.set("lng", lngForQuery);

      const response = await fetchWithTimeout(
        `/api/public/boosts/targeted?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
        8000
      );
      const data = await response.json();
      if (response.ok && data.success) {
        setTargetedBoosts(data.data?.matches || []);
        setTargetedBoostsError(null);
      } else {
        setTargetedBoosts([]);
        setTargetedBoostsError(
          data.message || "Unable to load boosts targeting you right now."
        );
      }
    } catch (err) {
      console.error("Error fetching targeted boosts:", err);
      setTargetedBoosts([]);
      setTargetedBoostsError(
        "We couldn't refresh boosts for your location. Please try again."
      );
    } finally {
      setLoadingTargetedBoosts(false);
    }
  }, [
    user?.category,
    user?.latitude,
    user?.longitude,
    viewerLatitude,
    viewerLongitude,
  ]);

  useEffect(() => {
    fetchTargetedBoosts();
  }, [fetchTargetedBoosts]);

  const handleRefreshTargetedBoosts = () => {
    requestCurrentLocation({
      applyToBoost: false,
      onComplete: () => {
        fetchTargetedBoosts();
      },
    });
  };

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: "100%",
        overflowX: "hidden",
        boxSizing: "border-box",
        "& button:focus, & button:focus-visible": {
          outline: "none",
          boxShadow: "none",
        },
        "& .MuiButton-root:focus, & .MuiButton-root:focus-visible": {
          outline: "none",
          boxShadow: "none",
        },
        "& .MuiIconButton-root:focus, & .MuiIconButton-root:focus-visible": {
          outline: "none",
          boxShadow: "none",
        },
        "& .MuiTab-root:focus, & .MuiTab-root:focus-visible": {
          outline: "none",
          boxShadow: "none",
        },
        "& .MuiCard-root:focus, & .MuiCard-root:focus-visible": {
          outline: "none",
          boxShadow: "none",
        },
      }}
    >
      {/* Welcome Section */}
      <Box
        sx={{
          mb: 4,
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          alignItems: { xs: "flex-start", sm: "center" },
          justifyContent: "space-between",
          gap: 2,
        }}
      >
        <Box>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              mb: { xs: 1, sm: 0.5 },
              fontSize: {
                xs: "1.2rem",
                sm: "1.4rem",
                md: "1.5rem",
                lg: "1.6rem",
              },
              whiteSpace: { xs: "normal", md: "nowrap" },
              overflow: "hidden",
              textOverflow: "ellipsis",
              background:
                "linear-gradient(90deg, #D4AF37 0%, #f4d03f 25%, #FFD700 50%, #B8941F 75%, #8B6914 100%)",
              backgroundSize: "200% 200%",
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              animation: `${colorShift} 6s ease-in-out infinite`,
            }}
          >
            Welcome back, {user?.name || "User"}!
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: "rgba(26, 26, 26, 0.7)",
              fontSize: { xs: "0.75rem", sm: "0.8rem", md: "0.85rem" },
              whiteSpace: { xs: "normal", lg: "nowrap" },
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            Discover, connect, and explore the TuVibe community
          </Typography>
        </Box>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "auto 1fr", sm: "auto auto auto" },
            alignItems: "center",
            columnGap: { xs: 1, sm: 1.5 },
            rowGap: { xs: 1, sm: 0 },
            width: "100%",
            justifyContent: { sm: "flex-end" },
          }}
        >
          <Button
            sx={{
              position: "relative",
              borderRadius: "999px",
              padding: { xs: "8px 16px", sm: "10px 28px" },
              mt: { xs: 2, sm: 2.5, md: 3 },
              background:
                "linear-gradient(135deg, rgba(255, 220, 128, 1), rgba(212, 175, 55, 1))",
              color: "#1a1a1a",
              fontWeight: 700,
              textTransform: "none",
              letterSpacing: "0.5px",
              display: "inline-flex",
              alignItems: "center",
              gap: 1,
              transition: "all 0.3s ease",
              boxShadow: `
                0 18px 28px rgba(212, 175, 55, 0.45),
                0 12px 20px rgba(0, 0, 0, 0.12)
                `,
              border: "1px solid rgba(212, 175, 55, 0.4)",
              minWidth: { xs: "auto", sm: "unset" },
              flexShrink: 0,
              "&::before": {
                content: '""',
                position: "absolute",
                inset: { xs: "-6px", sm: "-8px", md: "-10px" },
                borderRadius: "999px",
                border: "1px solid rgba(212, 175, 55, 0.35)",
                boxShadow: `
                  0 0 16px rgba(212, 175, 55, 0.4),
                  0 0 40px rgba(255, 215, 0, 0.35)
                `,
                opacity: 0,
                transition: "opacity 0.4s ease",
              },
              "&:hover": {
                background:
                  "linear-gradient(135deg, rgba(255, 230, 80, 1), rgba(212, 175, 55, 1))",
                boxShadow: `
                  0 18px 32px rgba(212, 175, 55, 0.45),
                  0 0 18px rgba(255, 215, 0, 0.75)
                `,
                transform: "translateY(-2px)",
                "&::before": {
                  opacity: 0.8,
                },
              },
              "&:active": {
                transform: "translateY(0)",
                boxShadow: `
                  0 10px 20px rgba(212, 175, 55, 0.35),
                  0 0 12px rgba(255, 215, 0, 0.6)
                `,
              },
              "&::after": {
                content: '""',
                position: "absolute",
                inset: { xs: "-12px", sm: "-10px", md: "-12px" },
                borderRadius: "999px",
                border: "2px solid rgba(255, 215, 0, 0.6)",
                boxShadow: "0 0 18px rgba(255, 215, 0, 0.55)",
                opacity: 0.5,
                animation: `${goldShine} 3.2s ease-in-out infinite`,
                pointerEvents: "none",
                zIndex: -1,
              },
            }}
            onClick={handleBoostButtonClick}
            disabled={boosting}
          >
            Boost Profile
          </Button>
          <Box
            sx={{
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
              gap: { xs: 1, sm: 1.25 },
            }}
          >
            <Tooltip title={targetedTooltip} arrow>
              <span>
                <IconButton
                  onClick={handleOpenTargetedDialog}
                  disabled={loadingTargetedBoosts || targetedCount === 0}
                  sx={{
                    backgroundColor: "rgba(212, 175, 55, 0.12)",
                    border: "1px solid rgba(212, 175, 55, 0.3)",
                    "&:hover": {
                      backgroundColor: "rgba(212, 175, 55, 0.22)",
                    },
                    flexShrink: 0,
                  }}
                >
                  <Badge
                    badgeContent={targetedCount}
                    color="error"
                    overlap="circular"
                  >
                    <GpsFixed sx={{ color: "#D4AF37" }} />
                  </Badge>
                </IconButton>
              </span>
            </Tooltip>
            {(isPremiumUser || hasActiveBoost) && (
              <Tooltip title="View profile statistics" arrow>
                <span>
                  <IconButton
                    onClick={handleOpenStatsDialog}
                    sx={{
                      backgroundColor: "rgba(212, 175, 55, 0.12)",
                      border: "1px solid rgba(212, 175, 55, 0.3)",
                      "&:hover": {
                        backgroundColor: "rgba(212, 175, 55, 0.22)",
                      },
                      flexShrink: 0,
                    }}
                  >
                    <BarChart sx={{ color: "#D4AF37" }} />
                  </IconButton>
                </span>
              </Tooltip>
            )}
          </Box>
        </Box>
      </Box>

      {/* Stories Section */}
      <Card
        key="stories-card"
        sx={{
          p: { xs: 2, sm: 2.5 },
          pb: { xs: 2, sm: 2.5 },
          mb: 4,
          borderRadius: "16px",
          background:
            "linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(245, 230, 211, 0.2) 100%)",
          border: "1px solid rgba(212, 175, 55, 0.2)",
          boxShadow: "0 4px 20px rgba(212, 175, 55, 0.1)",
          // Fixed height to prevent layout shift during loading
          minHeight: "220px", // StoriesFeed content (180px) + card padding
          height: "220px",
          display: "flex",
          flexDirection: "column",
          width: "100%",
          maxWidth: "100%",
          overflow: "hidden",
          boxSizing: "border-box",
        }}
      >
        {user && (
          <ErrorBoundary
            fallbackMessage="Unable to load stories. Please refresh the page."
            onReset={() => {
              // Reset any relevant state if needed
            }}
          >
            <StoriesFeed
              key={`stories-feed-${user?.id || "default"}`}
              user={user}
              onStoryClick={(storyGroup) => {
                if (storyGroup) {
                  setSelectedStoryGroup(storyGroup);
                  setStoryViewerOpen(true);
                }
              }}
              onCreateStory={() => setStoryCreatorOpen(true)}
              onStoriesLoaded={(groups) => {
                if (groups && Array.isArray(groups)) {
                  // Filter out current user's story from navigation order
                  // User's story should be visible in feed but excluded from navigation sequence
                  const navigationGroups = groups.filter(
                    (group) => group?.user?.id !== user?.id
                  );
                  setStoryGroups(navigationGroups);
                }
              }}
              refreshTrigger={storyCreated}
              onRefresh={(refreshFn) => {
                storiesFeedRefreshRef.current = refreshFn;
              }}
            />
          </ErrorBoundary>
        )}
      </Card>

      {/* Quick Access Cards */}
      <Box
        sx={{
          display: "flex",
          gap: 2,
          mb: 4,
          flexDirection: { xs: "column", sm: "row" },
          justifyContent: { xs: "center", sm: "space-between" },
          alignItems: { xs: "center", sm: "stretch" },
          width: "100%",
        }}
      >
        <Card
          onClick={() => handleScrollToUserLists("favorites")}
          sx={{
            flex: { xs: "0 1 auto", sm: "1 1 0%" },
            width: { xs: "85%", sm: "auto" },
            maxWidth: { xs: "320px", sm: "none" },
            minWidth: { xs: "auto", sm: 220, md: 260 },
            p: { xs: 0.75, sm: 1.25, md: 1.5 },
            mx: { xs: "auto", sm: 0 },
            ml: { xs: "auto", sm: 2.5, md: 3 },
            borderRadius: "16px",
            textTransform: "none",
            cursor: "pointer",
            position: "relative",
            color: "rgba(0, 0, 0, 0.9)",
            border: "2px solid rgba(255, 255, 255, 0.5)",
            fontWeight: 700,
            letterSpacing: "0.5px",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            backgroundColor: "rgba(255, 255, 255, 0.3)",
            boxShadow: `
              0 10px 40px rgba(0, 0, 0, 0.15),
              0 0 0 1px rgba(255, 255, 255, 0.3) inset,
              0 2px 0 rgba(255, 255, 255, 0.6) inset,
              0 -1px 8px rgba(0, 0, 0, 0.1) inset,
              0 0 20px rgba(255, 215, 0, 0.1)
            `,
            transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
            overflow: "hidden",
            "&::before": {
              content: '""',
              position: "absolute",
              top: 0,
              left: "-100%",
              width: "100%",
              height: "100%",
              background:
                "linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.5), transparent)",
              transition: "left 0.6s ease",
            },
            "&:hover": {
              backgroundColor: "rgba(255, 255, 255, 0.45)",
              borderColor: "rgba(255, 255, 255, 0.8)",
              borderWidth: "2px",
              transform: "translateY(-2px) scale(1.02)",
              boxShadow: `
                0 0 30px rgba(255, 215, 0, 0.4),
                0 15px 50px rgba(0, 0, 0, 0.2),
                0 0 0 1px rgba(255, 255, 255, 0.4) inset,
                0 3px 0 rgba(255, 255, 255, 0.7) inset,
                0 -1px 12px rgba(0, 0, 0, 0.15) inset,
                0 0 30px rgba(255, 215, 0, 0.2)
              `,
              "&::before": {
                left: "100%",
              },
            },
            "&:active": {
              transform: "translateY(0) scale(1)",
              boxShadow: `
                0 0 20px rgba(255, 215, 0, 0.3),
                0 8px 30px rgba(0, 0, 0, 0.15),
                0 0 0 1px rgba(255, 255, 255, 0.3) inset,
                0 1px 0 rgba(255, 255, 255, 0.5) inset
              `,
            },
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: { xs: 0.5, sm: 1, md: 1.25 },
            }}
          >
            <Favorite
              sx={{
                fontSize: { xs: "1.1rem", sm: "1.55rem", md: "1.75rem" },
                color: "#ff6b9d",
              }}
            />
            <Typography
              variant="h6"
              noWrap
              sx={{
                fontWeight: 900,
                fontSize: {
                  xs: "0.65rem",
                  sm: "0.9rem",
                  md: "1.05rem",
                  lg: "1.2rem",
                },
                lineHeight: { xs: 1.5, sm: 1.4, md: 1.3 },
                textAlign: "center",
              }}
            >
              Meet Your Favorites
            </Typography>
          </Box>
        </Card>

        <Card
          onClick={() => handleScrollToUserLists("unlocked")}
          sx={{
            flex: { xs: "0 1 auto", sm: "1 1 0%" },
            width: { xs: "85%", sm: "auto" },
            maxWidth: { xs: "320px", sm: "none" },
            minWidth: { xs: "auto", sm: 220, md: 260 },
            p: { xs: 0.75, sm: 1.25, md: 1.5 },
            mx: { xs: "auto", sm: 0 },
            mr: { xs: "auto", sm: 2.5, md: 3 },
            borderRadius: "16px",
            textTransform: "none",
            cursor: "pointer",
            position: "relative",
            color: "rgba(0, 0, 0, 0.9)",
            border: "2px solid rgba(255, 255, 255, 0.5)",
            fontWeight: 700,
            letterSpacing: "0.5px",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            backgroundColor: "rgba(255, 255, 255, 0.3)",
            boxShadow: `
              0 10px 40px rgba(0, 0, 0, 0.15),
              0 0 0 1px rgba(255, 255, 255, 0.3) inset,
              0 2px 0 rgba(255, 255, 255, 0.6) inset,
              0 -1px 8px rgba(0, 0, 0, 0.1) inset,
              0 0 20px rgba(255, 215, 0, 0.1)
            `,
            transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
            overflow: "hidden",
            "&::before": {
              content: '""',
              position: "absolute",
              top: 0,
              left: "-100%",
              width: "100%",
              height: "100%",
              background:
                "linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.5), transparent)",
              transition: "left 0.6s ease",
            },
            "&:hover": {
              backgroundColor: "rgba(255, 255, 255, 0.45)",
              borderColor: "rgba(255, 255, 255, 0.8)",
              borderWidth: "2px",
              transform: "translateY(-2px) scale(1.02)",
              boxShadow: `
                0 0 30px rgba(255, 215, 0, 0.4),
                0 15px 50px rgba(0, 0, 0, 0.2),
                0 0 0 1px rgba(255, 255, 255, 0.4) inset,
                0 3px 0 rgba(255, 255, 255, 0.7) inset,
                0 -1px 12px rgba(0, 0, 0, 0.15) inset,
                0 0 30px rgba(255, 215, 0, 0.2)
              `,
              "&::before": {
                left: "100%",
              },
            },
            "&:active": {
              transform: "translateY(0) scale(1)",
              boxShadow: `
                0 0 20px rgba(255, 215, 0, 0.3),
                0 8px 30px rgba(0, 0, 0, 0.15),
                0 0 0 1px rgba(255, 255, 255, 0.3) inset,
                0 1px 0 rgba(255, 255, 255, 0.5) inset
              `,
            },
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: { xs: 0.5, sm: 1, md: 1.25 },
            }}
          >
            <LockOpen
              sx={{
                fontSize: { xs: "1.1rem", sm: "1.55rem", md: "1.75rem" },
                color: "#D4AF37",
              }}
            />
            <Typography
              variant="h6"
              noWrap
              sx={{
                fontWeight: 900,
                fontSize: {
                  xs: "0.65rem",
                  sm: "0.9rem",
                  md: "1.05rem",
                  lg: "1.2rem",
                },
                lineHeight: { xs: 1.5, sm: 1.4, md: 1.3 },
                textAlign: "center",
              }}
            >
              View Unlocked Chats
            </Typography>
          </Box>
        </Card>
      </Box>

      {/* Featured Users Carousel */}
      <Card
        sx={{
          p: 4,
          mb: 4,
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
            justifyContent: "space-between",
            alignItems: "center",
            mb: 3,
          }}
        >
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              color: "#1a1a1a",
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            <TrendingUp sx={{ color: "#D4AF37" }} />
            Featured Profiles
          </Typography>
          <Button
            variant="text"
            onClick={handleViewExplore}
            sx={{
              color: "#D4AF37",
              fontWeight: 600,
              textTransform: "none",
              "&:hover": {
                backgroundColor: "rgba(212, 175, 55, 0.1)",
              },
            }}
          >
            View All
          </Button>
        </Box>
        {loadingFeaturedUsers ? (
          <Box
            sx={{
              display: "flex",
              gap: 2,
              flexDirection: { xs: "column", sm: "row" },
              flexWrap: "wrap",
            }}
          >
            {Array.from({ length: 10 }).map((_, idx) => (
              <Card
                key={`fu-skel-${idx}`}
                sx={{
                  flex: {
                    xs: "0 0 100%",
                    sm: "0 0 calc(50% - 8px)",
                    md: "0 0 calc(20% - 16px)",
                  },
                  borderRadius: "12px",
                  overflow: "hidden",
                  border: "1px solid rgba(212, 175, 55, 0.2)",
                }}
              >
                <Skeleton variant="rectangular" height={200} />
                <CardContent sx={{ p: 2 }}>
                  <Skeleton width="60%" />
                  <Skeleton width="40%" />
                </CardContent>
              </Card>
            ))}
          </Box>
        ) : featuredUsers.length > 0 ? (
          <Box
            sx={{
              display: "flex",
              gap: 2,
              flexDirection: { xs: "column", sm: "row" },
              flexWrap: "wrap",
            }}
          >
            {featuredUsers.slice(0, 10).map((featuredUser) => {
              const images = getAllImages(featuredUser);
              const currentIdx = currentImageIndex[featuredUser.id] || 0;
              const featuredBoostUntil =
                featuredUser.active_boost_until ??
                featuredUser.is_featured_until;
              const displayName =
                (typeof featuredUser.name === "string" &&
                  featuredUser.name.trim()) ||
                (typeof featuredUser.username === "string" &&
                  featuredUser.username.trim()) ||
                "Member";
              const displayUsername =
                typeof featuredUser.username === "string" &&
                featuredUser.username.trim() &&
                featuredUser.username.trim().toLowerCase() !==
                  displayName.trim().toLowerCase()
                  ? featuredUser.username.trim()
                  : "";

              return (
                <Card
                  key={featuredUser.id}
                  sx={{
                    flex: {
                      xs: "0 0 100%",
                      sm: "0 0 calc(50% - 8px)",
                      md: "0 0 calc(20% - 16px)",
                    },
                    display: "flex",
                    flexDirection: "column",
                    borderRadius: "12px",
                    overflow: "hidden",
                    transition: "all 0.3s ease",
                    border: "1px solid rgba(212, 175, 55, 0.2)",
                    cursor: "pointer",
                    "&:hover": {
                      transform: "translateY(-4px)",
                      boxShadow: "0 8px 24px rgba(212, 175, 55, 0.3)",
                    },
                  }}
                  onClick={handleViewExplore}
                >
                  {images.length > 0 ? (
                    <Box
                      sx={{
                        position: "relative",
                        width: "100%",
                        height: 200,
                        overflow: "hidden",
                        bgcolor: "rgba(212, 175, 55, 0.1)",
                        contentVisibility: "auto",
                        containIntrinsicSize: "300px 200px",
                      }}
                    >
                      {(() => {
                        // Map original indices to valid images (not failed)
                        const validImagesWithIndices = images
                          .map((image, originalIndex) => ({
                            image,
                            originalIndex,
                            isValid: image && !failedImages.has(image),
                          }))
                          .filter((img) => img.isValid);

                        return validImagesWithIndices.map((imgData) => {
                          // Use original index for visibility check
                          const isVisible =
                            currentIdx === imgData.originalIndex;
                          return (
                            <Box
                              key={`featured-${featuredUser.id}-img-${imgData.originalIndex}`}
                              component="img"
                              src={imgData.image}
                              loading="lazy"
                              decoding="async"
                              fetchpriority="low"
                              alt={featuredUser.name}
                              sx={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                                opacity: isVisible ? 1 : 0,
                                transition: "opacity 1.5s ease-in-out",
                                zIndex: isVisible ? 1 : 0,
                                pointerEvents: isVisible ? "auto" : "none",
                                visibility: isVisible ? "visible" : "hidden",
                              }}
                              onError={() => {
                                if (!isMountedRef.current) return;
                                // Track failed images in state instead of manipulating DOM
                                if (imgData.image) {
                                  setFailedImages((prev) =>
                                    new Set(prev).add(imgData.image)
                                  );
                                }
                              }}
                            />
                          );
                        });
                      })()}
                    </Box>
                  ) : (
                    <Box
                      sx={{
                        width: "100%",
                        height: 200,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        bgcolor: "rgba(212, 175, 55, 0.1)",
                      }}
                    >
                      <Person
                        sx={{ fontSize: 64, color: "#D4AF37", opacity: 0.3 }}
                      />
                    </Box>
                  )}
                  <CardContent sx={{ p: 2 }}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        mb: 1,
                        flexWrap: "wrap",
                      }}
                    >
                      <Box sx={{ display: "flex", flexDirection: "column" }}>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                            flexWrap: "wrap",
                          }}
                        >
                          <Typography
                            variant="subtitle2"
                            sx={{
                              fontWeight: 700,
                              color: "#1a1a1a",
                              fontSize: "0.9rem",
                              lineHeight: 1.2,
                            }}
                          >
                            {displayName}
                          </Typography>
                          {featuredUser.isVerified && (
                            <Chip
                              icon={
                                <Verified
                                  sx={{
                                    fontSize: "0.875rem !important",
                                    color:
                                      featuredUser.badgeType === "silver"
                                        ? "#C0C0C0"
                                        : "#D4AF37",
                                  }}
                                />
                              }
                              label={
                                featuredUser.badgeType === "silver"
                                  ? "Premium Silver"
                                  : featuredUser.badgeType === "gold"
                                    ? "Gold Verified"
                                    : "Verified"
                              }
                              size="small"
                              sx={{
                                bgcolor:
                                  featuredUser.badgeType === "silver"
                                    ? "rgba(192, 192, 192, 0.15)"
                                    : "rgba(212, 175, 55, 0.15)",
                                color: "#1a1a1a",
                                fontWeight: 600,
                                fontSize: "0.65rem",
                                height: 20,
                                border:
                                  featuredUser.badgeType === "silver"
                                    ? "1px solid rgba(192, 192, 192, 0.3)"
                                    : "1px solid rgba(212, 175, 55, 0.3)",
                                "& .MuiChip-icon": {
                                  marginLeft: "6px",
                                },
                              }}
                            />
                          )}
                        </Box>
                        {displayUsername && (
                          <Typography
                            variant="caption"
                            sx={{
                              color: "rgba(26, 26, 26, 0.6)",
                              fontWeight: 600,
                            }}
                          >
                            @{displayUsername}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 0.5,
                        mb: 0.5,
                      }}
                    >
                      <LocationOn
                        sx={{ fontSize: 12, color: "rgba(26, 26, 26, 0.6)" }}
                      />
                      <Typography
                        variant="caption"
                        sx={{ color: "rgba(26, 26, 26, 0.7)" }}
                      >
                        {featuredUser.county}
                      </Typography>
                    </Box>
                    <Box
                      sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                    >
                      <Cake
                        sx={{ fontSize: 12, color: "rgba(26, 26, 26, 0.6)" }}
                      />
                      <Typography
                        variant="caption"
                        sx={{ color: "rgba(26, 26, 26, 0.7)" }}
                      >
                        {featuredUser.age} years
                      </Typography>
                    </Box>
                    {featuredBoostUntil &&
                      new Date(featuredBoostUntil) > new Date() && (
                        <Chip
                          label="Boosted"
                          size="small"
                          sx={{
                            mt: 1,
                            bgcolor: "#D4AF37",
                            color: "#1a1a1a",
                            fontWeight: 600,
                            fontSize: "0.65rem",
                            height: 20,
                          }}
                          icon={
                            <TrendingUp
                              sx={{ fontSize: 12, color: "#1a1a1a" }}
                            />
                          }
                        />
                      )}
                  </CardContent>
                </Card>
              );
            })}
          </Box>
        ) : (
          <Box
            sx={{
              textAlign: "center",
              py: 4,
              px: 2,
            }}
          >
            <Person
              sx={{ fontSize: 64, color: "#D4AF37", opacity: 0.3, mb: 2 }}
            />
            <Typography variant="h6" sx={{ color: "#666", mb: 1 }}>
              No featured profiles yet
            </Typography>
            <Typography variant="body2" sx={{ color: "#999" }}>
              Boost your profile to appear here!
            </Typography>
          </Box>
        )}
      </Card>

      {/* Featured Items Carousel */}
      <Card
        sx={{
          p: 4,
          mb: 4,
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
            justifyContent: "space-between",
            alignItems: "center",
            mb: 3,
          }}
        >
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              color: "#1a1a1a",
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            <StarIcon sx={{ color: "#FFD700" }} />
            Featured Items
          </Typography>
          <Button
            variant="text"
            onClick={handleViewMarket}
            sx={{
              color: "#D4AF37",
              fontWeight: 600,
              textTransform: "none",
              "&:hover": {
                backgroundColor: "rgba(212, 175, 55, 0.1)",
              },
            }}
          >
            View All
          </Button>
        </Box>
        {loadingFeatured ? (
          <Box
            sx={{
              display: "flex",
              gap: 2,
              flexDirection: { xs: "column", sm: "row" },
              flexWrap: "wrap",
            }}
          >
            {Array.from({ length: 6 }).map((_, idx) => (
              <Card
                key={`fi-skel-${idx}`}
                sx={{
                  flex: {
                    xs: "0 0 100%",
                    sm: "0 0 calc(50% - 8px)",
                    md: "0 0 calc(33.333% - 14px)",
                  },
                  borderRadius: "12px",
                  overflow: "hidden",
                  border: "1px solid rgba(212, 175, 55, 0.2)",
                }}
              >
                <Skeleton variant="rectangular" height={180} />
                <CardContent sx={{ p: 2 }}>
                  <Skeleton width="70%" />
                  <Skeleton width="40%" />
                </CardContent>
              </Card>
            ))}
          </Box>
        ) : featuredItems.length > 0 ? (
          <Box
            key="featured-items-container"
            sx={{
              display: "flex",
              gap: 2,
              flexDirection: { xs: "column", sm: "row" },
              flexWrap: "wrap",
            }}
          >
            {featuredItems.map((item) => {
              return (
                <Card
                  key={item.id}
                  sx={{
                    flex: {
                      xs: "0 0 100%",
                      sm: "0 0 calc(50% - 8px)",
                      md: "0 0 calc(33.333% - 14px)",
                    },
                    display: "flex",
                    flexDirection: "column",
                    borderRadius: "12px",
                    overflow: "hidden",
                    transition: "all 0.3s ease",
                    border: "1px solid rgba(212, 175, 55, 0.2)",
                    "&:hover": {
                      transform: "translateY(-4px)",
                      boxShadow: "0 8px 24px rgba(212, 175, 55, 0.3)",
                    },
                  }}
                >
                  {item.images && item.images.length > 0 ? (
                    <Box
                      sx={{
                        position: "relative",
                        width: "100%",
                        height: 180,
                        overflow: "hidden",
                      }}
                    >
                      {(() => {
                        // Map original indices to valid images (not failed)
                        const validImagesWithIndices = (item.images || [])
                          .map((imagePath, originalIndex) => {
                            const imageUrl = getImageUrl(imagePath);
                            return {
                              imagePath,
                              imageUrl,
                              originalIndex,
                              isValid: imageUrl && !failedImages.has(imageUrl),
                            };
                          })
                          .filter((img) => img.isValid);

                        return validImagesWithIndices.map((imgData) => {
                          const currentIdx =
                            currentItemImageIndex[item.id] || 0;
                          // Use original index for visibility check
                          const isVisible =
                            currentIdx === imgData.originalIndex;
                          return (
                            <Box
                              key={`${item.id}-img-${imgData.originalIndex}`}
                              component="img"
                              src={imgData.imageUrl}
                              alt={item.title}
                              sx={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                                opacity: isVisible ? 1 : 0,
                                transition: "opacity 1.5s ease-in-out",
                                zIndex: isVisible ? 1 : 0,
                                pointerEvents: isVisible ? "auto" : "none",
                                visibility: isVisible ? "visible" : "hidden",
                              }}
                              onError={() => {
                                if (!isMountedRef.current) return;
                                // Track failed images in state instead of manipulating DOM
                                if (imgData.imageUrl) {
                                  setFailedImages((prev) =>
                                    new Set(prev).add(imgData.imageUrl)
                                  );
                                }
                              }}
                            />
                          );
                        });
                      })()}
                      {item.images.length > 1 && (
                        <Box
                          sx={{
                            position: "absolute",
                            top: 8,
                            left: 8,
                            backgroundColor: "rgba(0, 0, 0, 0.7)",
                            color: "white",
                            px: 1,
                            py: 0.5,
                            borderRadius: 1,
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            zIndex: 2,
                          }}
                        >
                          +{item.images.length - 1} more
                        </Box>
                      )}
                      {item.tag !== "none" && (
                        <Box
                          sx={{
                            position: "absolute",
                            top: 8,
                            right: 8,
                            zIndex: 3,
                          }}
                        >
                          <Chip
                            label={
                              item.tag === "hot_deals" ? "🔥 Hot" : "⭐ Weekend"
                            }
                            size="small"
                            sx={{
                              bgcolor:
                                item.tag === "hot_deals"
                                  ? "rgba(255, 107, 107, 0.95)"
                                  : "rgba(78, 205, 196, 0.95)",
                              color: "white",
                              fontWeight: 700,
                              fontSize: "0.65rem",
                            }}
                          />
                        </Box>
                      )}
                    </Box>
                  ) : (
                    <Box
                      sx={{
                        position: "relative",
                        height: 180,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        bgcolor: "rgba(212, 175, 55, 0.1)",
                      }}
                    >
                      <StoreIcon
                        sx={{ fontSize: 48, color: "#D4AF37", opacity: 0.3 }}
                      />
                      {item.tag !== "none" && (
                        <Box
                          sx={{
                            position: "absolute",
                            top: 8,
                            right: 8,
                            zIndex: 3,
                          }}
                        >
                          <Chip
                            label={
                              item.tag === "hot_deals" ? "🔥 Hot" : "⭐ Weekend"
                            }
                            size="small"
                            sx={{
                              bgcolor:
                                item.tag === "hot_deals"
                                  ? "rgba(255, 107, 107, 0.95)"
                                  : "rgba(78, 205, 196, 0.95)",
                              color: "white",
                              fontWeight: 700,
                              fontSize: "0.65rem",
                            }}
                          />
                        </Box>
                      )}
                    </Box>
                  )}
                  <CardContent
                    sx={{
                      flexGrow: 1,
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <Typography
                      variant="subtitle1"
                      sx={{
                        fontWeight: 600,
                        color: "#1a1a1a",
                        mb: 1,
                        fontSize: "0.95rem",
                        display: "-webkit-box",
                        WebkitLineClamp: 1,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {item.title}
                    </Typography>
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 700,
                        color: "#D4AF37",
                        mb: 2,
                      }}
                    >
                      KES {parseFloat(item.price).toLocaleString()}
                    </Typography>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<WhatsAppIcon />}
                      onClick={() => handleWhatsAppClick(item)}
                      sx={{
                        background: "linear-gradient(135deg, #25D366, #128C7E)",
                        color: "white",
                        fontWeight: 600,
                        textTransform: "none",
                        borderRadius: "8px",
                        "&:hover": {
                          background:
                            "linear-gradient(135deg, #128C7E, #25D366)",
                        },
                      }}
                    >
                      Contact
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </Box>
        ) : (
          <Box
            sx={{
              textAlign: "center",
              py: 4,
              px: 2,
            }}
          >
            <StoreIcon
              sx={{ fontSize: 64, color: "#D4AF37", opacity: 0.3, mb: 2 }}
            />
            <Typography variant="h6" sx={{ color: "#666", mb: 1 }}>
              No featured items yet
            </Typography>
            <Typography variant="body2" sx={{ color: "#999", mb: 3 }}>
              Check back soon for exciting featured marketplace items!
            </Typography>
            <Button
              variant="contained"
              onClick={handleViewMarket}
              sx={{
                background: "linear-gradient(135deg, #D4AF37, #B8941F)",
                color: "#1a1a1a",
                fontWeight: 600,
                textTransform: "none",
                borderRadius: "12px",
                px: 3,
                "&:hover": {
                  background: "linear-gradient(135deg, #B8941F, #D4AF37)",
                },
              }}
            >
              Browse All Items
            </Button>
          </Box>
        )}
      </Card>

      {/* Favorites and Unlocked Chats */}
      <Box ref={favoritesSectionRef}>
        <UserLists
          key={userListsTab}
          user={user}
          showTabs={true}
          defaultTab={userListsTab}
        />
      </Box>

      <Dialog
        open={boostDialogOpen}
        onClose={(_, _reason) => {
          if (!boosting) {
            if (programmaticBoostCloseRef.current) {
              programmaticBoostCloseRef.current = false;
              setBoostDialogOpen(false);
              return;
            }
            handleCloseBoostDialog();
          }
        }}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: "20px",
            border: "1px solid rgba(212, 175, 55, 0.3)",
            boxShadow: "0 20px 60px rgba(212, 175, 55, 0.25)",
          },
        }}
      >
        <DialogTitle
          sx={{
            background: "linear-gradient(45deg, #D4AF37, #B8941F)",
            color: "#1a1a1a",
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: 1,
            py: isSmallScreen ? 1.5 : 2,
            fontSize: {
              xs: "0.95rem",
              sm: "1.05rem",
              md: "1.15rem",
            },
          }}
        >
          <TrendingUp />
          {selectedBoost ? "Extend Profile Boost" : "Boost Your Profile"}
        </DialogTitle>
        <DialogContent
          sx={{
            pt: 3,
            pb: 0,
            display: "flex",
            flexDirection: "column",
            maxHeight: { xs: "calc(100vh - 160px)", sm: "calc(100vh - 200px)" },
            "& .MuiTypography-root": {
              fontSize: {
                xs: "0.68rem",
                sm: "0.78rem",
                md: "0.9rem",
              },
              lineHeight: {
                xs: 1.35,
                sm: 1.45,
                md: 1.6,
              },
            },
            "& .MuiButtonBase-root": {
              fontSize: {
                xs: "0.75rem",
                sm: "0.85rem",
                md: "0.95rem",
              },
              "& .MuiTypography-root": {
                fontSize: {
                  xs: "0.68rem",
                  sm: "0.78rem",
                  md: "0.9rem",
                },
              },
            },
            "& .MuiChip-root": {
              fontSize: {
                xs: "0.64rem",
                sm: "0.74rem",
                md: "0.86rem",
              },
            },
            "& .MuiFormHelperText-root": {
              fontSize: {
                xs: "0.64rem",
                sm: "0.74rem",
                md: "0.86rem",
              },
            },
            "& .MuiTextField-root": {
              "& input, & textarea": {
                fontSize: {
                  xs: "0.68rem",
                  sm: "0.78rem",
                  md: "0.9rem",
                },
              },
              "& label": {
                fontSize: {
                  xs: "0.68rem",
                  sm: "0.78rem",
                  md: "0.9rem",
                },
              },
            },
            "& .MuiSelect-select": {
              fontSize: {
                xs: "0.68rem",
                sm: "0.78rem",
                md: "0.9rem",
              },
            },
          }}
        >
          <Box
            sx={{
              flex: 1,
              overflowY: "auto",
              pr: 0.5,
              pb: 3,
            }}
          >
            {activeBoosts.length === 0 && (
              <Alert
                severity="info"
                sx={{
                  mb: 3,
                  borderRadius: "12px",
                  bgcolor: "rgba(212, 175, 55, 0.1)",
                  border: "1px solid rgba(212, 175, 55, 0.3)",
                }}
              >
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontWeight: 700,
                    mb: 1,
                    color: "#1a1a1a",
                    fontSize: { xs: "0.75rem", sm: "0.85rem", md: "0.95rem" },
                  }}
                >
                  Why Boost Your Profile?
                </Typography>
                <Box
                  component="ul"
                  sx={{
                    m: 0,
                    pl: 2.5,
                    "& li": {
                      mb: 1,
                      fontSize: {
                        xs: "0.7rem",
                        sm: "0.8rem",
                        md: "0.9rem",
                      },
                      lineHeight: {
                        xs: 1.35,
                        sm: 1.45,
                        md: 1.6,
                      },
                      "& strong": {
                        fontSize: {
                          xs: "0.72rem",
                          sm: "0.82rem",
                          md: "0.92rem",
                        },
                      },
                    },
                  }}
                >
                  <li>
                    <strong>Higher Visibility:</strong> Boosted profiles appear
                    first in Explore and featured sections.
                  </li>
                  <li>
                    <strong>Targeted Audience:</strong> Pick who should see you
                    and where they are logging in from.
                  </li>
                  <li>
                    <strong>Subscription-Based:</strong> Boosts use your daily
                    boost hours allowance included in your subscription plan. No
                    tokens required.
                  </li>
                </Box>
              </Alert>
            )}

            {activeBoosts.length > 0 && (
              <Box
                sx={{
                  borderRadius: "12px",
                  border: "1px solid rgba(26, 26, 26, 0.08)",
                  bgcolor: "rgba(26, 26, 26, 0.01)",
                  p: 2,
                  display: "flex",
                  flexDirection: "column",
                  gap: 1.5,
                  mb: 2,
                }}
              >
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontWeight: 700,
                    color: "rgba(26, 26, 26, 0.85)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  Your Active Boosts
                  <Typography
                    component="span"
                    variant="caption"
                    sx={{ color: "rgba(26, 26, 26, 0.55)" }}
                  >
                    Extend individually to keep them running.
                  </Typography>
                </Typography>
                <Stack spacing={1.5}>
                  {activeBoosts.map((boost) => {
                    const isSelected =
                      selectedBoost && selectedBoost.id === boost.id;
                    const radiusValue = parseNumericValue(boost.radius_km);
                    const radiusLabel = Number.isFinite(radiusValue)
                      ? `${Number(radiusValue).toFixed(1)} km`
                      : "N/A";
                    const remaining = getRemainingTimeForDate(boost.ends_at);
                    const endsAt = boost.ends_at
                      ? new Date(boost.ends_at).toLocaleString()
                      : null;
                    const targetArea = boost.target_area || "Custom location";

                    return (
                      <Card
                        key={boost.id}
                        variant="outlined"
                        onClick={() => handleSelectActiveBoost(boost)}
                        sx={{
                          borderColor: isSelected
                            ? "rgba(33, 150, 243, 0.6)"
                            : "rgba(26, 26, 26, 0.08)",
                          borderWidth: isSelected ? 2 : 1,
                          cursor: "pointer",
                          transition:
                            "border-color 0.2s ease, box-shadow 0.2s ease",
                          "&:hover": {
                            borderColor: "rgba(33, 150, 243, 0.6)",
                            boxShadow: "0 6px 20px rgba(33, 150, 243, 0.12)",
                          },
                        }}
                      >
                        <CardContent sx={{ pb: 1.5 }}>
                          <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                            justifyContent="space-between"
                          >
                            <Typography
                              variant="subtitle2"
                              sx={{
                                fontWeight: 700,
                                color: "rgba(26, 26, 26, 0.85)",
                                maxWidth: "65%",
                              }}
                            >
                              {targetArea}
                            </Typography>
                            <Chip
                              label={boost.target_category || "Regular"}
                              size="small"
                              sx={{
                                backgroundColor: "rgba(33, 150, 243, 0.12)",
                                color: "rgba(33, 150, 243, 0.85)",
                                fontWeight: 600,
                              }}
                            />
                          </Stack>
                          <Typography
                            variant="body2"
                            sx={{
                              mt: 1,
                              color: "rgba(26, 26, 26, 0.75)",
                            }}
                          >
                            Radius: {radiusLabel}
                          </Typography>
                          {remaining && (
                            <Typography
                              variant="body2"
                              sx={{ color: "rgba(26, 26, 26, 0.7)" }}
                            >
                              Time left: {remaining.hours}h {remaining.minutes}m
                            </Typography>
                          )}
                          {endsAt && (
                            <Typography
                              variant="caption"
                              sx={{
                                color: "rgba(26, 26, 26, 0.55)",
                                display: "block",
                                mt: 0.5,
                              }}
                            >
                              Ends at: {endsAt}
                            </Typography>
                          )}
                        </CardContent>
                        <CardActions
                          sx={{
                            justifyContent: "flex-end",
                            pt: 0,
                            pb: 1.5,
                            px: 2,
                            gap: 1,
                          }}
                        >
                          <Button
                            size="small"
                            variant="contained"
                            disabled={boosting}
                            onClick={(event) => {
                              event.stopPropagation();
                              handleExtendBoost(boost);
                            }}
                            sx={{
                              background:
                                "linear-gradient(135deg, #2196F3, #64B5F6)",
                              color: "#0D1C2C",
                              fontWeight: 600,
                              "&:hover": {
                                background:
                                  "linear-gradient(135deg, #1976D2, #42A5F5)",
                              },
                            }}
                          >
                            Extend
                          </Button>
                        </CardActions>
                      </Card>
                    );
                  })}
                </Stack>
              </Box>
            )}

            <Stack spacing={2.5}>
              {!loadingBoostStatus && boostStatusError && (
                <Alert
                  severity="warning"
                  sx={{
                    borderRadius: "12px",
                    bgcolor: "rgba(255, 193, 7, 0.12)",
                    color: "rgba(26, 26, 26, 0.8)",
                  }}
                >
                  {boostStatusError}
                </Alert>
              )}

              {activeBoosts.length === 0 && selectedBoost && (
                <Alert
                  severity="info"
                  sx={{
                    borderRadius: "12px",
                    bgcolor: "rgba(33, 150, 243, 0.12)",
                    border: "1px solid rgba(33, 150, 243, 0.25)",
                    color: "rgba(26, 26, 26, 0.85)",
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    You already have a boost targeting{" "}
                    <strong>{selectedBoost.target_area || "this area"}</strong>{" "}
                    for {boostCategory}.
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ display: "block", mt: 0.5 }}
                  >
                    {selectedBoostRemaining
                      ? `Time remaining: ${selectedBoostRemaining}.`
                      : "This boost is active for a little longer."}{" "}
                    {selectedBoostExpiresAt
                      ? `Ends at ${selectedBoostExpiresAt}.`
                      : ""}
                    Extend to add hours or widen the radius without creating a
                    new boost.
                  </Typography>
                </Alert>
              )}

              <FormControl fullWidth>
                <InputLabel id="boost-category-label">
                  Target category
                </InputLabel>
                <Select
                  labelId="boost-category-label"
                  value={boostCategory}
                  label="Target category"
                  onChange={(event) => setBoostCategory(event.target.value)}
                  disabled={boosting}
                >
                  {BOOST_CATEGORIES.map((categoryOption) => (
                    <MenuItem key={categoryOption} value={categoryOption}>
                      {categoryOption}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label="Hours to boost"
                type="number"
                value={boostHours}
                onChange={(event) => setBoostHours(event.target.value)}
                inputProps={{
                  min: MIN_BOOST_HOURS,
                  max: maxBoostHours,
                }}
                helperText={`Choose between ${MIN_BOOST_HOURS} and ${maxBoostHours} hours per boost${boostHoursInfo?.maxDurationPerBoost ? ` (your ${subscription?.plan || "package"} plan allows up to ${maxBoostHours} hours per boost)` : ""}.`}
                fullWidth
                disabled={boosting}
              />

              <TextField
                label="Target radius (km)"
                type="number"
                value={boostRadiusKm}
                onChange={(event) => {
                  setBoostTargetEdited(true);
                  setBoostRadiusKm(event.target.value);
                }}
                inputProps={{
                  min: MIN_BOOST_RADIUS_KM,
                  max: MAX_BOOST_RADIUS_KM,
                  step: 0.5,
                }}
                helperText={`Boost reaches users within ${sanitizedBoostRadiusKm.toFixed(1)} km of your target point.`}
                fullWidth
                disabled={boosting}
              />

              <GeoTargetPicker
                latitude={boostLatitude}
                longitude={boostLongitude}
                radiusKm={sanitizedBoostRadiusKm}
                onLocationChange={(lat, lon) => {
                  setBoostLatitude(lat);
                  setBoostLongitude(lon);
                  setBoostTargetEdited(true);
                  setLocationError("");
                }}
                onRequestCurrentLocation={() =>
                  requestCurrentLocation({
                    applyToBoost: true,
                    onComplete: (success) => {
                      if (success) {
                        setBoostTargetEdited(true);
                      }
                      if (!success) {
                        setBoostLatitude(null);
                        setBoostLongitude(null);
                      }
                    },
                  })
                }
                locating={boosting ? false : locatingBoost}
                locationError={locationError}
                onCountySuggested={(county) => {
                  setBoostArea(county || "");
                  setBoostTargetEdited(true);
                }}
              />

              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  flexWrap: "wrap",
                }}
              >
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 600, color: "rgba(26, 26, 26, 0.75)" }}
                >
                  Selected location:
                </Typography>
                <Chip
                  label={boostArea || "None"}
                  size="small"
                  sx={{
                    bgcolor: boostArea
                      ? "rgba(212, 175, 55, 0.15)"
                      : "rgba(0, 0, 0, 0.05)",
                    color: "rgba(26, 26, 26, 0.8)",
                    fontWeight: 600,
                  }}
                />
                {!boostArea && (
                  <Typography
                    variant="caption"
                    sx={{ color: "rgba(26, 26, 26, 0.55)" }}
                  >
                    Use the map search above to choose a target area.
                  </Typography>
                )}
              </Box>

              {boostHoursInfo && (
                <Alert
                  severity="info"
                  sx={{
                    borderRadius: "12px",
                    bgcolor: "rgba(33, 150, 243, 0.08)",
                    border: "1px solid rgba(33, 150, 243, 0.2)",
                    color: "rgba(26, 26, 26, 0.8)",
                    mb: 2,
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                    Your Boost Hours Package
                  </Typography>
                  <Typography variant="body2">
                    <strong>Plan:</strong> {subscription?.plan || "N/A"} ·{" "}
                    <strong>Total Daily Hours:</strong>{" "}
                    {boostHoursInfo.totalHoursPerDay || 0} hrs ·{" "}
                    <strong>Used Today:</strong>{" "}
                    {boostHoursInfo.usedHours?.toFixed(1) || 0} hrs ·{" "}
                    <strong>Remaining:</strong>{" "}
                    {boostHoursInfo.remainingHours?.toFixed(1) || 0} hrs
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      display: "block",
                      mt: 0.5,
                      color: "rgba(26, 26, 26, 0.65)",
                    }}
                  >
                    Default boost duration:{" "}
                    {boostHoursInfo.defaultDurationPerBoost || 1} hour
                    {boostHoursInfo.defaultDurationPerBoost > 1 ? "s" : ""} per
                    boost. You can extend existing boosts or create new ones
                    using your daily allowance.
                  </Typography>
                </Alert>
              )}

              <Alert
                severity="success"
                sx={{
                  borderRadius: "12px",
                  bgcolor: "rgba(76, 175, 80, 0.08)",
                  border: "1px solid rgba(76, 175, 80, 0.2)",
                  color: "rgba(26, 26, 26, 0.8)",
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Boost Preview
                </Typography>
                <Typography variant="body2">
                  This boost will run for{" "}
                  <strong>
                    {sanitizedBoostHours} hour
                    {sanitizedBoostHours > 1 ? "s" : ""}
                  </strong>{" "}
                  covering roughly {sanitizedBoostRadiusKm.toFixed(1)} km. This
                  will use {sanitizedBoostHours} hour
                  {sanitizedBoostHours > 1 ? "s" : ""} from your daily boost
                  hours allowance.
                </Typography>
              </Alert>

              {boostTimeRemaining && !selectedBoost && (
                <Alert
                  severity="warning"
                  sx={{
                    borderRadius: "12px",
                    bgcolor: "rgba(255, 152, 0, 0.12)",
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Active boost remaining: {boostTimeRemaining.hours}h{" "}
                    {boostTimeRemaining.minutes}m
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      color: "rgba(26, 26, 26, 0.7)",
                      display: "block",
                      mt: 0.5,
                    }}
                  >
                    Extending now will add time to your existing boost window.
                  </Typography>
                </Alert>
              )}
            </Stack>
          </Box>
        </DialogContent>
        <DialogActions
          sx={{
            p: 3,
            pt: 2,
            borderTop: "1px solid rgba(0,0,0,0.08)",
            backgroundColor: "rgba(255, 255, 255, 0.9)",
            display: "flex",
            flexWrap: "wrap",
            gap: 1,
          }}
        >
          <Button
            onClick={handleCloseBoostDialog}
            disabled={boosting}
            sx={{
              color: "rgba(26, 26, 26, 0.7)",
              fontWeight: 600,
              fontSize: {
                xs: "0.75rem",
                sm: "0.85rem",
                md: "0.95rem",
              },
            }}
          >
            Cancel
          </Button>
          {activeBoosts.length === 0 && selectedBoost && (
            <Button
              onClick={handleExtendBoost}
              variant="contained"
              disabled={boosting || loadingBoostStatus}
              sx={{
                background: "linear-gradient(135deg, #2196F3, #64B5F6)",
                color: "#0D1C2C",
                fontWeight: 700,
                textTransform: "none",
                borderRadius: "12px",
                px: 3,
                py: 1,
                fontSize: {
                  xs: "0.74rem",
                  sm: "0.84rem",
                  md: "0.94rem",
                },
                "&:hover": {
                  background: "linear-gradient(135deg, #1976D2, #42A5F5)",
                },
                "&:disabled": {
                  background: "rgba(33, 150, 243, 0.35)",
                  color: "rgba(13, 28, 44, 0.6)",
                },
              }}
            >
              {boosting ? "Saving..." : `Extend (+${sanitizedBoostHours}h)`}
            </Button>
          )}
          <Button
            onClick={handleBoostProfile}
            variant="contained"
            disabled={boosting}
            sx={{
              background: "linear-gradient(135deg, #D4AF37, #B8941F)",
              color: "#1a1a1a",
              fontWeight: 700,
              textTransform: "none",
              borderRadius: "12px",
              px: 3,
              py: 1,
              fontSize: {
                xs: "0.78rem",
                sm: "0.88rem",
                md: "1rem",
              },
              "&:hover": {
                background: "linear-gradient(135deg, #B8941F, #D4AF37)",
              },
            }}
          >
            {boosting
              ? "Boosting..."
              : `Boost New Area (${sanitizedBoostHours}h)`}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={targetedDialogOpen}
        onClose={handleCloseTargetedDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: "18px",
            border: "1px solid rgba(212, 175, 55, 0.25)",
            maxHeight: "78vh",
            width: { xs: "92%", sm: "85%", md: "640px" },
          },
        }}
      >
        <DialogTitle
          sx={{
            background: "linear-gradient(135deg, #D4AF37, #B8941F)",
            color: "#1a1a1a",
            fontWeight: 700,
          }}
        >
          Boosts Targeting You
        </DialogTitle>
        <DialogContent sx={{ pt: 3, maxHeight: "60vh", overflowY: "auto" }}>
          {loadingTargetedBoosts ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress sx={{ color: "#D4AF37" }} />
            </Box>
          ) : targetedBoostsError ? (
            <Alert
              severity="warning"
              sx={{
                borderRadius: "12px",
                bgcolor: "rgba(255, 193, 7, 0.12)",
                color: "rgba(26, 26, 26, 0.8)",
              }}
            >
              {targetedBoostsError}
            </Alert>
          ) : targetedCount === 0 ? (
            <Box sx={{ textAlign: "center", py: 4 }}>
              <Typography
                variant="body1"
                sx={{ color: "rgba(26, 26, 26, 0.7)", fontWeight: 600 }}
              >
                No matching boosts right now.
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: "rgba(26, 26, 26, 0.6)", mt: 1 }}
              >
                Once someone targets {user?.category || "your category"} in{" "}
                {user?.county || "your area"}, they'll pop up here.
              </Typography>
            </Box>
          ) : (
            <List disablePadding>
              {targetedBoosts.map((boost, index) => {
                const owner = boost.owner;
                const profileImage = buildImageUrl(owner?.photo);
                const expiresAt = boost.ends_at
                  ? new Date(boost.ends_at).toLocaleString()
                  : null;
                const areaLabel = boost.target_area;
                const ownerDisplayName =
                  (typeof owner?.name === "string" && owner.name.trim()) ||
                  (typeof owner?.username === "string" &&
                    owner.username.trim()) ||
                  "Boosted profile";
                const ownerUsername =
                  typeof owner?.username === "string" &&
                  owner.username.trim() &&
                  owner.username.trim().toLowerCase() !==
                    ownerDisplayName.trim().toLowerCase()
                    ? owner.username.trim()
                    : "";

                return (
                  <React.Fragment key={boost.id}>
                    <ListItem alignItems="flex-start">
                      <ListItemAvatar>
                        <Avatar
                          src={profileImage || undefined}
                          alt={owner?.name || "Boosted user"}
                          sx={{
                            bgcolor: profileImage ? "transparent" : "#D4AF37",
                            color: profileImage ? "inherit" : "#1a1a1a",
                          }}
                        >
                          {profileImage ? null : owner?.name?.charAt(0) || "?"}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primaryTypographyProps={{
                          fontWeight: 700,
                          color: "#1a1a1a",
                        }}
                        primary={ownerDisplayName}
                        secondary={
                          <Box sx={{ mt: 0.5 }}>
                            {ownerUsername && (
                              <Typography
                                variant="caption"
                                sx={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 0.5,
                                  color: "rgba(26, 26, 26, 0.55)",
                                  mr: owner?.category ? 1 : 0,
                                  fontWeight: 600,
                                }}
                              >
                                @{ownerUsername}
                              </Typography>
                            )}
                            {owner?.category && (
                              <Typography
                                variant="caption"
                                sx={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 0.5,
                                  color: "rgba(26, 26, 26, 0.65)",
                                  mr: 1,
                                }}
                              >
                                <StarIcon
                                  sx={{ fontSize: 12, color: "#D4AF37" }}
                                />
                                {owner.category}
                              </Typography>
                            )}
                            {areaLabel && (
                              <Typography
                                variant="caption"
                                sx={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 0.5,
                                  color: "rgba(26, 26, 26, 0.65)",
                                }}
                              >
                                <LocationOn
                                  sx={{ fontSize: 12, color: "#D4AF37" }}
                                />
                                {areaLabel}
                              </Typography>
                            )}
                            {typeof boost.distance_km === "number" && (
                              <Typography
                                variant="caption"
                                sx={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 0.5,
                                  color: "rgba(26, 26, 26, 0.65)",
                                  ml: areaLabel ? 1 : 0,
                                }}
                              >
                                <MyLocation
                                  sx={{ fontSize: 12, color: "#D4AF37" }}
                                />
                                {boost.distance_km.toFixed(1)} km away
                              </Typography>
                            )}
                            {expiresAt && (
                              <Typography
                                variant="caption"
                                sx={{
                                  display: "block",
                                  mt: 0.75,
                                  color: "rgba(26, 26, 26, 0.6)",
                                }}
                              >
                                Boost ends: {expiresAt}
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                    </ListItem>
                    {index < targetedBoosts.length - 1 && (
                      <Divider component="li" />
                    )}
                  </React.Fragment>
                );
              })}
            </List>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={handleRefreshTargetedBoosts}
            disabled={loadingTargetedBoosts}
            sx={{
              color: "#D4AF37",
              fontWeight: 600,
            }}
          >
            Refresh
          </Button>
          <Button onClick={handleCloseTargetedDialog} color="inherit">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={statsDialogOpen}
        onClose={handleCloseStatsDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: "18px",
            border: "1px solid rgba(212, 175, 55, 0.25)",
          },
        }}
      >
        <DialogTitle
          sx={{
            background: "linear-gradient(135deg, #D4AF37, #B8941F)",
            color: "#1a1a1a",
            fontWeight: 700,
          }}
        >
          Profile Statistics
        </DialogTitle>
        <DialogContent
          sx={{
            pt: 3,
            maxHeight: { xs: "52vh", sm: "56vh" },
            overflowY: "auto",
            px: { xs: 2, sm: 3 },
          }}
        >
          {statsLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress sx={{ color: "#D4AF37" }} />
            </Box>
          ) : statsError ? (
            <Alert
              severity="warning"
              sx={{
                borderRadius: "12px",
                bgcolor: "rgba(255, 193, 7, 0.12)",
                color: "rgba(26, 26, 26, 0.8)",
              }}
            >
              {statsError}
            </Alert>
          ) : statsData ? (
            <Stack spacing={{ xs: 2, sm: 3 }}>
              <Box
                sx={{
                  p: { xs: 1.5, sm: 2 },
                  borderRadius: "12px",
                  border: "1px solid rgba(212, 175, 55, 0.2)",
                  backgroundColor: "rgba(212, 175, 55, 0.08)",
                }}
              >
                <Typography
                  variant="subtitle1"
                  sx={{
                    fontWeight: 700,
                    color: "#1a1a1a",
                    mb: { xs: 0.75, sm: 1 },
                    fontSize: { xs: "0.95rem", sm: "1.05rem" },
                  }}
                >
                  Profile Views
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: "rgba(26, 26, 26, 0.7)",
                    mb: { xs: 0.75, sm: 1 },
                    fontSize: { xs: "0.78rem", sm: "0.9rem" },
                  }}
                >
                  Total views:{" "}
                  <strong>{statsData.profileViews?.total ?? 0}</strong> · Unique
                  viewers:{" "}
                  <strong>{statsData.profileViews?.uniqueViewers ?? 0}</strong>
                </Typography>
                <Stack spacing={{ xs: 1, sm: 1.2 }}>
                  {(statsData.profileViews?.recent || []).map((viewer) => (
                    <Card
                      key={`${viewer.id || "viewer"}-${viewer.viewedAt}`}
                      variant="outlined"
                      sx={{
                        borderRadius: "12px",
                        border: "1px solid rgba(212, 175, 55, 0.25)",
                        backgroundColor: "rgba(255, 255, 255, 0.75)",
                      }}
                    >
                      <CardContent
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 0.5,
                          p: { xs: 1.25, sm: 2 },
                        }}
                      >
                        <Typography
                          variant="subtitle2"
                          sx={{
                            fontWeight: 600,
                            color: "#1a1a1a",
                            fontSize: { xs: "0.85rem", sm: "0.95rem" },
                          }}
                        >
                          {viewer.username
                            ? `@${viewer.username}`
                            : viewer.name || "Someone viewed your profile"}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            color: "rgba(26, 26, 26, 0.6)",
                            fontSize: { xs: "0.65rem", sm: "0.72rem" },
                          }}
                        >
                          {viewer.category || "Category not specified"} ·{" "}
                          {viewer.isVerified ? "Verified" : "Unverified"}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            color: "rgba(26, 26, 26, 0.55)",
                            fontSize: { xs: "0.64rem", sm: "0.7rem" },
                          }}
                        >
                          Viewed on:{" "}
                          {viewer.viewedAt
                            ? new Date(viewer.viewedAt).toLocaleString()
                            : "Unknown"}
                        </Typography>
                      </CardContent>
                    </Card>
                  ))}
                  {(statsData.profileViews?.recent || []).length === 0 && (
                    <Typography
                      variant="caption"
                      sx={{
                        color: "rgba(26, 26, 26, 0.55)",
                        fontSize: { xs: "0.68rem", sm: "0.74rem" },
                      }}
                    >
                      No recent profile views yet.
                    </Typography>
                  )}
                </Stack>
              </Box>

              <Box
                sx={{
                  p: { xs: 1.5, sm: 2 },
                  borderRadius: "12px",
                  border: "1px solid rgba(212, 175, 55, 0.2)",
                  backgroundColor: "rgba(212, 175, 55, 0.08)",
                }}
              >
                <Typography
                  variant="subtitle1"
                  sx={{
                    fontWeight: 700,
                    color: "#1a1a1a",
                    mb: { xs: 0.75, sm: 1 },
                    fontSize: { xs: "0.95rem", sm: "1.05rem" },
                  }}
                >
                  Contact Unlocks
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: "rgba(26, 26, 26, 0.7)",
                    mb: { xs: 0.75, sm: 1 },
                    fontSize: { xs: "0.78rem", sm: "0.9rem" },
                  }}
                >
                  Total unlocks:{" "}
                  <strong>{statsData.contactUnlocks?.total ?? 0}</strong>
                </Typography>
                <Stack spacing={{ xs: 1, sm: 1.2 }}>
                  {(statsData.contactUnlocks?.recent || []).map((unlock) => (
                    <Card
                      key={`${unlock.id || "unlock"}-${unlock.unlockedAt}`}
                      variant="outlined"
                      sx={{
                        borderRadius: "12px",
                        border: "1px solid rgba(212, 175, 55, 0.25)",
                        backgroundColor: "rgba(255, 255, 255, 0.75)",
                      }}
                    >
                      <CardContent
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 0.5,
                          p: { xs: 1.25, sm: 2 },
                        }}
                      >
                        <Typography
                          variant="subtitle2"
                          sx={{
                            fontWeight: 600,
                            color: "#1a1a1a",
                            fontSize: { xs: "0.85rem", sm: "0.95rem" },
                          }}
                        >
                          {unlock.username
                            ? `@${unlock.username}`
                            : unlock.name || "Someone unlocked your contact"}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            color: "rgba(26, 26, 26, 0.6)",
                            fontSize: { xs: "0.65rem", sm: "0.72rem" },
                          }}
                        >
                          {unlock.category || "Category not specified"} ·{" "}
                          {unlock.isVerified ? "Verified" : "Unverified"}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            color: "rgba(26, 26, 26, 0.55)",
                            fontSize: { xs: "0.64rem", sm: "0.7rem" },
                          }}
                        >
                          Unlocked on:{" "}
                          {unlock.unlockedAt
                            ? new Date(unlock.unlockedAt).toLocaleString()
                            : "Unknown"}
                          {unlock.tokenCost != null
                            ? ` · Tokens spent: ${unlock.tokenCost}`
                            : ""}
                        </Typography>
                      </CardContent>
                    </Card>
                  ))}
                  {(statsData.contactUnlocks?.recent || []).length === 0 && (
                    <Typography
                      variant="caption"
                      sx={{
                        color: "rgba(26, 26, 26, 0.55)",
                        fontSize: { xs: "0.68rem", sm: "0.74rem" },
                      }}
                    >
                      No recent contact unlocks yet.
                    </Typography>
                  )}
                </Stack>
              </Box>

              <Box
                sx={{
                  p: { xs: 1.5, sm: 2 },
                  borderRadius: "12px",
                  border: "1px solid rgba(212, 175, 55, 0.2)",
                  backgroundColor: "rgba(212, 175, 55, 0.08)",
                }}
              >
                <Typography
                  variant="subtitle1"
                  sx={{
                    fontWeight: 700,
                    color: "#1a1a1a",
                    mb: { xs: 0.75, sm: 1 },
                    fontSize: { xs: "0.95rem", sm: "1.05rem" },
                  }}
                >
                  Boost Overview
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: "rgba(26, 26, 26, 0.7)",
                    mb: { xs: 0.75, sm: 1 },
                    fontSize: { xs: "0.78rem", sm: "0.9rem" },
                  }}
                >
                  Total boosts created:{" "}
                  <strong>{statsData.boostStatus?.totalBoosts ?? 0}</strong>
                </Typography>
                {statsData.boostStatus?.active ? (
                  <Card
                    variant="outlined"
                    sx={{
                      borderRadius: "12px",
                      border: "1px solid rgba(212, 175, 55, 0.25)",
                      backgroundColor: "rgba(255, 255, 255, 0.75)",
                    }}
                  >
                    <CardContent
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 0.5,
                        p: { xs: 1.25, sm: 2 },
                      }}
                    >
                      <Typography
                        variant="subtitle2"
                        sx={{
                          fontWeight: 600,
                          color: "#1a1a1a",
                          fontSize: { xs: "0.85rem", sm: "0.95rem" },
                        }}
                      >
                        Active boost targeting{" "}
                        {statsData.boostStatus.active.targetCategory}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          color: "rgba(26, 26, 26, 0.6)",
                          fontSize: { xs: "0.65rem", sm: "0.72rem" },
                        }}
                      >
                        Area:{" "}
                        {statsData.boostStatus.active.targetArea ||
                          "Custom location"}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          color: "rgba(26, 26, 26, 0.55)",
                          fontSize: { xs: "0.64rem", sm: "0.7rem" },
                        }}
                      >
                        Runs from{" "}
                        {statsData.boostStatus.active.startsAt
                          ? new Date(
                              statsData.boostStatus.active.startsAt
                            ).toLocaleString()
                          : "Unknown"}{" "}
                        to{" "}
                        {statsData.boostStatus.active.endsAt
                          ? new Date(
                              statsData.boostStatus.active.endsAt
                            ).toLocaleString()
                          : "Unknown"}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{ color: "rgba(26, 26, 26, 0.55)" }}
                      >
                        Views captured during this boost:{" "}
                        <strong>
                          {statsData.boostStatus.active
                            .viewsDuringActiveWindow ?? 0}
                        </strong>
                      </Typography>
                    </CardContent>
                  </Card>
                ) : (
                  <Typography
                    variant="caption"
                    sx={{
                      color: "rgba(26, 26, 26, 0.55)",
                      fontSize: { xs: "0.68rem", sm: "0.74rem" },
                    }}
                  >
                    No active boost right now.
                  </Typography>
                )}
              </Box>
            </Stack>
          ) : (
            <Typography variant="body2" sx={{ color: "rgba(26, 26, 26, 0.6)" }}>
              No statistics available yet. Boost your profile or upgrade to
              premium to start collecting insights.
            </Typography>
          )}
        </DialogContent>
        <DialogActions
          sx={{
            p: 2,
            justifyContent: "flex-end",
            gap: 1,
            flexWrap: "wrap",
          }}
        >
          <Button onClick={handleCloseStatsDialog} color="inherit">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Story Viewer */}
      <StoryViewer
        open={storyViewerOpen}
        onClose={() => {
          setStoryViewerOpen(false);
          setSelectedStoryGroup(null);
        }}
        storyGroup={selectedStoryGroup}
        currentUser={user}
        onNextGroup={() => {
          // Check if viewing own story
          const isViewingOwnStory = selectedStoryGroup?.user?.id === user?.id;

          if (isViewingOwnStory) {
            // When viewing own story and going next, go to first other user's story
            if (storyGroups.length > 0) {
              setSelectedStoryGroup(storyGroups[0]);
            } else {
              setStoryViewerOpen(false);
              setSelectedStoryGroup(null);
            }
          } else {
            // Find next story group (user's story is excluded from storyGroups)
            const currentIndex = storyGroups.findIndex(
              (sg) => sg.user?.id === selectedStoryGroup?.user?.id
            );
            if (currentIndex < storyGroups.length - 1) {
              setSelectedStoryGroup(storyGroups[currentIndex + 1]);
            } else {
              setStoryViewerOpen(false);
              setSelectedStoryGroup(null);
            }
          }
        }}
        onPrevGroup={() => {
          // Check if viewing own story
          const isViewingOwnStory = selectedStoryGroup?.user?.id === user?.id;

          if (isViewingOwnStory) {
            // When viewing own story and going prev, close viewer
            setStoryViewerOpen(false);
            setSelectedStoryGroup(null);
          } else {
            // Find previous story group (user's story is excluded from storyGroups)
            const currentIndex = storyGroups.findIndex(
              (sg) => sg.user?.id === selectedStoryGroup?.user?.id
            );
            if (currentIndex > 0) {
              setSelectedStoryGroup(storyGroups[currentIndex - 1]);
            } else {
              // At first other user's story, going prev should close (not go to own story)
              setStoryViewerOpen(false);
              setSelectedStoryGroup(null);
            }
          }
        }}
        onStoryDeleted={(updatedGroup) => {
          // Update selected story group if provided
          if (updatedGroup) {
            setSelectedStoryGroup(updatedGroup);
          }
          // Refresh stories feed after deletion
          if (storiesFeedRefreshRef.current) {
            setTimeout(() => {
              storiesFeedRefreshRef.current();
            }, 300);
          }
        }}
      />

      {/* Story Creator */}
      <StoryCreator
        open={storyCreatorOpen}
        onClose={() => {
          setStoryCreatorOpen(false);
          // Reset storyCreated flag when dialog closes without creating
          setStoryCreated(false);
        }}
        onStoryCreated={() => {
          // Set flag to trigger refresh
          setStoryCreated(true);
          // Reset after a short delay so it can trigger again on next creation
          setTimeout(() => {
            setStoryCreated(false);
          }, 1000);
        }}
      />
    </Box>
  );
}
