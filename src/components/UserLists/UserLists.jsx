import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Avatar,
  Button,
  Chip,
  CircularProgress,
  Tabs,
  Tab,
  IconButton,
} from "@mui/material";
import {
  Favorite,
  FavoriteBorder,
  Chat,
  WhatsApp,
  Person,
  LocationOn,
  Cake,
  Verified,
  Delete,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { getDisplayInitial, getDisplayName } from "../../utils/userDisplay";

export default function UserLists({
  user,
  showTabs = true,
  defaultTab = "favorites",
}) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [favorites, setFavorites] = useState([]);
  const [unlockedChats, setUnlockedChats] = useState([]);
  const [loadingFavorites, setLoadingFavorites] = useState(false);
  const [loadingUnlocked, setLoadingUnlocked] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState({});
  const [subscription, setSubscription] = useState(null);

  const token = localStorage.getItem("token");

  // Fetch favorites
  const fetchFavorites = async () => {
    try {
      setLoadingFavorites(true);
      const response = await fetch("/api/favourites", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      const data = await response.json();
      if (data.success) {
        setFavorites(data.data || []);
      }
    } catch (err) {
      console.error("Error fetching favorites:", err);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to load favorites",
        confirmButtonColor: "#D4AF37",
      });
    } finally {
      setLoadingFavorites(false);
    }
  };

  // Fetch unlocked chats
  const fetchUnlockedChats = async () => {
    try {
      setLoadingUnlocked(true);
      const response = await fetch("/api/chat", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      const data = await response.json();
      if (data.success) {
        setUnlockedChats(data.data || []);
      }
    } catch (err) {
      console.error("Error fetching unlocked chats:", err);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to load unlocked chats",
        confirmButtonColor: "#D4AF37",
      });
    } finally {
      setLoadingUnlocked(false);
    }
  };

  // Remove favorite
  const removeFavorite = async (favoriteId) => {
    try {
      const response = await fetch(`/api/favourites/${favoriteId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setFavorites(favorites.filter((fav) => fav.id !== favoriteId));
        Swal.fire({
          icon: "success",
          title: "Removed",
          text: "Removed from favorites",
          confirmButtonColor: "#D4AF37",
          timer: 1500,
        });
      }
    } catch (err) {
      console.error("Error removing favorite:", err);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to remove favorite",
        confirmButtonColor: "#D4AF37",
      });
    }
  };

  // Open WhatsApp
  const openWhatsApp = (phone) => {
    if (!phone) {
      Swal.fire({
        icon: "warning",
        title: "No Phone Number",
        text: "This user doesn't have a phone number",
        confirmButtonColor: "#D4AF37",
      });
      return;
    }
    const cleanedNumber = phone.replace(/[^0-9+]/g, "");
    const whatsappUrl = `https://wa.me/${cleanedNumber.replace(/^\+/, "")}`;
    window.open(whatsappUrl, "_blank");
  };

  // Get image URL
  const buildImageUrl = (imageUrl) => {
    if (!imageUrl || typeof imageUrl !== "string") return "";
    try {
      // Check if it's already a valid URL
      if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
        new URL(imageUrl); // Validate URL
        return imageUrl;
      }
      if (imageUrl.startsWith("uploads/")) return `/${imageUrl}`;
      if (imageUrl.startsWith("/uploads/")) return imageUrl;
      if (imageUrl.startsWith("profiles/")) return `/uploads/${imageUrl}`;
      // If it doesn't start with /, add it
      if (!imageUrl.startsWith("/")) return `/${imageUrl}`;
      return imageUrl;
    } catch (error) {
      console.error("Invalid image URL:", imageUrl, error);
      return "";
    }
  };

  // Get all images for a user (main photo + photos array)
  const getAllImages = (userData) => {
    if (!userData) return [];
    const images = [];
    // Add main photo if it exists (API already filters unapproved photos)
    if (userData.photo) {
      const imageUrl = buildImageUrl(userData.photo);
      if (imageUrl) images.push(imageUrl);
    }
    // Add photos from array if they exist (API already filters to approved only)
    if (userData.photos && Array.isArray(userData.photos)) {
      userData.photos.forEach((photo) => {
        if (photo && photo.path) {
          const imageUrl = buildImageUrl(photo.path);
          if (imageUrl) images.push(imageUrl);
        }
      });
    }
    return images;
  };

  // Auto-transition images
  useEffect(() => {
    const allUsers =
      activeTab === "favorites"
        ? favorites.map((f) => f?.favouritedUser).filter((u) => u && u.id)
        : unlockedChats.map((u) => u?.target).filter((u) => u && u.id);

    if (allUsers.length === 0) return;

    const intervals = {};
    const newIndices = {};

    allUsers.forEach((userData) => {
      if (!userData || !userData.id) return;
      const images = getAllImages(userData);
      const userId = userData.id;

      images.forEach((imageSrc) => {
        if (imageSrc) {
          const img = new Image();
          img.src = imageSrc;
        }
      });

      newIndices[userId] = 0;

      if (images.length > 1) {
        const imageCount = images.length;
        intervals[userId] = setInterval(() => {
          setCurrentImageIndex((prev) => {
            const currentIdx = prev[userId] || 0;
            const nextIdx = (currentIdx + 1) % imageCount;
            return { ...prev, [userId]: nextIdx };
          });
        }, 3000);
      }
    });

    setCurrentImageIndex(newIndices);

    return () => {
      Object.values(intervals).forEach((interval) => clearInterval(interval));
    };
  }, [favorites, unlockedChats, activeTab]);

  // Fetch subscription status
  const fetchSubscription = React.useCallback(async () => {
    if (!token) {
      setSubscription(null);
      return;
    }

    try {
      const response = await fetch("/api/subscriptions/status", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (
        data.success &&
        data.data?.hasSubscription &&
        data.data.subscription
      ) {
        setSubscription(data.data.subscription);
      } else {
        setSubscription(null);
      }
    } catch (error) {
      console.error("Error fetching subscription:", error);
      setSubscription(null);
    }
  }, [token]);

  useEffect(() => {
    fetchSubscription();
  }, [token, user, fetchSubscription]);

  // Poll for subscription updates (replaces SSE for better performance)
  useEffect(() => {
    if (!token || !user?.id) return;

    let pollInterval = null;

    // Poll every 45 seconds - checks subscription status without blocking initial load
    const startPolling = () => {
      // Clear any existing interval first
      if (pollInterval) {
        clearInterval(pollInterval);
      }

      pollInterval = setInterval(() => {
        // Only poll if page is visible (don't waste resources on hidden tabs)
        if (document.hidden) {
          return;
        }

        // Non-blocking fetch - doesn't delay component loading
        fetchSubscription().catch((err) => {
          console.error("[UserLists] Polling error:", err);
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
  }, [token, user?.id, fetchSubscription]);

  // Check if user has active subscription
  const hasActiveSubscription = subscription?.status === "active";

  // Show subscription required dialog
  const showSubscriptionRequiredDialog = () => {
    Swal.fire({
      icon: "info",
      title: "Subscription Required",
      html: `
        <div style="text-align: left;">
          <p style="margin-bottom: 12px; font-size: 0.9rem; color: #333;">
            <strong>Explore</strong> requires an active subscription.
          </p>
          <div style="background: #f5f5f5; padding: 12px; border-radius: 8px; margin-bottom: 12px;">
            <p style="margin: 0; font-size: 0.85rem; color: #666; line-height: 1.4;">
              Explore lets you discover and connect with other members based on your preferences. Subscribe to unlock unlimited profile browsing and find your perfect match.
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

  // Handle navigation to explore with subscription check
  const handleNavigateToExplore = () => {
    if (!hasActiveSubscription) {
      showSubscriptionRequiredDialog();
      return;
    }
    navigate("/explore");
  };

  // Fetch data when tab changes
  useEffect(() => {
    if (activeTab === "favorites") {
      fetchFavorites();
    } else {
      fetchUnlockedChats();
    }
  }, [activeTab]);

  // Render user card
  const renderUserCard = (userData, extraData = {}) => {
    if (!userData || !userData.id) {
      console.warn("renderUserCard called with invalid userData:", userData);
      return null;
    }
    const images = getAllImages(userData);
    const currentIdx = currentImageIndex[userData.id] || 0;

    return (
      <Card
        key={userData.id}
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
        onClick={handleNavigateToExplore}
      >
        {images.length > 0 ? (
          <Box
            sx={{
              position: "relative",
              width: "100%",
              height: 200,
              overflow: "hidden",
              bgcolor: "rgba(212, 175, 55, 0.1)",
            }}
          >
            {images.map((image, index) => {
              if (!image || image.trim() === "") return null;
              return (
                <Box
                  key={`${userData.id}-img-${index}`}
                  component="img"
                  src={image}
                  loading="lazy"
                  decoding="async"
                  fetchpriority="low"
                  alt={getDisplayName(userData, { fallback: "Member" })}
                  sx={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    opacity: currentIdx === index ? 1 : 0,
                    transition: "opacity 1.5s ease-in-out",
                    zIndex: currentIdx === index ? 1 : 0,
                  }}
                  onError={(e) => {
                    e.target.style.display = "none";
                  }}
                />
              );
            })}
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
            <Person sx={{ fontSize: 64, color: "#D4AF37", opacity: 0.3 }} />
          </Box>
        )}
        <CardContent sx={{ p: 2 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mb: 1,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 700,
                  color: "#1a1a1a",
                  fontSize: "0.9rem",
                }}
              >
                {getDisplayName(userData, { fallback: "Member" })}
              </Typography>
              {userData.isVerified && (
                <Verified sx={{ fontSize: 16, color: "#D4AF37" }} />
              )}
            </Box>
            {activeTab === "favorites" && extraData.favoriteId && (
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFavorite(extraData.favoriteId);
                }}
                sx={{
                  color: "#D4AF37",
                  "&:hover": {
                    bgcolor: "rgba(212, 175, 55, 0.1)",
                  },
                }}
              >
                <Delete sx={{ fontSize: 18 }} />
              </IconButton>
            )}
          </Box>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.5,
              mb: 0.5,
            }}
          >
            <LocationOn sx={{ fontSize: 12, color: "rgba(26, 26, 26, 0.6)" }} />
            <Typography
              variant="caption"
              sx={{ color: "rgba(26, 26, 26, 0.7)" }}
            >
              {userData.county || "N/A"}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 1 }}>
            <Cake sx={{ fontSize: 12, color: "rgba(26, 26, 26, 0.6)" }} />
            <Typography
              variant="caption"
              sx={{ color: "rgba(26, 26, 26, 0.7)" }}
            >
              {userData.age} years
            </Typography>
          </Box>
          {activeTab === "unlocked" && (
            <Button
              variant="contained"
              size="small"
              fullWidth
              startIcon={<WhatsApp />}
              onClick={(e) => {
                e.stopPropagation();
                openWhatsApp(userData.phone);
              }}
              sx={{
                background: "linear-gradient(135deg, #25D366, #128C7E)",
                color: "white",
                fontWeight: 600,
                textTransform: "none",
                borderRadius: "8px",
                mt: 1,
                "&:hover": {
                  background: "linear-gradient(135deg, #128C7E, #25D366)",
                },
              }}
            >
              Chat on WhatsApp
            </Button>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <Card
      sx={{
        p: 4,
        borderRadius: "16px",
        background:
          "linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(245, 230, 211, 0.2) 100%)",
        border: "1px solid rgba(212, 175, 55, 0.2)",
        boxShadow: "0 4px 20px rgba(212, 175, 55, 0.1)",
      }}
    >
      {showTabs && (
        <Box sx={{ mb: 3 }}>
          <Tabs
            value={activeTab}
            onChange={(e, newValue) => setActiveTab(newValue)}
            sx={{
              "& .MuiTab-root": {
                textTransform: "none",
                fontWeight: 600,
                color: "rgba(26, 26, 26, 0.6)",
                "&.Mui-selected": {
                  color: "#D4AF37",
                },
              },
              "& .MuiTabs-indicator": {
                backgroundColor: "#D4AF37",
              },
            }}
          >
            <Tab
              icon={<Favorite sx={{ fontSize: 20 }} />}
              iconPosition="start"
              label="Favorites"
              value="favorites"
            />
            <Tab
              icon={<Chat sx={{ fontSize: 20 }} />}
              iconPosition="start"
              label="Unlocked Chats"
              value="unlocked"
            />
          </Tabs>
        </Box>
      )}

      {activeTab === "favorites" && (
        <>
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
              <Favorite sx={{ color: "#D4AF37" }} />
              My Favorites ({favorites.length})
            </Typography>
          </Box>
          {loadingFavorites ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress sx={{ color: "#D4AF37" }} />
            </Box>
          ) : favorites.length > 0 ? (
            <Box
              sx={{
                display: "flex",
                gap: 2,
                flexDirection: { xs: "column", sm: "row" },
                flexWrap: "wrap",
              }}
            >
              {favorites
                .filter(
                  (favorite) =>
                    favorite &&
                    favorite.favouritedUser &&
                    favorite.favouritedUser.id
                )
                .map((favorite) =>
                  renderUserCard(favorite.favouritedUser, {
                    favoriteId: favorite.id,
                  })
                )
                .filter(Boolean)}
            </Box>
          ) : (
            <Box sx={{ textAlign: "center", py: 4, px: 2 }}>
              <FavoriteBorder
                sx={{ fontSize: 64, color: "#D4AF37", opacity: 0.3, mb: 2 }}
              />
              <Typography variant="h6" sx={{ color: "#666", mb: 1 }}>
                No favorites yet
              </Typography>
              <Typography variant="body2" sx={{ color: "#999", mb: 3 }}>
                Start favoriting users to see them here!
              </Typography>
              <Button
                variant="contained"
                onClick={handleNavigateToExplore}
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
                Explore Users
              </Button>
            </Box>
          )}
        </>
      )}

      {activeTab === "unlocked" && (
        <>
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
              <Chat sx={{ color: "#D4AF37" }} />
              Unlocked Chats ({unlockedChats.length})
            </Typography>
          </Box>
          {loadingUnlocked ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress sx={{ color: "#D4AF37" }} />
            </Box>
          ) : unlockedChats.length > 0 ? (
            <Box
              sx={{
                display: "flex",
                gap: 2,
                flexDirection: { xs: "column", sm: "row" },
                flexWrap: "wrap",
              }}
            >
              {unlockedChats
                .filter((unlock) => unlock && unlock.target && unlock.target.id)
                .map((unlock) =>
                  renderUserCard(unlock.target, {
                    unlockDate: unlock.createdAt,
                    tokenCost: unlock.token_cost,
                  })
                )
                .filter(Boolean)}
            </Box>
          ) : (
            <Box sx={{ textAlign: "center", py: 4, px: 2 }}>
              <Chat
                sx={{ fontSize: 64, color: "#D4AF37", opacity: 0.3, mb: 2 }}
              />
              <Typography variant="h6" sx={{ color: "#666", mb: 1 }}>
                No unlocked chats yet
              </Typography>
              <Typography variant="body2" sx={{ color: "#999", mb: 3 }}>
                Unlock chats with users to start conversations!
              </Typography>
              <Button
                variant="contained"
                onClick={handleNavigateToExplore}
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
                Explore Users
              </Button>
            </Box>
          )}
        </>
      )}
    </Card>
  );
}
