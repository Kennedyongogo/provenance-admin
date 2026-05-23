import React, {
  useState,
  useEffect,
  useLayoutEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Avatar,
  Button,
  Chip,
  IconButton,
  Stack,
  CircularProgress,
  Tooltip,
  Tabs,
  Tab,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  useMediaQuery,
  Badge,
  TextField,
} from "@mui/material";
import {
  LocationOn,
  Cake,
  Favorite,
  FavoriteBorder,
  Chat,
  Verified,
  Person,
  Star,
  AccessTime,
  Visibility,
  CheckCircle,
  AccountCircle,
  Edit,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import ViewProfile from "../components/ViewProfile";
import UpgradeDialog from "../components/UpgradeDialog";
import { formatKshFromTokens } from "../utils/pricing";
import { getDisplayInitial, getDisplayName } from "../utils/userDisplay";

export default function PremiumLounge({ user }) {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unlocking, setUnlocking] = useState({});
  const [favoriting, setFavoriting] = useState({});
  const [favorites, setFavorites] = useState({});
  const [selectedTab, setSelectedTab] = useState(0);
  const [tokenCost, setTokenCost] = useState(0);
  const [viewProfileOpen, setViewProfileOpen] = useState(false);
  const [viewingUserId, setViewingUserId] = useState(null);
  const [lookingForPosts, setLookingForPosts] = useState({}); // Map of userId -> post
  const [lookingForDialogOpen, setLookingForDialogOpen] = useState(false);
  const [selectedLookingForPost, setSelectedLookingForPost] = useState(null);
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
  const [benefitsDialogOpen, setBenefitsDialogOpen] = useState(false);
  const fetchingRef = useRef(false); // Track if we're currently fetching
  const lastFetchedRef = useRef({ category: null, tab: null }); // Track what we last fetched
  const [myLookingForPost, setMyLookingForPost] = useState(null); // Current user's own post
  const [postDialogOpen, setPostDialogOpen] = useState(false);
  const [postContent, setPostContent] = useState("");
  const [posting, setPosting] = useState(false);
  const [hasCheckedPost, setHasCheckedPost] = useState(false); // Track if we've checked for existing post

  const isRegularUser = user?.category === "Regular";
  const isSmallScreen = useMediaQuery("(max-width:600px)");
  const [userCategoryConfirmed, setUserCategoryConfirmed] = useState(false);
  const [localStorageUpdateTrigger, setLocalStorageUpdateTrigger] = useState(0);

  // Determine user category from user prop or localStorage
  const getUserCategory = useCallback(() => {
    if (user?.category) {
      return user.category;
    }
    try {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        return parsedUser.category;
      }
    } catch (err) {
      console.error("Error parsing user from localStorage:", err);
    }
    return null;
  }, [user?.category, localStorageUpdateTrigger]);

  const confirmedIsRegularUser = useMemo(() => {
    const category = getUserCategory();
    return category === "Regular";
  }, [getUserCategory]);

  // Handle regular user - automatically open upgrade dialog
  useEffect(() => {
    const category = getUserCategory();
    if (category === "Regular") {
      setBenefitsDialogOpen(true);
      setUpgradeDialogOpen(false);
      setLoading(false);
      setUserCategoryConfirmed(true);
    } else if (category && category !== "Regular") {
      // Premium user confirmed
      setUserCategoryConfirmed(true);
    }
  }, [getUserCategory]);

  const categories = [
    { label: "Sugar Mummy", value: "Sugar Mummy" },
    { label: "Sponsor", value: "Sponsor" },
    { label: "Ben 10", value: "Ben 10" },
    { label: "Urban Chics", value: "Urban Chics" },
  ];

  const buildImageUrl = (imageUrl) => {
    if (!imageUrl) return "";
    if (imageUrl.startsWith("http")) return imageUrl;
    if (imageUrl.startsWith("uploads/")) return `/${imageUrl}`;
    if (imageUrl.startsWith("/uploads/")) return imageUrl;
    if (imageUrl.startsWith("profiles/")) return `/uploads/${imageUrl}`;
    return imageUrl;
  };

  const fetchPremiumUsers = useCallback(async () => {
    // Prevent duplicate fetches
    if (fetchingRef.current) {
      return;
    }

    // Don't fetch if user is regular - should be handled by early return
    if (isRegularUser || user?.category === "Regular") {
      setLoading(false);
      fetchingRef.current = false;
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      Swal.fire({
        icon: "warning",
        title: "Login Required",
        text: "Please login to access Premium Lounge",
        confirmButtonColor: "#D4AF37",
      }).then(() => {
        navigate("/");
      });
      return;
    }

    const selectedCategory = categories[selectedTab].value;

    // Check if we already fetched this category/tab combination
    if (
      lastFetchedRef.current.category === selectedCategory &&
      lastFetchedRef.current.tab === selectedTab
    ) {
      return;
    }

    try {
      fetchingRef.current = true;
      setLoading(true);

      const response = await fetch(
        `/api/verification/lounge/${encodeURIComponent(selectedCategory)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        const fetchedUsers = data.data.users || [];
        setUsers(fetchedUsers);
        setTokenCost(data.data.cost || 0);

        // Update last fetched reference
        lastFetchedRef.current = {
          category: selectedCategory,
          tab: selectedTab,
        };

        // Fetch "Looking For" posts for these users
        if (fetchedUsers.length > 0) {
          fetchLookingForPosts(fetchedUsers.map((u) => u.id));
        }
      } else {
        if (response.status === 401) {
          Swal.fire({
            icon: "warning",
            title: "Login Required",
            text: data.message || "Please login to access Premium Lounge",
            confirmButtonColor: "#D4AF37",
          }).then(() => {
            navigate("/");
          });
        } else if (response.status === 403 && data.requiresUpgrade) {
          // Server says user is Regular - update localStorage and show upgrade dialog
          setLoading(false);
          setUsers([]);
          fetchingRef.current = false;
          lastFetchedRef.current = { category: null, tab: null };

          // Update localStorage to match server state
          try {
            const storedUser = localStorage.getItem("user");
            if (storedUser) {
              const parsedUser = JSON.parse(storedUser);
              parsedUser.category = "Regular";
              localStorage.setItem("user", JSON.stringify(parsedUser));
              // Trigger re-evaluation of getUserCategory
              setLocalStorageUpdateTrigger((prev) => prev + 1);
            }
          } catch (err) {
            console.error("Error updating user category in localStorage:", err);
          }

          // Re-evaluate and show upgrade dialog
          setUserCategoryConfirmed(true);
          setBenefitsDialogOpen(true);
          setUpgradeDialogOpen(false);
          return;
        } else {
          Swal.fire({
            icon: "error",
            title: "Error",
            text: data.message || "Failed to load premium users",
            confirmButtonColor: "#D4AF37",
          }).then(() => {
            navigate("/explore");
          });
        }
      }
    } catch (err) {
      console.error("Error fetching premium users:", err);
      // Only show error if user is premium (regular users should be handled by early return)
      if (user && user.category !== "Regular") {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "Failed to load premium lounge",
          confirmButtonColor: "#D4AF37",
        });
      }
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [user, isRegularUser, selectedTab, navigate]);

  const fetchFavorites = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const response = await fetch("/api/favourites", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        const favMap = {};
        data.data.forEach((fav) => {
          favMap[fav.favourite_user_id] = fav.id;
        });
        setFavorites(favMap);
      }
    } catch (error) {
      console.error("Error fetching favorites:", error);
    }
  };


  // Fetch current user's own "Looking For" post
  const fetchMyLookingForPost = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token || isRegularUser) return;

    try {
      const response = await fetch("/api/looking-for-posts/mine", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();
      if (data.success && data.data && data.data.length > 0) {
        // Get the latest post
        const latestPost = data.data[0];
        setMyLookingForPost(latestPost);
        setPostContent(latestPost.content || "");
      } else {
        setMyLookingForPost(null);
        setPostContent("");
      }
      setHasCheckedPost(true);
    } catch (err) {
      console.error("Error fetching my Looking For post:", err);
      setMyLookingForPost(null);
      setHasCheckedPost(true);
    }
  }, [isRegularUser]);

  useEffect(() => {
    // Check localStorage as fallback if user prop is not available yet
    const userCategory = getUserCategory();

    // Only fetch premium users if user is premium (not regular)
    if (userCategory && userCategory !== "Regular") {
      setUserCategoryConfirmed(true);
      fetchPremiumUsers();
      if (localStorage.getItem("token")) {
        fetchFavorites();
        fetchMyLookingForPost();
      }
    } else if (userCategory === "Regular") {
      // Regular user - stop loading, upgrade dialog will show
      setLoading(false);
      setUsers([]); // Clear users array
      fetchingRef.current = false; // Reset fetching flag
      lastFetchedRef.current = { category: null, tab: null }; // Reset last fetched
      setUserCategoryConfirmed(true);
    } else {
      // No user category found - user might still be loading
      // Set loading to false after brief delay to avoid indefinite loading
      const timeout = setTimeout(() => {
        setLoading(false);
        // If still no category after delay, check again
        const finalCategory = getUserCategory();
        if (finalCategory === "Regular" || !finalCategory) {
          setUserCategoryConfirmed(true);
        }
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [
    selectedTab,
    getUserCategory,
    fetchPremiumUsers,
    fetchMyLookingForPost,
  ]); // Only depend on category, not entire user object

  // Fetch "Looking For" posts for multiple users
  const fetchLookingForPosts = async (userIds) => {
    if (userIds.length === 0) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const response = await fetch(
        `/api/looking-for-posts/by-users?user_ids=${userIds.join(",")}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();
      if (data.success) {
        // Convert array to map by user_id
        const postsMap = {};
        data.data.forEach((post) => {
          postsMap[post.public_user_id] = post;
        });
        setLookingForPosts(postsMap);
      }
    } catch (err) {
      console.error("Error fetching Looking For posts:", err);
    }
  };

  // Create "Looking For" post
  const handleCreatePost = async () => {
    if (!postContent.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Content Required",
        text: "Please enter what you're looking for",
        confirmButtonColor: "#D4AF37",
      });
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      Swal.fire({
        icon: "warning",
        title: "Login Required",
        text: "Please login to post",
        confirmButtonColor: "#D4AF37",
      });
      return;
    }

    try {
      setPosting(true);

      // Create new post
      const response = await fetch("/api/looking-for-posts", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: postContent.trim() }),
      });

      const data = await response.json();

      if (data.success) {
        Swal.fire({
          icon: "success",
          title: "Post Created",
          text: "Your 'Looking For' post has been created",
          confirmButtonColor: "#D4AF37",
          timer: 2000,
          showConfirmButton: false,
        });
        setPostDialogOpen(false);
        setPostContent("");
        await fetchMyLookingForPost();
        // Refresh posts for all users if needed
        if (users.length > 0) {
          fetchLookingForPosts(users.map((u) => u.id));
        }
      } else {
        throw new Error(data.message || "Failed to create post");
      }
    } catch (error) {
      console.error("Error creating post:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: error.message || "Failed to create post",
        confirmButtonColor: "#D4AF37",
      });
    } finally {
      setPosting(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue);
    setUsers([]);
    setLookingForPosts({}); // Clear posts when switching tabs
    // Reset fetch tracking so new tab can fetch
    lastFetchedRef.current = { category: null, tab: null };
    fetchingRef.current = false;
  };

  const handleWhatsAppUnlock = async (targetUserId, targetUserName) => {
    const token = localStorage.getItem("token");
    if (!token) {
      Swal.fire({
        icon: "warning",
        title: "Login Required",
        text: "Please login to unlock WhatsApp contact",
        confirmButtonColor: "#D4AF37",
      });
      return;
    }

    try {
      setUnlocking((prev) => ({ ...prev, [targetUserId]: true }));

      // Get the cost
      const costResponse = await fetch(
        `/api/chat/cost?target_user_id=${targetUserId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const costData = await costResponse.json();

      if (!costData.success) {
        throw new Error(costData.message || "Failed to get chat cost");
      }

      const cost = costData.data.cost;
      const currentUser = JSON.parse(localStorage.getItem("user") || "{}");

      if (Number(currentUser.token_balance || 0) < cost) {
        Swal.fire({
          icon: "warning",
          title: "Insufficient Tokens",
          html: `<p>You need ${cost} tokens (${formatKshFromTokens(cost)}) to unlock this contact.</p><p>Your balance: ${currentUser.token_balance || 0} tokens</p>`,
          confirmButtonText: "Buy Tokens",
          cancelButtonText: "Cancel",
          showCancelButton: true,
          confirmButtonColor: "#D4AF37",
        }).then((result) => {
          if (result.isConfirmed) {
            navigate("/wallet");
          }
        });
        return;
      }

      const confirmResult = await Swal.fire({
        icon: "question",
        title: "Unlock WhatsApp Contact?",
        html: `<p>This will cost you <strong>${cost} tokens</strong> (${formatKshFromTokens(cost)})</p><p>Your balance: ${currentUser.token_balance || 0} tokens</p>`,
        showCancelButton: true,
        confirmButtonText: "Unlock",
        cancelButtonText: "Cancel",
        confirmButtonColor: "#D4AF37",
      });

      if (!confirmResult.isConfirmed) return;

      const unlockResponse = await fetch("/api/chat/unlock", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ target_user_id: targetUserId }),
      });

      const unlockData = await unlockResponse.json();

      if (!unlockResponse.ok) {
        throw new Error(unlockData.message || "Failed to unlock contact");
      }

      if (unlockData.success && unlockData.data) {
        const updatedUser = {
          ...currentUser,
          token_balance: (
            Number(currentUser.token_balance || 0) - cost
          ).toFixed(2),
        };
        localStorage.setItem("user", JSON.stringify(updatedUser));

        Swal.fire({
          icon: "success",
          title: "Contact Unlocked!",
          html: `
            <div style="text-align: center;">
              <p style="margin-bottom: 12px; font-size: 1rem;">You can now chat with <strong>${targetUserName}</strong> via WhatsApp</p>
              <p style="margin-bottom: 8px; color: rgba(26, 26, 26, 0.7); font-size: 0.9rem;">Phone Number:</p>
              <p style="margin-bottom: 16px; font-size: 1.1rem; font-weight: 600; color: #D4AF37;">${unlockData.data.phone}</p>
              <p style="margin-bottom: 0; font-size: 0.85rem; color: rgba(26, 26, 26, 0.6);">
                ${
                  /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent)
                    ? "Opening WhatsApp app..."
                    : "Opening WhatsApp Web..."
                }
              </p>
            </div>
          `,
          showConfirmButton: true,
          confirmButtonText: "Open WhatsApp",
          showCancelButton: true,
          cancelButtonText: "Copy Number",
          confirmButtonColor: "#D4AF37",
          cancelButtonColor: "rgba(26, 26, 26, 0.3)",
        }).then((result) => {
          if (result.isConfirmed) {
            window.location.href = unlockData.data.whatsapp_link;
          } else if (result.dismiss === Swal.DismissReason.cancel) {
            navigator.clipboard.writeText(unlockData.data.phone).then(() => {
              Swal.fire({
                icon: "success",
                title: "Copied!",
                text: "Phone number copied to clipboard",
                timer: 1500,
                showConfirmButton: false,
                confirmButtonColor: "#D4AF37",
              });
            });
          }
        });
      }
    } catch (error) {
      console.error("Unlock error:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: error.message || "Failed to unlock contact",
        confirmButtonColor: "#D4AF37",
      });
    } finally {
      setUnlocking((prev) => ({ ...prev, [targetUserId]: false }));
    }
  };

  const handleFavorite = async (userId) => {
    const token = localStorage.getItem("token");
    if (!token) {
      Swal.fire({
        icon: "warning",
        title: "Login Required",
        text: "Please login to favorite users",
        confirmButtonColor: "#D4AF37",
      });
      return;
    }

    const isFavorited = favorites[userId];
    const favoriteId = favorites[userId];

    try {
      setFavoriting((prev) => ({ ...prev, [userId]: true }));

      if (isFavorited && favoriteId) {
        const response = await fetch(`/api/favourites/${favoriteId}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          setFavorites((prev) => {
            const newFavs = { ...prev };
            delete newFavs[userId];
            return newFavs;
          });
        }
      } else {
        const response = await fetch("/api/favourites", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ favourite_user_id: userId }),
        });

        const data = await response.json();

        if (!response.ok) {
          // Handle subscription-related errors
          if (response.status === 402) {
            // No active subscription
            Swal.fire({
              icon: "warning",
              title: "Subscription Required",
              html: `<p>${data.message || "Active subscription required to add favourites."}</p><p>Please subscribe to a plan to continue.</p>`,
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
          } else if (response.status === 429) {
            // Maximum favorites reached
            Swal.fire({
              icon: "info",
              title: "Maximum Favorites Reached",
              html: `<p>${data.message || "You have reached the maximum favourites allowed for your plan."}</p><p>Please upgrade your plan to add more favorites.</p>`,
              confirmButtonText: "View Plans",
              cancelButtonText: "OK",
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
          throw new Error(data.message || "Failed to add favorite");
        }

        if (data.success) {
          setFavorites((prev) => ({
            ...prev,
            [userId]: data.data.id,
          }));
        }
      }
    } catch (error) {
      console.error("Favorite error:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: error.message || "Failed to update favorite",
        confirmButtonColor: "#D4AF37",
      });
    } finally {
      setFavoriting((prev) => ({ ...prev, [userId]: false }));
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case "Sugar Mummy":
        return "rgba(255, 192, 203, 0.3)";
      case "Sponsor":
        return "rgba(176, 196, 222, 0.3)";
      case "Ben 10":
        return "rgba(152, 251, 152, 0.3)";
      case "Urban Chics":
        return "rgba(255, 218, 185, 0.3)";
      default:
        return "rgba(212, 175, 55, 0.15)";
    }
  };

  return (
    <Box
      sx={{
        backgroundColor: "#FAFAFA",
        minHeight: "100%",
        width: "100%",
      }}
    >
      {/* Premium benefits dialog for regular users */}
      <Dialog
        open={confirmedIsRegularUser && benefitsDialogOpen}
        onClose={() => {
          setBenefitsDialogOpen(false);
          if (confirmedIsRegularUser) {
            navigate("/explore");
          }
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Typography
            variant="h6"
            component="div"
            fontWeight={700}
            sx={isSmallScreen ? { fontSize: "1rem" } : undefined}
          >
            Unlock Premium Lounge Benefits
          </Typography>
        </DialogTitle>
        <DialogContent dividers>
          <Typography
            variant="body2"
            sx={{
              mb: 2,
              color: "text.secondary",
              ...(isSmallScreen ? { fontSize: "0.85rem" } : {}),
            }}
          >
            Upgrade to enjoy the full premium experience:
          </Typography>
          <List sx={{ py: 0 }}>
            <ListItem
              alignItems="flex-start"
              sx={{ px: 0, ...(isSmallScreen ? { py: 0.5 } : {}) }}
            >
              <ListItemIcon sx={{ minWidth: 36, color: "#D4AF37" }}>
                <CheckCircle />
              </ListItemIcon>
              <ListItemText
                primaryTypographyProps={
                  isSmallScreen ? { fontSize: "0.95rem", fontWeight: 600 } : {}
                }
                secondaryTypographyProps={
                  isSmallScreen ? { fontSize: "0.8rem" } : {}
                }
                primary="Exclusive Access"
                secondary="Only premium users can enter the private Premium Lounge with verified profiles, curated tabs, and premium-only matchmaking tools."
              />
            </ListItem>
            <ListItem
              alignItems="flex-start"
              sx={{ px: 0, ...(isSmallScreen ? { py: 0.5 } : {}) }}
            >
              <ListItemIcon sx={{ minWidth: 36, color: "#D4AF37" }}>
                <CheckCircle />
              </ListItemIcon>
              <ListItemText
                primaryTypographyProps={
                  isSmallScreen ? { fontSize: "0.95rem", fontWeight: 600 } : {}
                }
                secondaryTypographyProps={
                  isSmallScreen ? { fontSize: "0.8rem" } : {}
                }
                primary="Instant Verification & Visibility"
                secondary="Upgrading makes you instantly verified and boosts your profile’s visibility across Explore, Featured, and search."
              />
            </ListItem>
            <ListItem
              alignItems="flex-start"
              sx={{ px: 0, ...(isSmallScreen ? { py: 0.5 } : {}) }}
            >
              <ListItemIcon sx={{ minWidth: 36, color: "#D4AF37" }}>
                <CheckCircle />
              </ListItemIcon>
              <ListItemText
                primaryTypographyProps={
                  isSmallScreen ? { fontSize: "0.95rem", fontWeight: 600 } : {}
                }
                secondaryTypographyProps={
                  isSmallScreen ? { fontSize: "0.8rem" } : {}
                }
                primary="Premium “Looking For” Posts"
                secondary="Post exclusive “Looking For” ads in the Premium Lounge to attract matches directly."
              />
            </ListItem>
            <ListItem
              alignItems="flex-start"
              sx={{ px: 0, ...(isSmallScreen ? { py: 0.5 } : {}) }}
            >
              <ListItemIcon sx={{ minWidth: 36, color: "#D4AF37" }}>
                <CheckCircle />
              </ListItemIcon>
              <ListItemText
                primaryTypographyProps={
                  isSmallScreen ? { fontSize: "0.95rem", fontWeight: 600 } : {}
                }
                secondaryTypographyProps={
                  isSmallScreen ? { fontSize: "0.8rem" } : {}
                }
                primary="Lower Chat Unlock Costs"
                secondary="Premium-to-premium WhatsApp unlocks cost 90% less (2.5 KES vs 25 KES), helping you save tokens."
              />
            </ListItem>
            <ListItem
              alignItems="flex-start"
              sx={{ px: 0, ...(isSmallScreen ? { py: 0.5 } : {}) }}
            >
              <ListItemIcon sx={{ minWidth: 36, color: "#D4AF37" }}>
                <CheckCircle />
              </ListItemIcon>
              <ListItemText
                primaryTypographyProps={
                  isSmallScreen ? { fontSize: "0.95rem", fontWeight: 600 } : {}
                }
                secondaryTypographyProps={
                  isSmallScreen ? { fontSize: "0.8rem" } : {}
                }
                primary="Faster Premium Matchmaking"
                secondary="Premium members are routed to other verified users for quicker, smoother connections."
              />
            </ListItem>
          </List>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={() => {
              setBenefitsDialogOpen(false);
              navigate("/explore");
            }}
            sx={{ textTransform: "none" }}
          >
            Not now
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              setBenefitsDialogOpen(false);
              setUpgradeDialogOpen(true);
            }}
            sx={{
              textTransform: "none",
              background: "linear-gradient(135deg, #D4AF37, #B8941F)",
              color: "#1a1a1a",
              "&:hover": {
                background: "linear-gradient(135deg, #B8941F, #D4AF37)",
              },
            }}
          >
            Upgrade now
          </Button>
        </DialogActions>
      </Dialog>

      {/* Upgrade Dialog - always render for regular users, controlled by open prop */}
      <UpgradeDialog
        open={confirmedIsRegularUser && upgradeDialogOpen}
        onClose={() => {
          setUpgradeDialogOpen(false);
          if (confirmedIsRegularUser) {
            navigate("/explore");
          }
        }}
      />

      {/* Main Premium Lounge content - only shown for premium users */}
      {userCategoryConfirmed && !confirmedIsRegularUser && (
        <Box>
          {/* Header */}
          <Box sx={{ mb: 4 }}>
            <Box
              sx={{
                display: "flex",
                flexDirection: "row",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: { xs: 1, sm: 2 },
                mb: 2,
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
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    <Star
                      sx={{
                        fontSize: { xs: 32, sm: 40 },
                        color: "#D4AF37",
                        flexShrink: 0,
                      }}
                    />
                    <Typography
                      variant="h4"
                      sx={{
                        fontWeight: 800,
                        background: "linear-gradient(45deg, #D4AF37, #B8941F)",
                        backgroundClip: "text",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        fontSize: { xs: "1.5rem", sm: "2.125rem" },
                        lineHeight: 1.2,
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      Premium Lounge
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
                    <Tooltip title="Profile" arrow>
                      <span>
                        <IconButton
                          onClick={() => navigate("/profile")}
                          sx={{
                            backgroundColor: "rgba(212, 175, 55, 0.12)",
                            border: "1px solid rgba(212, 175, 55, 0.3)",
                            "&:hover": {
                              backgroundColor: "rgba(212, 175, 55, 0.22)",
                            },
                            flexShrink: 0,
                            width: { xs: "36px", sm: "40px" },
                            height: { xs: "36px", sm: "40px" },
                            p: { xs: 0.75, sm: 1 },
                          }}
                        >
                          <AccountCircle
                            sx={{
                              color: "#D4AF37",
                              fontSize: { xs: "1.25rem", sm: "1.5rem" },
                            }}
                          />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Box>
                </Box>
                <Typography
                  variant="body1"
                  sx={{
                    color: "rgba(26, 26, 26, 0.7)",
                    mt: 0.5,
                    fontSize: { xs: "0.8125rem", sm: "1rem" },
                    lineHeight: 1.4,
                  }}
                >
                  Exclusive verified premium profiles
                </Typography>
              </Box>
            </Box>

            {/* "Looking For" Post Card */}
            <Card
              sx={{
                mb: 2,
                borderRadius: "12px",
                background:
                  "linear-gradient(135deg, rgba(212, 175, 55, 0.1) 0%, rgba(184, 148, 31, 0.05) 100%)",
                border: "2px solid rgba(212, 175, 55, 0.3)",
                boxShadow: "0 2px 12px rgba(212, 175, 55, 0.15)",
              }}
            >
              <CardContent
                sx={{
                  p: { xs: 1.5, sm: 1.5 },
                  "&:last-child": { pb: { xs: 1.5, sm: 1.5 } },
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: { xs: 1, sm: 1.5 },
                    flexWrap: "wrap",
                  }}
                >
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    {isSmallScreen ? (
                      <Tooltip
                        title="Post what you're looking for to attract premium matches (you can create multiple posts)"
                        arrow
                        placement="top"
                      >
                        <Typography
                          variant="h6"
                          sx={{
                            fontWeight: 700,
                            color: "#1a1a1a",
                            mb: { xs: 0, sm: 0.25 },
                            fontSize: { xs: "1rem", sm: "1.125rem" },
                            cursor: "help",
                            lineHeight: 1.2,
                          }}
                        >
                          What Are You Looking For?
                        </Typography>
                      </Tooltip>
                    ) : (
                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: 700,
                          color: "#1a1a1a",
                          mb: 0.25,
                          fontSize: { xs: "1rem", sm: "1.125rem" },
                          lineHeight: 1.2,
                        }}
                      >
                        What Are You Looking For?
                      </Typography>
                    )}
                    <Typography
                      variant="body2"
                      sx={{
                        color: "rgba(26, 26, 26, 0.6)",
                        fontSize: { xs: "0.8rem", sm: "0.875rem" },
                        display: { xs: "none", sm: "block" },
                        lineHeight: 1.3,
                        mt: 0.25,
                      }}
                    >
                      Post what you're looking for to attract premium matches
                      (you can create multiple posts)
                    </Typography>
                  </Box>
                  <Button
                    variant="contained"
                    startIcon={<Edit />}
                    onClick={() => {
                      setPostContent("");
                      setPostDialogOpen(true);
                    }}
                    sx={{
                      background: "linear-gradient(135deg, #D4AF37, #B8941F)",
                      color: "#1a1a1a",
                      fontWeight: 600,
                      textTransform: "none",
                      borderRadius: "8px",
                      px: { xs: 1.5, sm: 2 },
                      py: { xs: 0.75, sm: 0.875 },
                      fontSize: { xs: "0.75rem", sm: "0.875rem" },
                      minHeight: { xs: "36px", sm: "40px" },
                      "&:hover": {
                        background: "linear-gradient(135deg, #B8941F, #D4AF37)",
                      },
                    }}
                  >
                    {myLookingForPost ? "Create New Post" : "Post"}
                  </Button>
                </Box>
              </CardContent>
            </Card>

            {/* Category Tabs */}
            <Card
              sx={{
                borderRadius: "12px",
                overflow: "hidden",
                border: "1px solid rgba(212, 175, 55, 0.2)",
              }}
            >
              <Tabs
                value={selectedTab}
                onChange={handleTabChange}
                variant="fullWidth"
                sx={{
                  minHeight: isSmallScreen ? 44 : 48,
                  "& .MuiTabs-flexContainer": {
                    gap: isSmallScreen ? 0.5 : 0,
                  },
                  "& .MuiTabs-indicator": {
                    backgroundColor: "#D4AF37",
                    height: 3,
                  },
                  "& .MuiTab-root": {
                    textTransform: "none",
                    fontWeight: 600,
                    color: "rgba(26, 26, 26, 0.6)",
                    fontSize: isSmallScreen ? "0.75rem" : "0.95rem",
                    lineHeight: 1.2,
                    minWidth: 0,
                    paddingInline: isSmallScreen ? 0.5 : 1.5,
                    paddingBlock: isSmallScreen ? 0.5 : 1,
                    borderRadius: isSmallScreen ? "8px" : 0,
                    "&.Mui-selected": {
                      color: "#D4AF37",
                    },
                  },
                }}
              >
                {categories.map((category) => (
                  <Tab key={category.value} label={category.label} />
                ))}
              </Tabs>
            </Card>
          </Box>

          {/* Users Grid */}
          {loading ? (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                minHeight: "400px",
              }}
            >
              <CircularProgress sx={{ color: "#D4AF37" }} />
            </Box>
          ) : users.length === 0 ? (
            <Card
              sx={{
                p: 4,
                textAlign: "center",
                borderRadius: "16px",
                background:
                  "linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(245, 230, 211, 0.2) 100%)",
                border: "1px solid rgba(212, 175, 55, 0.2)",
              }}
            >
              <Star
                sx={{ fontSize: 64, color: "rgba(212, 175, 55, 0.5)", mb: 2 }}
              />
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 600,
                  color: "#1a1a1a",
                  mb: 1,
                }}
              >
                No verified {categories[selectedTab].label} profiles yet
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: "rgba(26, 26, 26, 0.6)",
                }}
              >
                Verified premium profiles will appear here
              </Typography>
            </Card>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {users.map((userData) => (
                <Card
                  key={userData.id}
                  sx={{
                    height: "100%",
                    minHeight: { xs: "auto", sm: "250px" },
                    display: "flex",
                    flexDirection: { xs: "column", sm: "row" },
                    borderRadius: "16px",
                    background:
                      "linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(245, 230, 211, 0.2) 100%)",
                    border: "2px solid rgba(212, 175, 55, 0.3)",
                    boxShadow: "0 4px 20px rgba(212, 175, 55, 0.15)",
                    transition: "all 0.3s ease",
                    "&:hover": {
                      transform: "translateY(-4px)",
                      boxShadow: "0 8px 30px rgba(212, 175, 55, 0.25)",
                      border: "2px solid rgba(212, 175, 55, 0.5)",
                    },
                    overflow: "hidden",
                  }}
                >
                  {/* Photo Section */}
                  <Box
                    sx={{
                      position: "relative",
                      width: { xs: "100%", sm: "200px", md: "200px" },
                      minWidth: { xs: "100%", sm: "200px", md: "200px" },
                      height: {
                        xs: "250px",
                        sm: "250px",
                        md: "250px",
                        lg: "100%",
                      },
                      minHeight: {
                        xs: "250px",
                        sm: "250px",
                        md: "250px",
                        lg: "250px",
                      },
                      backgroundColor: "rgba(212, 175, 55, 0.1)",
                      overflow: "visible",
                      flexShrink: 0,
                    }}
                  >
                    <Box
                      sx={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        minHeight: "250px",
                        overflow: "hidden",
                      }}
                    >
                      {userData.photo ? (
                        <Box
                          component="img"
                          src={buildImageUrl(userData.photo)}
                          alt={getDisplayName(userData, { fallback: "Member" })}
                          sx={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                          onError={(e) => {
                            e.target.style.display = "none";
                          }}
                        />
                      ) : (
                        <Box
                          sx={{
                            width: "100%",
                            height: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Avatar
                            sx={{
                              width: { xs: "120px", sm: "150px", md: "120px" },
                              height: { xs: "120px", sm: "150px", md: "120px" },
                              bgcolor: "#D4AF37",
                              fontSize: { xs: "3rem", sm: "4rem", md: "3rem" },
                              fontWeight: 700,
                            }}
                          >
                            {getDisplayInitial(userData, { fallback: "U" })}
                          </Avatar>
                        </Box>
                      )}
                    </Box>

                    {/* Favorite Button */}
                    {localStorage.getItem("token") && (
                      <IconButton
                        onClick={() => handleFavorite(userData.id)}
                        disabled={favoriting[userData.id]}
                        sx={{
                          position: "absolute",
                          top: 8,
                          left: 8,
                          bgcolor: "rgba(255, 255, 255, 0.9)",
                          color: favorites[userData.id] ? "#F44336" : "#666",
                          zIndex: 20,
                          width: { xs: "36px", sm: "40px", md: "36px" },
                          height: { xs: "36px", sm: "40px", md: "36px" },
                          "&:hover": {
                            bgcolor: "rgba(255, 255, 255, 1)",
                            transform: "scale(1.1)",
                          },
                          transition: "all 0.2s ease",
                        }}
                      >
                        {favoriting[userData.id] ? (
                          <CircularProgress size={20} />
                        ) : favorites[userData.id] ? (
                          <Favorite />
                        ) : (
                          <FavoriteBorder />
                        )}
                      </IconButton>
                    )}

                    {/* Online Badge */}
                    {Boolean(userData.is_online) && (
                      <Box
                        sx={{
                          position: "absolute",
                          top: 8,
                          right: 8,
                          width: { xs: "14px", sm: "16px", md: "14px" },
                          height: { xs: "14px", sm: "16px", md: "14px" },
                          borderRadius: "50%",
                          bgcolor: "#4CAF50",
                          border: "3px solid white",
                          boxShadow: "0 2px 8px rgba(76, 175, 80, 0.5)",
                          zIndex: 20,
                        }}
                        title="Online"
                      />
                    )}

                    {/* Verified Badge */}
                    {userData.isVerified && (
                      <Chip
                        icon={
                          <Verified
                            sx={{
                              fontSize: "1rem !important",
                              color: "#D4AF37",
                            }}
                          />
                        }
                        label="Verified"
                        size="small"
                        sx={{
                          position: "absolute",
                          bottom: { xs: 8, sm: 8, md: 8, lg: 8 },
                          right: { xs: 8, sm: 8, md: 8, lg: 8 },
                          bgcolor: "rgba(255, 255, 255, 0.95)",
                          fontWeight: 600,
                          fontSize: {
                            xs: "0.65rem",
                            sm: "0.7rem",
                            md: "0.7rem",
                            lg: "0.75rem",
                          },
                          border: "1px solid rgba(212, 175, 55, 0.3)",
                          zIndex: 25,
                          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
                        }}
                      />
                    )}
                  </Box>

                  {/* Content Section */}
                  <CardContent
                    sx={{
                      flexGrow: 1,
                      display: "flex",
                      flexDirection: "column",
                      p: 2,
                    }}
                  >
                    {/* Name and Category */}
                    <Box sx={{ mb: 1 }}>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          mb: 0.5,
                        }}
                      >
                        <Typography
                          variant="h6"
                          sx={{
                            fontWeight: 700,
                            fontSize: { xs: "1rem", sm: "1.125rem" },
                            color: "#1a1a1a",
                            lineHeight: 1.2,
                            flex: 1,
                          }}
                        >
                          {getDisplayName(userData, { fallback: "Member" })}
                        </Typography>
                        {lookingForPosts[userData.id] && (
                          <Tooltip title="View What They're Looking For">
                            <IconButton
                              size="small"
                              onClick={() => {
                                setSelectedLookingForPost({
                                  userName: getDisplayName(userData, {
                                    fallback: "Member",
                                  }),
                                  content: lookingForPosts[userData.id].content,
                                  createdAt:
                                    lookingForPosts[userData.id].createdAt,
                                });
                                setLookingForDialogOpen(true);
                              }}
                              sx={{
                                color: "#D4AF37",
                                "&:hover": {
                                  backgroundColor: "rgba(212, 175, 55, 0.1)",
                                  transform: "scale(1.1)",
                                },
                                transition: "all 0.2s ease",
                              }}
                            >
                              <Visibility fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                      <Chip
                        label={userData.category || "Regular"}
                        size="small"
                        sx={{
                          bgcolor: getCategoryColor(userData.category),
                          color: "#1a1a1a",
                          fontWeight: 600,
                          fontSize: "0.7rem",
                          height: "22px",
                        }}
                      />
                    </Box>

                    <Divider
                      sx={{ my: 1, borderColor: "rgba(212, 175, 55, 0.2)" }}
                    />

                    {/* Info */}
                    <Stack spacing={0.5} sx={{ mb: 1.5, flexGrow: 1 }}>
                      {userData.county && (
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                          }}
                        >
                          <LocationOn
                            sx={{
                              fontSize: "1rem",
                              color: "rgba(26, 26, 26, 0.6)",
                            }}
                          />
                          <Typography
                            variant="body2"
                            sx={{
                              color: "rgba(26, 26, 26, 0.7)",
                              fontSize: "0.8rem",
                            }}
                          >
                            {userData.county}
                          </Typography>
                        </Box>
                      )}
                      {userData.age && (
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                          }}
                        >
                          <Cake
                            sx={{
                              fontSize: "1rem",
                              color: "rgba(26, 26, 26, 0.6)",
                            }}
                          />
                          <Typography
                            variant="body2"
                            sx={{
                              color: "rgba(26, 26, 26, 0.7)",
                              fontSize: "0.8rem",
                            }}
                          >
                            {userData.age} years old
                          </Typography>
                        </Box>
                      )}
                    </Stack>

                    {/* Bio Preview */}
                    {userData.bio && (
                      <Typography
                        variant="body2"
                        sx={{
                          color: "rgba(26, 26, 26, 0.7)",
                          fontSize: "0.8rem",
                          mb: 1.5,
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {userData.bio}
                      </Typography>
                    )}

                    {/* Actions */}
                    <Stack direction="row" spacing={1} sx={{ mt: "auto" }}>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => {
                          setViewingUserId(userData.id);
                          setViewProfileOpen(true);
                        }}
                        sx={{
                          borderColor: "rgba(212, 175, 55, 0.5)",
                          color: "#1a1a1a",
                          fontWeight: 600,
                          textTransform: "none",
                          borderRadius: "8px",
                          fontSize: "0.75rem",
                          flex: 1,
                          "&:hover": {
                            borderColor: "#D4AF37",
                            bgcolor: "rgba(212, 175, 55, 0.1)",
                          },
                        }}
                      >
                        View Profile
                      </Button>
                      <Tooltip title="Unlock WhatsApp Contact">
                        <Button
                          variant="contained"
                          color="primary"
                          onClick={() =>
                            handleWhatsAppUnlock(
                              userData.id,
                              getDisplayName(userData, { fallback: "Member" })
                            )
                          }
                          disabled={unlocking[userData.id]}
                          sx={{
                            mt: 1,
                            background:
                              "linear-gradient(135deg, #D4AF37, #B8941F)",
                            color: "#1a1a1a",
                            fontWeight: 600,
                            textTransform: "none",
                            borderRadius: "12px",
                            px: 3,
                            py: 1,
                            transition: "all 0.3s",
                            "&:hover": {
                              background:
                                "linear-gradient(135deg, #B8941F, #D4AF37)",
                              transform: "translateY(-2px)",
                            },
                            "&:disabled": {
                              opacity: 0.6,
                              cursor: "not-allowed",
                            },
                          }}
                        >
                          {unlocking[userData.id] ? "Unlocking..." : "Chat"}
                        </Button>
                      </Tooltip>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}

          {/* View Profile Dialog */}
          <ViewProfile
            open={viewProfileOpen}
            onClose={() => {
              setViewProfileOpen(false);
              setViewingUserId(null);
            }}
            userId={viewingUserId}
          />

          {/* "Looking For" Dialog */}
          <Dialog
            open={lookingForDialogOpen}
            onClose={() => {
              setLookingForDialogOpen(false);
              setSelectedLookingForPost(null);
            }}
            maxWidth="sm"
            fullWidth
            sx={{
              "& .MuiDialog-paper": {
                borderRadius: "16px",
                background: "#FFFFFF",
                border: "1px solid rgba(212, 175, 55, 0.3)",
              },
            }}
          >
            <DialogTitle
              sx={{
                background: "linear-gradient(135deg, #D4AF37, #B8941F)",
                color: "#1a1a1a",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: 1,
                pb: 2,
              }}
            >
              <Visibility sx={{ color: "#1a1a1a" }} />
              {selectedLookingForPost?.userName
                ? `${selectedLookingForPost.userName}'s Looking For`
                : "Looking For"}
            </DialogTitle>
            <DialogContent sx={{ pt: 3, backgroundColor: "#FFFFFF" }}>
              {selectedLookingForPost?.content && (
                <Box>
                  <Typography
                    variant="body1"
                    sx={{
                      color: "#1a1a1a",
                      lineHeight: 1.8,
                      whiteSpace: "pre-wrap",
                      fontSize: "1rem",
                      mb: 2,
                    }}
                  >
                    {selectedLookingForPost.content}
                  </Typography>
                  {selectedLookingForPost.createdAt && (
                    <Typography
                      variant="caption"
                      sx={{
                        color: "rgba(26, 26, 26, 0.5)",
                        fontStyle: "italic",
                      }}
                    >
                      Posted on{" "}
                      {new Date(
                        selectedLookingForPost.createdAt
                      ).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </Typography>
                  )}
                </Box>
              )}
            </DialogContent>
            <DialogActions
              sx={{
                p: 2,
                borderTop: "1px solid rgba(212, 175, 55, 0.2)",
                backgroundColor: "#FFFFFF",
              }}
            >
              <Button
                onClick={() => {
                  setLookingForDialogOpen(false);
                  setSelectedLookingForPost(null);
                }}
                sx={{
                  color: "#1a1a1a",
                  fontWeight: 600,
                  textTransform: "none",
                  "&:hover": {
                    backgroundColor: "rgba(212, 175, 55, 0.1)",
                  },
                }}
              >
                Close
              </Button>
            </DialogActions>
          </Dialog>

          {/* Create "Looking For" Post Dialog */}
          <Dialog
            open={postDialogOpen}
            onClose={() => {
              if (!posting) {
                setPostDialogOpen(false);
                setPostContent("");
              }
            }}
            maxWidth="sm"
            fullWidth
            sx={{
              "& .MuiDialog-paper": {
                borderRadius: "16px",
                background: "#FFFFFF",
                border: "1px solid rgba(212, 175, 55, 0.3)",
              },
            }}
          >
            <DialogTitle
              sx={{
                background: "linear-gradient(135deg, #D4AF37, #B8941F)",
                color: "#1a1a1a",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: 1,
                pb: 2,
              }}
            >
              <Edit sx={{ color: "#1a1a1a" }} />
              Post What You're Looking For
            </DialogTitle>
            <DialogContent sx={{ pt: 3, backgroundColor: "#FFFFFF" }}>
              <TextField
                multiline
                rows={6}
                fullWidth
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                placeholder="Describe what you're looking for... Be specific and clear to attract the right matches."
                variant="outlined"
                disabled={posting}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "12px",
                    "& fieldset": {
                      borderColor: "rgba(212, 175, 55, 0.3)",
                    },
                    "&:hover fieldset": {
                      borderColor: "rgba(212, 175, 55, 0.5)",
                    },
                    "&.Mui-focused fieldset": {
                      borderColor: "#D4AF37",
                    },
                  },
                }}
              />
              <Typography
                variant="caption"
                sx={{
                  color: "rgba(26, 26, 26, 0.6)",
                  mt: 1,
                  display: "block",
                }}
              >
                This post will be visible to other premium users in the Premium
                Lounge
              </Typography>
            </DialogContent>
            <DialogActions
              sx={{
                p: 2,
                borderTop: "1px solid rgba(212, 175, 55, 0.2)",
                backgroundColor: "#FFFFFF",
                gap: 1,
              }}
            >
              <Button
                onClick={() => {
                  setPostDialogOpen(false);
                  setPostContent("");
                }}
                disabled={posting}
                sx={{
                  color: "#1a1a1a",
                  fontWeight: 600,
                  textTransform: "none",
                  "&:hover": {
                    backgroundColor: "rgba(212, 175, 55, 0.1)",
                  },
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreatePost}
                disabled={posting || !postContent.trim()}
                variant="contained"
                sx={{
                  background: "linear-gradient(135deg, #D4AF37, #B8941F)",
                  color: "#1a1a1a",
                  fontWeight: 600,
                  textTransform: "none",
                  borderRadius: "8px",
                  px: 3,
                  "&:hover": {
                    background: "linear-gradient(135deg, #B8941F, #D4AF37)",
                  },
                  "&:disabled": {
                    opacity: 0.6,
                  },
                }}
              >
                {posting ? (
                  <>
                    <CircularProgress
                      size={16}
                      sx={{ mr: 1, color: "#1a1a1a" }}
                    />
                    Posting...
                  </>
                ) : (
                  "Post"
                )}
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      )}

      {/* Show loading state while checking user status */}
      {(!userCategoryConfirmed || (loading && !confirmedIsRegularUser)) && (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "400px",
            backgroundColor: "#FAFAFA",
          }}
        >
          <CircularProgress sx={{ color: "#D4AF37" }} />
        </Box>
      )}
    </Box>
  );
}
